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
- `/api/iot/update` endpoint utama penerimaan payload dari ESP32/sensor

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
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

`NEXT_PUBLIC_FIREBASE_DATABASE_URL` wajib diisi jika dashboard akan membaca sensor langsung dari Firebase Realtime Database.

`FIREBASE_ADMIN_*` wajib diisi untuk endpoint server yang menulis ke Firestore.

## Alur Data Sensor

Alur yang disarankan:

1. ESP32 membaca sensor tong.
2. ESP32 menghitung `fillPercent`.
3. ESP32 menulis nilai sensor ke Firebase Realtime Database.
4. Dashboard admin dan petugas membaca RTDB untuk update langsung jika diizinkan rules.
5. Endpoint `POST /api/iot/sync-rtdb` bisa dipakai untuk menyalin snapshot RTDB terbaru ke Firestore.
6. Koleksi `bins` di Firestore tetap dipakai untuk metadata lokasi, device, koordinat peta, dan fallback data terakhir.

## Contoh Payload IoT

Kirim `POST` ke `/api/iot/update`:

```json
{
  "deviceId": "IOT-WS-001",
  "fillPercent": 92,
  "recordedAt": "2026-05-12T08:20:00+07:00"
}
```

Field `status` boleh tidak dikirim. Server akan menghitung otomatis dari `fillPercent`.

## Contoh Kode ESP32

Berikut contoh sederhana ESP32 yang membaca sensor ultrasonik lalu mengirim data langsung ke endpoint:

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* ssid = "NAMA_WIFI";
const char* password = "PASSWORD_WIFI";
const char* apiUrl = "https://iot-sampah-app.vercel.app/api/iot/update";
const char* deviceId = "IOT-WS-001";

constexpr int trigPin = 5;
constexpr int echoPin = 18;
constexpr float binHeightCm = 40.0;

float readDistanceCm() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);
  if (duration == 0) {
    return -1;
  }

  return duration * 0.0343 / 2.0;
}

int calculateFillPercent(float distanceCm) {
  if (distanceCm < 0) {
    return -1;
  }

  float clamped = distanceCm;
  if (clamped > binHeightCm) clamped = binHeightCm;
  if (clamped < 0) clamped = 0;

  int fillPercent = (int)(((binHeightCm - clamped) / binHeightCm) * 100.0);
  if (fillPercent < 0) fillPercent = 0;
  if (fillPercent > 100) fillPercent = 100;
  return fillPercent;
}

void sendToServer(int fillPercent) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, apiUrl)) {
    return;
  }

  http.addHeader("Content-Type", "application/json");

  String body = "{";
  body += "\"deviceId\":\"" + String(deviceId) + "\",";
  body += "\"fillPercent\":" + String(fillPercent);
  body += "}";

  int httpCode = http.POST(body);
  Serial.print("HTTP code: ");
  Serial.println(httpCode);
  Serial.println(http.getString());
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
}

void loop() {
  float distanceCm = readDistanceCm();
  int fillPercent = calculateFillPercent(distanceCm);

  if (fillPercent >= 0) {
    sendToServer(fillPercent);
  }

  delay(10000);
}
```

## Cara Tes

1. Pastikan Vercel sudah memakai env Firebase Admin.
2. Buka endpoint berikut untuk tes manual:
   `https://iot-sampah-app.vercel.app/api/iot/update`
3. Kirim `POST` dari Postman, curl, atau ESP32.
4. Cek perubahan pada koleksi `bins` dan `sensor_logs` di Firestore.
