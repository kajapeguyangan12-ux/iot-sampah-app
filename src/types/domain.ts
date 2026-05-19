export type UserRole = "admin" | "petugas" | "tamu";

export type BinStatus = "kosong" | "setengah" | "penuh";

export type AppUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  area: string;
};

export type WasteBin = {
  id: string;
  code: string;
  locationName: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  deviceId: string;
  realtimeKey?: string;
  status: BinStatus;
  fillPercent: number;
  lastUpdate: string;
  note: string;
};

export type SensorLog = {
  id: string;
  binId: string;
  deviceId: string;
  status: BinStatus;
  fillPercent: number;
  recordedAt: string;
};

export type PublicReportStatus = "baru" | "diproses" | "selesai";

export type PublicReport = {
  id: string;
  reporterName: string | null;
  phone: string | null;
  binId: string | null;
  locationName: string;
  details: string;
  source: string;
  status: PublicReportStatus;
  submittedAt: string;
};
