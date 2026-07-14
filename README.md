# WA Manage Desktop

*(English and Indonesian Documentation | Dokumentasi Bahasa Inggris dan Indonesia)*

---

## 🇬🇧 English

### Overview
**WA Manage Desktop** is a desktop application designed to manage multiple WhatsApp accounts in one dashboard. It allows you to connect multiple numbers, separate group chats from personal chats, run automated broadcast campaigns, and scrape public leads from Google Maps.

> **Storage**: This application uses Node.js' built-in `node:sqlite` as its local storage layer to avoid native-module build issues in Electron. It runs locally and requires no external dependencies.

### Features
- **Multi-Account Support:** Connect and manage multiple WhatsApp numbers.
- **Google Maps Data Scraper:** Search and extract business names and WhatsApp numbers from an embedded Google Maps UI.
- **Auto-Join Groups:** Automatically join WhatsApp groups using an uploaded CSV/Excel file containing Group Invite Links.
- **Group Broadcast:** Broadcast text and images to groups or private contacts using CSV import.
- **Basic Anti-Ban Measures:** Includes randomized send delays, automatic batching (cooldowns), and optional zero-width character injection (spintax) to help keep messages unique.
- **Chat Segregation:** Separates Group chats from Personal chats for easier navigation.
- **Auto-Reply Rule Engine:** Set up keyword-based notification rules per account to get notified for specific messages.
- **Local Database:** Stores message history locally using native `node:sqlite`.

### Tech Stack
- **Electron** (Desktop Framework)
- **React + Vite** (Frontend)
- **Tailwind CSS + Shadcn UI** (Styling)
- **SQLite / `node:sqlite`** (Database)
- **Baileys** (WhatsApp Web API)

### Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run in development mode:
   ```bash
   npm run dev
   ```
3. Build for production (Generates `.exe` for Windows, `.dmg` for Mac):
   ```bash
   npm run build
   npm run dist
   ```

---

## 🇮🇩 Indonesia

### Gambaran Umum
**WA Manage Desktop** adalah aplikasi desktop yang dirancang untuk mengelola banyak akun WhatsApp dalam satu *dashboard*. Aplikasi ini memungkinkan Anda untuk menghubungkan banyak nomor WA, memisahkan obrolan grup dengan personal, menjalankan kampanye *broadcast* otomatis, dan mengekstrak data kontak publik dari Google Maps.

> **Catatan Database**: Aplikasi ini menggunakan modul bawaan `node:sqlite` sebagai *database* lokal untuk menghindari masalah kompilasi modul pihak ketiga di Electron. Penyimpanan ini berjalan secara lokal dan ringan.

### Fitur Utama
- **Dukungan Multi-Akun:** Hubungkan dan kelola beberapa nomor WhatsApp secara bersamaan.
- **Pengekstrak Data Google Maps:** Cari dan kumpulkan nama bisnis beserta nomor WhatsApp langsung dari antarmuka peta yang terintegrasi.
- **Gabung Grup Otomatis (Auto-Join):** Bergabung ke grup WhatsApp secara otomatis dengan mengunggah file CSV/Excel berisi *link* undangan grup.
- **Siaran Massal (Broadcast):** Kirim pesan teks dan gambar ke grup atau kontak pribadi (melalui import CSV/Excel).
- **Pengaturan Keamanan Dasar (Anti-Ban):** Dilengkapi jeda pengiriman acak, istirahat otomatis (*batching*), dan opsi *spintax* (menyisipkan karakter kosong) agar pesan bervariasi.
- **Pemisah Obrolan:** Memisahkan obrolan Grup dan Personal untuk antarmuka yang lebih rapi.
- **Aturan Balas Otomatis (Rule Engine):** Atur notifikasi berdasarkan kata kunci tertentu untuk setiap akun.
- **Database Lokal:** Menyimpan riwayat pesan di PC Anda sendiri menggunakan `node:sqlite`.

### Teknologi yang Digunakan
- **Electron** (Framework Desktop)
- **React + Vite** (Antarmuka/Frontend)
- **Tailwind CSS + Shadcn UI** (Desain UI)
- **SQLite / `node:sqlite`** (Database)
- **Baileys** (WhatsApp Web API)

### Cara Menggunakan

1. Install dependensi (paket):
   ```bash
   npm install
   ```
2. Jalankan dalam mode pengembangan (*developer*):
   ```bash
   npm run dev
   ```
3. Bangun aplikasi (*Build*) untuk diproduksi (Menghasilkan file `.exe` untuk PC Windows):
   ```bash
   npm run build
   npm run dist
   ```

### Pengaturan & Koneksi Pertama Kali
Saat aplikasi dibuka, sistem akan menampilkan *QR Code* untuk setiap akun. Pindai kode tersebut menggunakan menu "Perangkat Tertaut" (*Linked Devices*) di WhatsApp HP Anda. Sesi akan tersimpan otomatis secara lokal.
