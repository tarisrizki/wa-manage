import { BrowserWindow } from 'electron';
import { checkNumberOnWhatsApp } from './whatsapp-manager';

let scraperWindow: BrowserWindow | null = null;

export function startGmapsScraper(mainWindow: BrowserWindow, accountId: string, query: string, locationFilter: string = '') {
  if (scraperWindow) {
    scraperWindow.close();
    scraperWindow = null;
  }

  // Buka jendela Chrome rahasia
  scraperWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false, // JANGAN TAMPILKAN KE USER
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Pasang listener console-message untuk menangkap data dari halaman Google Maps
  scraperWindow.webContents.on('console-message', async (event, level, message) => {
    if (message.startsWith('GMAPS_DATA:')) {
      try {
        const dataStr = message.substring('GMAPS_DATA:'.length);
        const data = JSON.parse(dataStr);
        data.hasWa = await checkNumberOnWhatsApp(accountId, data.phone);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('gmaps-scraper-result', data);
        }
      } catch (e) {
        console.error('Gagal parse GMAPS_DATA', e);
      }
    } else if (message.startsWith('GMAPS_STATUS:')) {
      const statusStr = message.substring('GMAPS_STATUS:'.length);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('gmaps-scraper-status', statusStr);
      }
    } else if (message === 'GMAPS_END') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('gmaps-scraper-end');
      }
      stopGmapsScraper();
    }
  });

  const targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  
  scraperWindow.loadURL(targetUrl);

  scraperWindow.webContents.on('did-finish-load', () => {
    // Inject Script Auto-Scroller & Regex Extractor
    const injectCode = `
      (async () => {
        const locationFilter = ${JSON.stringify(locationFilter.toLowerCase())};
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        console.log('GMAPS_STATUS:Memuat halaman...');
        await wait(3000);
        
        console.log('GMAPS_STATUS:Mencari elemen daftar hasil...');
        
        let feedContainer = null;
        for(let i=0; i<15; i++) {
          let articles = document.querySelectorAll('div[role="article"], a[href*="/maps/place/"]');
          if (articles.length > 0) {
             let el = articles[0];
             while(el && el !== document.body) {
                if (el.scrollHeight > el.clientHeight && el.clientHeight > 200) {
                   const style = window.getComputedStyle(el);
                   if (style.overflowY === 'auto' || style.overflowY === 'scroll' || el.getAttribute('role') === 'feed' || el.getAttribute('role') === 'main') {
                       feedContainer = el;
                       break;
                   }
                }
                el = el.parentElement;
             }
             if (!feedContainer) feedContainer = document.body; // fallback
             break;
          } else {
             let singlePhoneBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
             if (singlePhoneBtn) {
                feedContainer = "SINGLE";
                break;
             }
          }
          await wait(1000);
        }
        
        if (!feedContainer) {
          console.log('GMAPS_STATUS:Gagal menemukan daftar hasil atau telepon. Pastikan internet stabil.');
          console.log('GMAPS_END');
          return;
        }

        if (feedContainer === "SINGLE") {
          console.log('GMAPS_STATUS:Ditemukan 1 hasil spesifik...');
          let singlePhoneBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
          let h1 = document.querySelector('h1');
          let name = h1 ? h1.innerText : 'Unknown';
          let phoneText = singlePhoneBtn ? singlePhoneBtn.getAttribute('data-item-id').replace('phone:tel:', '') : '';
          let phoneMatch = phoneText.match(/(?:\\+62|62|0)[1-9][0-9 \\(\\)\\-]{6,13}/);
          let phone = phoneMatch ? phoneMatch[0].replace(/[^0-9]/g, '') : null;
          if (phone) {
             if (phone.startsWith('0')) phone = '62' + phone.slice(1);
             console.log('GMAPS_DATA:' + JSON.stringify({ name, phone }));
          }
          console.log('GMAPS_END');
          return;
        }
        
        console.log('GMAPS_STATUS:Mulai melakukan ekstraksi...');
        let extracted = new Set();
        let unchangedCount = 0;
        
        for (let i = 0; i < 60; i++) { // Max 60 scrolls
          let processedCount = 0;
          let newFound = true;
          
          let links = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/maps/place/'));
          let newLinks = [];
          for (let link of links) {
              let name = link.getAttribute('aria-label');
              if (name && !extracted.has(name)) {
                  newLinks.push({ name, href: link.href });
                  extracted.add(name);
              }
          }
          
          if (newLinks.length > 0) {
              processedCount += newLinks.length;
              
              // Proses paralel menggunakan iframe tersembunyi (batch of 8)
              for (let b = 0; b < newLinks.length; b += 8) {
                  let batch = newLinks.slice(b, b + 8);
                  let promises = batch.map(item => {
                      console.log('GMAPS_STATUS:Memeriksa: ' + item.name + '...');
                      
                      return new Promise(resolve => {
                          let iframe = document.createElement('iframe');
                          iframe.style.position = 'fixed';
                          iframe.style.top = '-9999px'; // Sembunyikan dari layar
                          iframe.src = item.href;
                          let resolved = false;
                          
                          let timeout = setTimeout(() => {
                              if (!resolved) { resolved = true; iframe.remove(); resolve(null); }
                          }, 3000); // Max 3 detik per batch
                          
                          iframe.onload = async () => {
                              try {
                                  let phoneBtn = null;
                                  for (let w = 0; w < 15; w++) {
                                      await wait(150);
                                      if (resolved) return;
                                      phoneBtn = iframe.contentDocument.querySelector('button[data-item-id^="phone:tel:"]');
                                      if (phoneBtn) break;
                                      let h1 = iframe.contentDocument.querySelector('h1');
                                      if (h1 && w > 8) break; // Jika profil sudah dimuat tapi tak ada telepon
                                  }
                                  if (!resolved) {
                                      resolved = true;
                                      clearTimeout(timeout);
                                      let phone = null;
                                      if (phoneBtn) {
                                          let p = phoneBtn.getAttribute('data-item-id').replace('phone:tel:', '');
                                          let m = p.match(/(?:\\+62|62|0)[1-9][0-9 \\(\\)\\-]{6,13}/);
                                          if (m) phone = m[0].replace(/[^0-9]/g, '');
                                      }
                                      
                                      let address = '';
                                      let addressBtn = iframe.contentDocument.querySelector('button[data-item-id="address"]');
                                      if (addressBtn) {
                                          address = addressBtn.getAttribute('aria-label') || '';
                                          address = address.replace(/^Alamat: /, '');
                                      }
                                      
                                      iframe.remove();
                                      resolve({ name: item.name, phone, address });
                                  }
                              } catch(e) {
                                  if (!resolved) { resolved = true; clearTimeout(timeout); iframe.remove(); resolve(null); }
                              }
                          };
                          document.body.appendChild(iframe);
                      });
                  });
                  
                  let results = await Promise.all(promises);
                  for (let res of results) {
                      if (res && res.phone && res.phone.length >= 9) {
                          if (locationFilter) {
                              const matchName = res.name.toLowerCase().includes(locationFilter);
                              const matchAddr = res.address && res.address.toLowerCase().includes(locationFilter);
                              if (!matchName && !matchAddr) {
                                  continue; // Skip if it doesn't match the location filter
                              }
                          }
                          if (res.phone.startsWith('0')) res.phone = '62' + res.phone.slice(1);
                          console.log('GMAPS_DATA:' + JSON.stringify(res));
                      }
                  }
              }
          }
          
          if (processedCount === 0) {
            unchangedCount++;
            if (unchangedCount >= 3) break;
          } else {
            unchangedCount = 0;
          }
          
          // Lakukan scroll pada container feed
          let scrolled = false;
          let containers = document.querySelectorAll('div');
          for (let c of containers) {
             if (c.scrollHeight > c.clientHeight && c.clientHeight > 200) {
                 const style = window.getComputedStyle(c);
                 if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay' || c.getAttribute('role') === 'feed' || c.getAttribute('role') === 'main') {
                     c.scrollBy(0, 3000);
                     c.scrollTop = c.scrollHeight;
                     scrolled = true;
                 }
             }
          }
          
          if (!scrolled) {
             let currentArticles = Array.from(document.querySelectorAll('div[role="article"]'));
             if (currentArticles.length === 0) {
                let links = Array.from(document.querySelectorAll('a')).filter(a => a.href.includes('/maps/place/'));
                currentArticles = links.map(l => l.parentElement?.parentElement).filter(Boolean);
             }
             if (currentArticles.length > 0) {
                currentArticles[currentArticles.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
             }
          }
          
          await wait(1500); // Tunggu loading hasil baru
        }
        
        console.log('GMAPS_STATUS:Selesai memeriksa daftar pencarian.');
        console.log('GMAPS_END');
      })();
    `;
    
    if (scraperWindow && !scraperWindow.isDestroyed()) {
      scraperWindow.webContents.executeJavaScript(injectCode).catch(e => {
        console.error('Gagal mengeksekusi script gmaps', e);
      });
    }
  });
}

export function stopGmapsScraper() {
  if (scraperWindow) {
    if (!scraperWindow.isDestroyed()) {
      scraperWindow.close();
    }
    scraperWindow = null;
  }
}
