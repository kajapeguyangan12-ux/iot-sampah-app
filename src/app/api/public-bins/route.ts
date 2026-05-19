import { NextResponse } from "next/server";

import {
  getFirebaseAdminDb,
  getFirebaseAdminRealtimeDb,
  isFirebaseAdminConfigured,
} from "@/lib/firebase-admin";
import { deriveBinStatusFromFillPercent } from "@/lib/bin-status";
import type { BinStatus, WasteBin } from "@/types/domain";

type AdminBinRecord = Omit<WasteBin, "id">;
type RealtimeReading = {
  key: string;
  fillPercent: number;
  status: BinStatus;
  recordedAt: string;
};

export const runtime = "nodejs";

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
              (record.status.toLowerCase().includes("sedang") ||
                record.status.toLowerCase().includes("setengah") ||
                record.status.toLowerCase().includes("waspada"))
            ? 50
            : 0;
      const fillPercent = clampFillPercent(parsedFillPercent ?? fallbackFillPercent);

      return {
        key,
        fillPercent,
        status: deriveBinStatusFromFillPercent(fillPercent),
        recordedAt: normalizeTimestamp(
          record.recordedAt ?? record.lastUpdate ?? record.updatedAt ?? record.timestamp,
        ),
      } satisfies RealtimeReading;
    })
    .filter((item): item is RealtimeReading => item !== null);
}

function createBinLookupKeys(bin: Partial<WasteBin>) {
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

function mergeBinsWithRealtimeReadings(
  bins: WasteBin[],
  readings: RealtimeReading[],
): WasteBin[] {
  const readingMap = new Map(
    readings.map((reading) => [normalizeLookupKey(reading.key), reading]),
  );

  return bins
    .map((bin) => {
      const match = createBinLookupKeys(bin)
        .map((candidate) => readingMap.get(candidate))
        .find(Boolean);
      const fillPercent = match?.fillPercent ?? bin.fillPercent;

      return {
        ...bin,
        deviceId: match?.key ?? bin.deviceId,
        status: deriveBinStatusFromFillPercent(fillPercent),
        fillPercent,
        lastUpdate: match?.recordedAt ?? bin.lastUpdate,
      };
    })
    .sort((left, right) => right.fillPercent - left.fillPercent);
}

async function getPublicBins() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin belum dikonfigurasi.");
  }

  const firestoreDb = getFirebaseAdminDb();
  const realtimeDb = getFirebaseAdminRealtimeDb();

  const binsSnapshot = await firestoreDb.collection("bins").orderBy("lastUpdate", "desc").get();
  const bins = binsSnapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as AdminBinRecord),
  })) satisfies WasteBin[];

  const realtimeSnapshot = await realtimeDb.ref("/").get();
  const readings = parseRealtimeReadings(realtimeSnapshot.val());

  return mergeBinsWithRealtimeReadings(bins, readings);
}

export async function GET() {
  try {
    const bins = await getPublicBins();

    return NextResponse.json({
      ok: true,
      data: bins,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal memuat data tong publik.",
      },
      { status: 500 },
    );
  }
}
