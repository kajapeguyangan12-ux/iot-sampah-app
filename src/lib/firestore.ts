"use client";

import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { get, onValue, ref, type Unsubscribe } from "firebase/database";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  firebaseDb,
  firebaseRealtimeDb,
  getNamedFirestore,
  getSecondaryAuth,
  isRealtimeDatabaseConfigured,
} from "@/lib/firebase";
import { deriveBinStatusFromFillPercent } from "@/lib/bin-status";
import type {
  AppUser,
  BinStatus,
  PublicReport,
  PublicReportStatus,
  SensorLog,
  WasteBin,
} from "@/types/domain";

type BinInput = Omit<WasteBin, "id" | "lastUpdate">;
type ManagedUserInput = {
  name: string;
  username: string;
  email: string;
  password: string;
  area: string;
  role: AppUser["role"];
};
type WasteBinRecord = WasteBin & {
  realtimeKey?: string;
};
type RealtimeBinReading = {
  key: string;
  fillPercent: number;
  status: BinStatus;
  recordedAt: string;
};

function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/\s+/g, "");
}

function createFallbackUsername(user: Pick<AppUser, "name" | "email" | "id">) {
  const raw = user.email.split("@")[0] || user.name || user.id;
  return normalizeUsername(raw.replace(/[^a-zA-Z0-9._-]/g, ""));
}

function requireDb() {
  if (!firebaseDb) {
    throw new Error("Firebase Firestore belum dikonfigurasi.");
  }

  return firebaseDb;
}

function requireRealtimeDb() {
  if (!firebaseRealtimeDb || !isRealtimeDatabaseConfigured) {
    throw new Error("Firebase Realtime Database belum dikonfigurasi.");
  }

  return firebaseRealtimeDb;
}

function requireNamedDb(appName: string) {
  const db = getNamedFirestore(appName);

  if (!db) {
    throw new Error("Firebase Firestore belum dikonfigurasi.");
  }

  return db;
}

function normalizeLookupKey(value: string | undefined | null) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}

function clampFillPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeStatus(rawStatus: unknown, fillPercent: number): BinStatus {
  const derivedStatus = deriveBinStatusFromFillPercent(fillPercent);

  if (typeof rawStatus === "string") {
    const normalized = rawStatus.trim().toLowerCase();

    if (
      normalized.includes("aman") ||
      normalized.includes("belum penuh") ||
      normalized.includes("tidak penuh") ||
      normalized.includes("kosong") ||
      normalized.includes("empty")
    ) {
      return derivedStatus;
    }

    if (
      normalized.includes("sedang") ||
      normalized.includes("setengah") ||
      normalized.includes("waspada") ||
      normalized.includes("warning") ||
      normalized.includes("hampir")
    ) {
      return derivedStatus;
    }

    if (
      normalized.includes("penuh") ||
      normalized.includes("full") ||
      normalized.includes("bahaya")
    ) {
      return derivedStatus;
    }
  }

  return derivedStatus;
}

function normalizeTimestamp(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(milliseconds).toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function parseRealtimeBinReading(
  key: string,
  value: unknown,
): RealtimeBinReading | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const parsedFillPercent =
    parseNumericValue(record.persentase) ??
    parseNumericValue(record.fillPercent) ??
    parseNumericValue(record.percentage) ??
    parseNumericValue(record.nilai) ??
    parseNumericValue(record.value);

  const fallbackFillPercent =
    typeof record.status === "string" && record.status.toLowerCase().includes("penuh")
      ? 100
      : typeof record.status === "string" &&
          (record.status.toLowerCase().includes("sedang") ||
            record.status.toLowerCase().includes("setengah") ||
            record.status.toLowerCase().includes("waspada"))
        ? 50
        : 0;
  const fillPercent = clampFillPercent(parsedFillPercent ?? fallbackFillPercent);

  return {
    key,
    fillPercent,
    status: normalizeStatus(record.status, fillPercent),
    recordedAt: normalizeTimestamp(
      record.recordedAt ?? record.lastUpdate ?? record.updatedAt ?? record.timestamp,
    ),
  };
}

function parseRealtimeBinReadings(value: unknown) {
  if (!value || typeof value !== "object") {
    return [] as RealtimeBinReading[];
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => parseRealtimeBinReading(key, item))
    .filter((item): item is RealtimeBinReading => item !== null);
}

