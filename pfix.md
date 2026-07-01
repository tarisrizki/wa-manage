# Task: Perbaikan hasil review — repo wa-manage

Konteks: file-file di bawah ini SUDAH ADA di repo (`docker-compose.yml`, `middleware/`, `dashboard-app/`, dll — sesuai arsitektur di `p.md`). ini BUKAN tugas bikin dari nol, tapi memperbaiki kode yang sudah pernah digenerate. Perbaiki persis sesuai poin di bawah, satu per satu. Jangan mendesain ulang bagian yang tidak disebut di sini.

## 1. Worker BullMQ tidak pernah jalan (prioritas tertinggi)
`docker-compose.yml` cuma punya 1 service `middleware` yang menjalankan `npm start` (isinya `index.ts`, server API doang). `middleware/src/worker.ts` sudah lengkap isinya tapi tidak pernah dieksekusi di service manapun — job masuk antrian BullMQ tapi tidak ada yang memprosesnya.
**Fix**: tambah service baru `middleware_worker` di `docker-compose.yml` — pakai build context yang sama (`./middleware`), tapi override command supaya menjalankan worker (`npm run start:worker` atau `node dist/worker.js`), dengan environment variable Redis yang sama seperti service `middleware`.

## 2. Field path webhook di worker.ts belum diverifikasi
Baris berikut di `worker.ts` ditulis sebagai fakta padahal belum ada sumber yang mengonfirmasi bentuk payload asli dari Chatwoot `send_webhook_event`:
```
payload.conversation?.meta?.sender?.name?.includes('(GROUP)')
payload.content
payload.inbox?.id
```
**Fix**: JANGAN ganti dengan tebakan field path lain. Sebagai gantinya: (a) tambahkan `console.log(JSON.stringify(job.data, null, 2))` di awal processor supaya struktur payload asli terlihat begitu ada event nyata masuk, (b) tambahkan komentar eksplisit "ASUMSI, BELUM DIVERIFIKASI — cross-check setelah lihat payload asli" tepat di atas baris yang memakai field path ini, (c) jangan hapus optional chaining yang sudah ada — itu sudah benar, mencegah crash kalau field-nya ternyata tidak ada.

## 3. Semua service expose port langsung ke host
Hapus baris `ports:` dari service: `postgres`, `redis`, `evolution_api`, `middleware`, `middleware_worker`, `dashboard_app`, `chatwoot_web`, `chatwoot_worker`. Hanya service `nginx` yang boleh punya `ports: - '80:80'`. Service lain tetap saling terhubung otomatis lewat nama service di jaringan internal Docker Compose tanpa perlu port mapping ke host.

## 4. Redis tanpa password
Tambahkan `REDIS_PASSWORD` ke `.env.example`. Ubah command Redis jadi menyertakan `--requirepass ${REDIS_PASSWORD}`. Update semua koneksi ke Redis (Chatwoot `REDIS_URL`, middleware & middleware_worker via `ioredis`) supaya menyertakan password ini.

## 5. Pemisahan database — verifikasi dulu sebelum lanjut pakai pendekatan schema
Saat ini pakai 1 database dengan `?schema=evolution` di connection string Evolution API.
**Fix**: cek source code resmi `evolution-foundation/evolution-api` — apakah parameter `?schema=` di `DATABASE_CONNECTION_URI` benar-benar diteruskan apa adanya ke Prisma (Evolution API pakai Prisma, dan Prisma memang mendukung parameter ini secara native, tapi harus dipastikan tidak di-override oleh kode Evolution API sendiri). Kalau tidak bisa dipastikan dari source: default ke pendekatan yang pasti aman, yaitu 2 database fisik terpisah (`chatwoot` dan `evolution`), dibuat lewat init script di `/docker-entrypoint-initdb.d/` pada service `postgres` yang menjalankan `CREATE DATABASE evolution;` saat container pertama kali start.

## 6. Rapikan konfigurasi image Postgres
Service `postgres` punya 2 baris `image:` berbeda (sisa proses coba-coba, plus komentar yang saling bertentangan). `postgres:18-alpine` sudah dikonfirmasi ada sebagai official image di Docker Hub — hapus baris `image:` yang lama beserta komentarnya, sisakan satu baris bersih.

## 7. Versi types tidak sinkron dengan runtime
`middleware/package.json` → ganti `"@types/node": "^22.0.0"` menjadi `"@types/node": "^24.0.0"` supaya konsisten dengan runtime Node 24 LTS yang sudah benar dipakai di kedua Dockerfile.

## Setelah selesai
Tunjukkan isi final tiap file yang diubah secara lengkap, jangan hanya menyatakan "sudah diperbaiki" — supaya bisa direview ulang sebelum dijalankan.