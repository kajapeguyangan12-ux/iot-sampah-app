import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { firebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { BinStatus } from "@/types/domain";

const allowedStatus = new Set<BinStatus>(["kosong", "setengah", "penuh"]);

type PersistReadingInput = {
  deviceId: string;
  fillPercent: number;
  status?: BinStatus;
  recordedAt?: string;
};

type PersistReadingResult = {
  deviceId: string;
  status: BinStatus;
  fillPercent: number;
  recordedAt: string;
  bin: {
    id: string;
    code: string | null;
    locationName: string | null;
    area: string | null;
  };
  sensorLogId: string;
};

function normalizeDeviceId(deviceId: string) {
  return deviceId.trim().toLowerCase();
}

export class IotIngestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function resolveBinStatus(
  status: BinStatus | undefined,
  fillPercent: number,
): BinStatus {
  if (status && allowedStatus.has(status)) {
    return status;
  }

  if (fillPercent >= 80) {
    return "penuh";
  }

  if (fillPercent >= 40) {
    return "setengah";
  }

  return "kosong";
}

export function validateIncomingStatus(status: BinStatus | undefined) {
  if (status && !allowedStatus.has(status)) {
    throw new IotIngestError(400, "Status harus kosong, setengah, atau penuh.");
  }
}

export async function persistSensorReading(
  input: PersistReadingInput,
): Promise<PersistReadingResult> {
  if (!isFirebaseConfigured || !firebaseDb) {
    throw new IotIngestError(
      500,
      "Firebase belum dikonfigurasi di server. Isi .env.local lalu jalankan ulang aplikasi.",
    );
  }

  if (input.fillPercent < 0 || input.fillPercent > 100) {
    throw new IotIngestError(400, "fillPercent harus bernilai 0 sampai 100.");
  }

  validateIncomingStatus(input.status);

  const status = resolveBinStatus(input.status, input.fillPercent);
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const normalizedDeviceId = normalizeDeviceId(input.deviceId);
  const binsSnapshot = await getDocs(
    query(collection(firebaseDb, "bins"), where("deviceId", "==", input.deviceId), limit(1)),
  );

  let binDoc: (typeof binsSnapshot.docs)[number] | null = binsSnapshot.docs[0] ?? null;

  if (!binDoc) {
    const fallbackSnapshot = await getDocs(collection(firebaseDb, "bins"));
    binDoc =
      fallbackSnapshot.docs.find((item) => {
        const data = item.data() as { deviceId?: string };
        return data.deviceId ? normalizeDeviceId(data.deviceId) === normalizedDeviceId : false;
      }) ?? null;
  }

  if (!binDoc) {
    const createdBinRef = await addDoc(collection(firebaseDb, "bins"), {
      code: `AUTO-${input.deviceId}`,
      locationName: `Device ${input.deviceId}`,
      address: "Belum diatur",
      area: "Belum diatur",
      lat: 0,
      lng: 0,
      deviceId: input.deviceId.trim(),
      status,
      fillPercent: input.fillPercent,
      lastUpdate: recordedAt,
      note: "Dibuat otomatis dari sinkronisasi Blynk.",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const createdBinSnapshot = await getDoc(createdBinRef);
    binDoc = createdBinSnapshot.exists() ? createdBinSnapshot : null;
  }

  if (!binDoc) {
    throw new IotIngestError(
      500,
      `Gagal membuat atau menemukan data bins untuk deviceId "${input.deviceId}".`,
    );
  }
  const binData = binDoc.data() as {
    code?: string;
    locationName?: string;
    area?: string;
  };

  await updateDoc(binDoc.ref, {
    status,
    fillPercent: input.fillPercent,
    lastUpdate: recordedAt,
    updatedAt: serverTimestamp(),
  });

  const logRef = await addDoc(collection(firebaseDb, "sensor_logs"), {
    binId: binDoc.id,
    deviceId: input.deviceId,
    status,
    fillPercent: input.fillPercent,
    recordedAt,
    createdAt: serverTimestamp(),
  });

  return {
    deviceId: input.deviceId,
    status,
    fillPercent: input.fillPercent,
    recordedAt,
    bin: {
      id: binDoc.id,
      code: binData.code ?? null,
      locationName: binData.locationName ?? null,
      area: binData.area ?? null,
    },
    sensorLogId: logRef.id,
  };
}