function createBinLookupKeys(bin: Partial<WasteBinRecord>) {
  return [
    bin.realtimeKey,
    bin.deviceId,
    bin.code,
    bin.id,
    bin.locationName,
  ]
    .map((item) => normalizeLookupKey(item))
    .filter(Boolean);
}

function createFallbackBin(reading: RealtimeBinReading): WasteBin {
  const title = reading.key
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    id: reading.key,
    code: reading.key.toUpperCase(),
    locationName: title || reading.key,
    address: "Lokasi belum diatur di koleksi bins.",
    area: "Belum dipetakan",
    lat: Number.NaN,
    lng: Number.NaN,
    deviceId: reading.key,
    status: reading.status,
    fillPercent: reading.fillPercent,
    lastUpdate: reading.recordedAt,
    note: "Data sensor aktif di Realtime Database, tetapi metadata lokasi belum lengkap.",
  };
}

function mergeBinsWithRealtimeReadings(
  bins: WasteBinRecord[],
  readings: RealtimeBinReading[],
): WasteBin[] {
  const readingMap = new Map(
    readings.map((reading) => [normalizeLookupKey(reading.key), reading]),
  );
  const consumedKeys = new Set<string>();

  const mergedBins = bins.map((bin) => {
    const match = createBinLookupKeys(bin)
      .map((candidate) => readingMap.get(candidate))
      .find(Boolean);

    if (match) {
      consumedKeys.add(normalizeLookupKey(match.key));
    }

    const fillPercent = match?.fillPercent ?? bin.fillPercent;

    return {
      ...bin,
      deviceId: match?.key ?? bin.deviceId,
      status: deriveBinStatusFromFillPercent(fillPercent),
      fillPercent,
      lastUpdate: match?.recordedAt ?? bin.lastUpdate,
    };
  });

  const fallbackBins = readings
    .filter((reading) => !consumedKeys.has(normalizeLookupKey(reading.key)))
    .map((reading) => createFallbackBin(reading));

  return [...mergedBins, ...fallbackBins].sort((left, right) => {
    const lastUpdateDiff =
      new Date(right.lastUpdate).getTime() - new Date(left.lastUpdate).getTime();

    if (lastUpdateDiff !== 0) {
      return lastUpdateDiff;
    }

    return right.fillPercent - left.fillPercent;
  });
}

async function getBinMetadata(): Promise<WasteBinRecord[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(collection(db, "bins"), orderBy("lastUpdate", "desc")),
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<WasteBinRecord, "id">),
  }));
}

async function getRealtimeBinReadings() {
  const realtimeDb = requireRealtimeDb();
  const snapshot = await get(ref(realtimeDb));
  return parseRealtimeBinReadings(snapshot.val());
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Omit<AppUser, "id">;
  return { id: snapshot.id, ...data };
}

export async function upsertUserProfile(user: AppUser) {
  const db = requireDb();
  await setUserProfile(db, user);
}

