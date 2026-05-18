import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdminDb, getFirebaseAdminRealtimeDb } from "@/lib/firebase-admin";
import type { BinStatus } from "@/types/domain";

type RealtimeReading = {
  key: string;
  fillPercent: number;
  status: BinStatus;
  recordedAt: string;
};

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

function deriveStatusFromFillPercent(fillPercent: number): BinStatus {
  if (fillPercent >= 80) {
    return "penuh";
  }

  if (fillPercent >= 40) {
    return "setengah";
  }

  return "kosong";
}

function normalizeStatus(rawStatus: unknown, fillPercent: number): BinStatus {
  if (typeof rawStatus === "string") {
    const normalized = rawStatus.trim().toLowerCase();

    if (
      normalized.includes("aman") ||
      normalized.includes("belum penuh") ||
      normalized.includes("tidak penuh") ||
      normalized.includes("kosong") ||
      normalized.includes("empty")
    ) {
      return "kosong";
    }

    if (
      normalized.includes("setengah") ||
      normalized.includes("waspada") ||
      normalized.includes("warning") ||
      normalized.includes("hampir")
    ) {
      return "setengah";
    }

    if (
      normalized.includes("penuh") ||
      normalized.includes("full") ||
      normalized.includes("bahaya")
    ) {
      return "penuh";
    }

  }

  return deriveStatusFromFillPercent(fillPercent);
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

function parseRealtimeReadings(value: unknown) {
  if (!value || typeof value !== "object") {
    return [] as RealtimeReading[];
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([key, rawValue]) => {
      if (!rawValue || typeof rawValue !== "object") {
        return null;
      }

      const record = rawValue as Record<string, unknown>;
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
              (record.status.toLowerCase().includes("setengah") ||
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
      } satisfies RealtimeReading;
    })
    .filter((item): item is RealtimeReading => item !== null);
}

function buildCandidates(bin: {
  id: string;
  code?: string;
  deviceId?: string;
  realtimeKey?: string;
  locationName?: string;
}) {
  return [
    bin.realtimeKey,
    bin.deviceId,
    bin.code,
    bin.id,
    bin.locationName,
  ]
    .map((value) => normalizeLookupKey(value))
    .filter(Boolean);
}

export async function syncRealtimeToFirestore() {
  const realtimeDb = getFirebaseAdminRealtimeDb();
  const firestoreDb = getFirebaseAdminDb();
  const snapshot = await realtimeDb.ref("/").get();
  const readings = parseRealtimeReadings(snapshot.val());

  const binsSnapshot = await firestoreDb.collection("bins").get();
  const bins = binsSnapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as {
      code?: string;
      deviceId?: string;
      realtimeKey?: string;
      locationName?: string;
    }),
  }));

  const results = {
    totalRealtimeNodes: readings.length,
    matchedBins: 0,
    unmatchedRealtimeKeys: [] as string[],
  };

  for (const reading of readings) {
    const normalizedKey = normalizeLookupKey(reading.key);
    const matchedBin = bins.find((bin) =>
      buildCandidates(bin).includes(normalizedKey),
    );

    if (!matchedBin) {
      results.unmatchedRealtimeKeys.push(reading.key);
      continue;
    }

    results.matchedBins += 1;

    await firestoreDb.collection("bins").doc(matchedBin.id).set(
      {
        fillPercent: reading.fillPercent,
        status: reading.status,
        lastUpdate: reading.recordedAt,
        realtimeKey: matchedBin.realtimeKey ?? reading.key,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await firestoreDb.collection("sensor_logs").add({
      binId: matchedBin.id,
      deviceId: matchedBin.deviceId ?? reading.key,
      realtimeKey: reading.key,
      fillPercent: reading.fillPercent,
      status: reading.status,
      recordedAt: reading.recordedAt,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return results;
}
