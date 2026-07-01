import React, { useEffect, useState } from 'react';

function App() {
  const [chatwootContext, setChatwootContext] = useState<any>(null);

  useEffect(() => {
    // Chatwoot akan mengirimkan pesan melalui window.postMessage ke iframe Dashboard App
    const handleMessage = (event: MessageEvent) => {
      // Pastikan event ini berasal dari domain yang benar jika di production
      // if (event.origin !== 'YOUR_CHATWOOT_DOMAIN') return;
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.event) {
          setChatwootContext(data);
          console.log('Received data from Chatwoot:', data);
        }
      } catch (e) {
        console.error('Error parsing Chatwoot message:', e);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>WhatsApp Dashboard App Panel</h1>
      <p>Panel kustom ini berjalan di dalam Chatwoot melalui Dashboard Apps.</p>
      
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Context Data dari Chatwoot</h2>
        {chatwootContext ? (
          <pre style={{ background: '#f5f5f5', padding: '10px', overflowX: 'auto' }}>
            {JSON.stringify(chatwootContext, null, 2)}
          </pre>
        ) : (
          <p>Menunggu data dari Chatwoot... Pastikan panel ini dibuka di dalam iframe Chatwoot.</p>
        )}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Fungsi Kustom (Placeholder)</h3>
        <button onClick={() => alert('Fitur Notifikasi Kustom akan diimplementasikan di sini')}>
          Kelola Filter Notifikasi
        </button>
      </div>
    </div>
  );
}

export default App;
