import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { deriveBinStatusFromFillPercent } from "@/lib/bin-status";
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

type BinDocument = QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>;

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
  _status: BinStatus | undefined,
  fillPercent: number,
): BinStatus {
  return deriveBinStatusFromFillPercent(fillPercent);
}

export function validateIncomingStatus(status: BinStatus | undefined) {
  if (status && !allowedStatus.has(status)) {
    throw new IotIngestError(400, "Status harus kosong, setengah, atau penuh.");
  }
}

export async function persistSensorReading(
  input: PersistReadingInput,
): Promise<PersistReadingResult> {
  if (!isFirebaseAdminConfigured()) {
    throw new IotIngestError(
      500,
      "Firebase Admin belum dikonfigurasi di server. Isi env service account lalu redeploy aplikasi.",
    );
  }

  if (input.fillPercent < 0 || input.fillPercent > 100) {
    throw new IotIngestError(400, "fillPercent harus bernilai 0 sampai 100.");
  }

  validateIncomingStatus(input.status);

  const firebaseDb = getFirebaseAdminDb();
  const status = resolveBinStatus(input.status, input.fillPercent);
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const normalizedDeviceId = normalizeDeviceId(input.deviceId);
  const binsSnapshot = await firebaseDb
    .collection("bins")
    .where("deviceId", "==", input.deviceId)
    .limit(1)
    .get();

  let binDoc: BinDocument | null = binsSnapshot.docs[0] ?? null;

  if (!binDoc) {
    const fallbackSnapshot = await firebaseDb.collection("bins").get();
    binDoc =
      fallbackSnapshot.docs.find((item) => {
        const data = item.data() as { deviceId?: string };
        return data.deviceId ? normalizeDeviceId(data.deviceId) === normalizedDeviceId : false;
      }) ?? null;
  }

  if (!binDoc) {
    const createdBinRef = await firebaseDb.collection("bins").add({
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
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const createdBinSnapshot = await createdBinRef.get();
    binDoc = createdBinSnapshot.exists ? createdBinSnapshot : null;
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

  await binDoc.ref.update({
    status,
    fillPercent: input.fillPercent,
    lastUpdate: recordedAt,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const logRef = await firebaseDb.collection("sensor_logs").add({
    binId: binDoc.id,
    deviceId: input.deviceId,
    status,
    fillPercent: input.fillPercent,
    recordedAt,
    createdAt: FieldValue.serverTimestamp(),
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