async function setUserProfile(db: ReturnType<typeof requireDb>, user: AppUser) {
  await setDoc(
    doc(db, "users", user.id),
    {
      ...user,
      usernameLowercase: normalizeUsername(user.username),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function findUserByUsername(username: string): Promise<AppUser | null> {
  const db = requireDb();
  const normalized = normalizeUsername(username);

  const directSnapshot = await getDocs(
    query(
      collection(db, "users"),
      where("usernameLowercase", "==", normalized),
      limit(1),
    ),
  );

  if (!directSnapshot.empty) {
    const docSnapshot = directSnapshot.docs[0];
    return {
      id: docSnapshot.id,
      ...(docSnapshot.data() as Omit<AppUser, "id">),
    };
  }

  const fallbackSnapshot = await getDocs(collection(db, "users"));

  for (const item of fallbackSnapshot.docs) {
    const data = item.data() as Partial<AppUser> & {
      usernameLowercase?: string;
    };
    const candidate: AppUser = {
      id: item.id,
      name: data.name ?? "",
      username:
        data.username && data.username.trim()
          ? data.username
          : createFallbackUsername({
              id: item.id,
              name: data.name ?? "",
              email: data.email ?? item.id,
            }),
      email: data.email ?? "",
      role: data.role ?? "petugas",
      area: data.area ?? "",
    };

    if (normalizeUsername(candidate.username) === normalized) {
      if (!data.username || !data.usernameLowercase) {
        await upsertUserProfile(candidate);
      }
      return candidate;
    }
  }

  return null;
}

export async function ensureProfileHasUsername(user: AppUser) {
  if (user.username?.trim()) {
    return user;
  }

  const nextUser: AppUser = {
    ...user,
    username: createFallbackUsername(user),
  };

  await upsertUserProfile(nextUser);
  return nextUser;
}

export async function ensureUsernameAvailable(username: string, excludeUid?: string) {
  const existing = await findUserByUsername(username);

  if (existing && existing.id !== excludeUid) {
    throw new Error("Username sudah dipakai. Gunakan username lain.");
  }
}

export async function createManagedUser(input: ManagedUserInput) {
  const appName = "managed-user-creator";
  const secondaryAuth = getSecondaryAuth(appName);
  const secondaryDb = requireNamedDb(appName);

  if (!secondaryAuth) {
    throw new Error("Firebase Auth belum dikonfigurasi.");
  }

  await ensureUsernameAvailable(input.username);

  const credential = await createUserWithEmailAndPassword(
    secondaryAuth,
    input.email,
    input.password,
  );

  const user: AppUser = {
    id: credential.user.uid,
    name: input.name,
    username: normalizeUsername(input.username),
    email: input.email,
    role: input.role,
    area: input.area,
  };

  await setUserProfile(secondaryDb, user);
  await signOut(secondaryAuth);

  return user;
}

export async function getUsers(): Promise<AppUser[]> {
  const db = requireDb();
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("name")));
  const users = snapshot.docs.map((item) => {
    const data = item.data() as Partial<AppUser>;

    return {
      id: item.id,
      name: data.name ?? "",
      username:
        data.username && data.username.trim()
          ? data.username
          : createFallbackUsername({
              id: item.id,
              name: data.name ?? "",
              email: data.email ?? item.id,
            }),
      email: data.email ?? "",
      role: data.role ?? "petugas",
      area: data.area ?? "",
    } satisfies AppUser;
  });

  await Promise.all(
    users
      .filter((user) => !(snapshot.docs.find((docItem) => docItem.id === user.id)?.data() as Partial<AppUser>).username)
      .map((user) => upsertUserProfile(user)),
  );

  return users;
}

export async function updateUserRole(uid: string, role: AppUser["role"]) {
  const db = requireDb();
  await updateDoc(doc(db, "users", uid), {
    role,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUsername(uid: string, username: string) {
  const db = requireDb();
  const normalized = normalizeUsername(username);

  if (!normalized) {
    throw new Error("Username tidak boleh kosong.");
  }

  await ensureUsernameAvailable(normalized, uid);

  await updateDoc(doc(db, "users", uid), {
    username: normalized,
    usernameLowercase: normalized,
    updatedAt: serverTimestamp(),
  });
}

export async function getBins(): Promise<WasteBin[]> {
  const bins = await getBinMetadata();

  if (!isRealtimeDatabaseConfigured) {
    return bins;
  }

  try {
    const readings = await getRealtimeBinReadings();
    return mergeBinsWithRealtimeReadings(bins, readings);
  } catch {
    return bins;
  }
}

export async function createBin(input: BinInput) {
  const db = requireDb();
  const fillPercent = Number(input.fillPercent);

  await addDoc(collection(db, "bins"), {
    ...input,
    status: deriveBinStatusFromFillPercent(fillPercent),
    fillPercent,
    lastUpdate: new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBin(id: string, input: BinInput) {
  const db = requireDb();
  const fillPercent = Number(input.fillPercent);

  await updateDoc(doc(db, "bins", id), {
    ...input,
    status: deriveBinStatusFromFillPercent(fillPercent),
    fillPercent,
    lastUpdate: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBinStatus(
  id: string,
  _status: BinStatus,
  fillPercent: number,
) {
  const db = requireDb();
  await updateDoc(doc(db, "bins", id), {
    status: deriveBinStatusFromFillPercent(fillPercent),
    fillPercent,
    lastUpdate: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBinRealtimeMapping(
  id: string,
  input: {
    deviceId: string;
    realtimeKey?: string;
  },
) {
  const db = requireDb();
  const normalizedDeviceId = input.deviceId.trim();
  const normalizedRealtimeKey = input.realtimeKey?.trim();

  if (!normalizedDeviceId) {
    throw new Error("Device ID tidak boleh kosong.");
  }

  await updateDoc(doc(db, "bins", id), {
    deviceId: normalizedDeviceId,
    realtimeKey: normalizedRealtimeKey || null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBin(id: string) {
  const db = requireDb();
  await deleteDoc(doc(db, "bins", id));
}

export async function getSensorLogs(): Promise<SensorLog[]> {
  if (isRealtimeDatabaseConfigured) {
    try {
      const readings = await getRealtimeBinReadings();

      return readings
        .sort(
          (left, right) =>
            new Date(right.recordedAt).getTime() - new Date(left.recordedAt).getTime(),
        )
        .map((reading) => ({
          id: `${reading.key}-${reading.recordedAt}`,
          binId: reading.key,
          deviceId: reading.key,
          status: deriveBinStatusFromFillPercent(reading.fillPercent),
          fillPercent: reading.fillPercent,
          recordedAt: reading.recordedAt,
        }));
    } catch {
      return [];
    }
  }

  const db = requireDb();
  const snapshot = await getDocs(
    query(collection(db, "sensor_logs"), orderBy("recordedAt", "desc")),
  );
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<SensorLog, "id">),
    status: deriveBinStatusFromFillPercent(
      (item.data() as Omit<SensorLog, "id">).fillPercent,
    ),
  }));
}

export async function getPublicReports(): Promise<PublicReport[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(collection(db, "public_reports"), orderBy("submittedAt", "desc")),
  );

  return snapshot.docs.map((item) => {
    const data = item.data() as Partial<PublicReport>;

    return {
      id: item.id,
      reporterName: data.reporterName ?? null,
      phone: data.phone ?? null,
      binId: data.binId ?? null,
      locationName: data.locationName ?? "Lokasi belum diisi",
      details: data.details ?? "",
      source: data.source ?? "public-monitoring",
      status: data.status ?? "baru",
      submittedAt: data.submittedAt ?? new Date().toISOString(),
    } satisfies PublicReport;
  });
}

export async function updatePublicReportStatus(
  id: string,
  status: PublicReportStatus,
) {
  const db = requireDb();
  await updateDoc(doc(db, "public_reports", id), {
    status,
    updatedAt: serverTimestamp(),
    handledAt: status === "selesai" ? new Date().toISOString() : null,
  });
}

export function subscribeBins(
  onData: (bins: WasteBin[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!isRealtimeDatabaseConfigured) {
    void getBins().then(onData).catch((error) => onError?.(error as Error));
    return () => undefined;
  }

  let active = true;
  let metadataBins: WasteBinRecord[] = [];
  let latestReadings: RealtimeBinReading[] = [];

  void getBinMetadata()
    .then((bins) => {
      metadataBins = bins;
      onData(mergeBinsWithRealtimeReadings(metadataBins, latestReadings));
    })
    .catch((error) => {
      onError?.(
        error instanceof Error ? error : new Error("Gagal memuat metadata tong."),
      );
    });

  const unsubscribe = onValue(
    ref(requireRealtimeDb()),
    (snapshot) => {
      if (!active) {
        return;
      }

      latestReadings = parseRealtimeBinReadings(snapshot.val());
      onData(mergeBinsWithRealtimeReadings(metadataBins, latestReadings));
    },
    (error) => {
      void getBinMetadata()
        .then((bins) => {
          onData(bins);
        })
        .catch(() => {
          onError?.(error);
        });
    },
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

export function subscribeSensorLogs(
  onData: (logs: SensorLog[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  if (!isRealtimeDatabaseConfigured) {
    void getSensorLogs().then(onData).catch((error) => onError?.(error as Error));
    return () => undefined;
  }

  const unsubscribe = onValue(
    ref(requireRealtimeDb()),
    (snapshot) => {
      const logs = parseRealtimeBinReadings(snapshot.val())
        .sort(
          (left, right) =>
            new Date(right.recordedAt).getTime() -
            new Date(left.recordedAt).getTime(),
        )
        .map((reading) => ({
          id: `${reading.key}-${reading.recordedAt}`,
          binId: reading.key,
          deviceId: reading.key,
          status: deriveBinStatusFromFillPercent(reading.fillPercent),
          fillPercent: reading.fillPercent,
          recordedAt: reading.recordedAt,
        }));

      onData(logs);
    },
    (error) => {
      onData([]);
      onError?.(error);
    },
  );

  return () => {
    unsubscribe();
  };
}
