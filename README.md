# Sistem IoT Sampah

MVP aplikasi `Next.js` untuk monitoring tong sampah berbasis IoT dengan dua role:

- `admin`: dashboard, kelola pengguna, kelola tong sampah, device IoT, dan peta persebaran.
- `petugas`: peta tong sampah, status tong, dan tombol arah ke lokasi.

## Stack

- `Next.js 16`
- `TypeScript`
- `Firebase` untuk integrasi auth/database tahap berikutnya
- `Leaflet + React Leaflet` untuk peta

## Halaman

- `/` landing page sistem
- `/login` login demo per-role
- `/admin` dashboard admin
- `/petugas` tampilan petugas lapangan
- `/api/iot/update` endpoint contoh penerimaan payload IoT

## Menjalankan

```bash
npm install
npm run dev
```

## Konfigurasi Firebase

Salin `.env.example` menjadi `.env.local`, lalu isi:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Saat env belum diisi, aplikasi tetap jalan memakai data demo lokal.

## Contoh Payload IoT

Kirim `POST` ke `/api/iot/update`:

```json
{
  "deviceId": "IOT-WS-001",
  "status": "penuh",
  "fillPercent": 92,
  "recordedAt": "2026-05-12T08:20:00+07:00"
}
```
