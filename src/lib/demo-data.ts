import type { AppUser, BinStatus, SensorLog, WasteBin } from "@/types/domain";

export const appUsers: AppUser[] = [
  {
    id: "usr-admin-01",
    name: "Rina Admin",
    username: "rinaadmin",
    email: "admin@iot-sampah.local",
    role: "admin",
    area: "Kota Inti",
  },
  {
    id: "usr-officer-01",
    name: "Bayu Petugas",
    username: "bayupetugas",
    email: "petugas@iot-sampah.local",
    role: "petugas",
    area: "Zona Barat",
  },
  {
    id: "usr-officer-02",
    name: "Sinta Petugas",
    username: "sintapetugas",
    email: "lapangan@iot-sampah.local",
    role: "petugas",
    area: "Zona Timur",
  },
];

export const wasteBins: WasteBin[] = [
  {
    id: "bin-001",
    code: "TNG-001",
    locationName: "Taman Kota Barat",
    address: "Jl. Anggrek No. 2",
    area: "Zona Barat",
    lat: -6.1732,
    lng: 106.8271,
    deviceId: "IOT-WS-001",
    status: "penuh",
    fillPercent: 92,
    lastUpdate: "2026-05-12T08:20:00+07:00",
    note: "Perlu pengangkutan secepatnya sebelum jam sore.",
  },
  {
    id: "bin-002",
    code: "TNG-002",
    locationName: "Pasar Induk Selatan",
    address: "Jl. Pasar Raya Blok B",
    area: "Zona Selatan",
    lat: -6.2145,
    lng: 106.8451,
    deviceId: "IOT-WS-002",
    status: "setengah",
    fillPercent: 58,
    lastUpdate: "2026-05-12T08:10:00+07:00",
    note: "Pantau kepadatan saat jam ramai pasar.",
  },
  {
    id: "bin-003",
    code: "TNG-003",
    locationName: "Halte Timur Central",
    address: "Jl. Merdeka Timur",
    area: "Zona Timur",
    lat: -6.1863,
    lng: 106.8424,
    deviceId: "IOT-WS-003",
    status: "kosong",
    fillPercent: 18,
    lastUpdate: "2026-05-12T07:55:00+07:00",
    note: "Kondisi aman dan baru dikosongkan pagi tadi.",
  },
  {
    id: "bin-004",
    code: "TNG-004",
    locationName: "Kampus Negeri 1",
    address: "Jl. Pendidikan Utama",
    area: "Zona Utara",
    lat: -6.1678,
    lng: 106.8549,
    deviceId: "IOT-WS-004",
    status: "setengah",
    fillPercent: 49,
    lastUpdate: "2026-05-12T08:02:00+07:00",
    note: "Volume naik saat pergantian jam kuliah.",
  },
];

export const sensorLogs: SensorLog[] = [
  {
    id: "log-001",
    binId: "bin-001",
    deviceId: "IOT-WS-001",
    status: "penuh",
    fillPercent: 92,
    recordedAt: "2026-05-12T08:20:00+07:00",
  },
  {
    id: "log-002",
    binId: "bin-002",
    deviceId: "IOT-WS-002",
    status: "setengah",
    fillPercent: 58,
    recordedAt: "2026-05-12T08:10:00+07:00",
  },
  {
    id: "log-003",
    binId: "bin-003",
    deviceId: "IOT-WS-003",
    status: "kosong",
    fillPercent: 18,
    recordedAt: "2026-05-12T07:55:00+07:00",
  },
];

export const statusOrder: BinStatus[] = ["penuh", "setengah", "kosong"];

export function getStatusTone(status: BinStatus) {
  switch (status) {
    case "penuh":
      return "bg-danger/15 text-danger border-danger/30";
    case "setengah":
      return "bg-warning/20 text-brand-strong border-warning/30";
    default:
      return "bg-brand/15 text-brand border-brand/20";
  }
}
