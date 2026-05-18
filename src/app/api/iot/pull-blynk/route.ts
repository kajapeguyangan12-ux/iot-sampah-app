import { NextResponse } from "next/server";

import { IotIngestError, persistSensorReading } from "@/lib/iot-ingest";
import type { BinStatus } from "@/types/domain";

export const runtime = "nodejs";

function parseFillPercent(rawValue: unknown) {
  if (typeof rawValue === "number") {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  if (Array.isArray(rawValue) && rawValue.length > 0) {
    return parseFillPercent(rawValue[0]);
  }

  return Number.NaN;
}

function normalizeBlynkStatus(rawValue: unknown): BinStatus | undefined {
  if (typeof rawValue !== "string") {
    return undefined;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (normalized === "kosong" || normalized === "setengah" || normalized === "penuh") {
    return normalized;
  }

  if (normalized.includes("kosong")) {
    return "kosong";
  }

  if (normalized.includes("setengah")) {
    return "setengah";
  }

  if (normalized.includes("penuh") && !normalized.includes("belum")) {
    return "penuh";
  }

  return undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const server = process.env.BLYNK_SERVER ?? "sgp1.blynk.cloud";
  const token = process.env.BLYNK_AUTH_TOKEN;
  const deviceId = searchParams.get("deviceId") ?? process.env.BLYNK_DEVICE_ID;
  const fillPin = process.env.BLYNK_FILL_PIN ?? "v0";
  const statusPin = process.env.BLYNK_STATUS_PIN ?? "v1";

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        message: "BLYNK_AUTH_TOKEN belum diisi di .env.local.",
      },
      { status: 500 },
    );
  }

  if (!deviceId) {
    return NextResponse.json(
      {
        ok: false,
        message: "BLYNK_DEVICE_ID belum diisi di .env.local atau query string.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(`https://${server}/external/api/getAll?token=${token}`, {
      cache: "no-store",
    });

    const rawText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "Blynk mengembalikan error saat diminta membaca datastream.",
          blynkStatus: response.status,
          blynkResponse: rawText,
        },
        { status: 502 },
      );
    }

    const datastreams = JSON.parse(rawText) as Record<string, unknown>;
    const fillPercent = parseFillPercent(datastreams[fillPin]);
    const status = normalizeBlynkStatus(datastreams[statusPin]);

    if (!Number.isFinite(fillPercent)) {
      return NextResponse.json(
        {
          ok: false,
          message: `Nilai Blynk pada pin ${fillPin} tidak bisa dibaca sebagai angka.`,
          datastreams,
        },
        { status: 422 },
      );
    }

    const savedReading = await persistSensorReading({
      deviceId,
      fillPercent,
      status: status as "kosong" | "setengah" | "penuh" | undefined,
    });

    return NextResponse.json({
      ok: true,
      message: "Data Blynk berhasil diambil dan disimpan ke Firestore.",
      data: {
        source: {
          server,
          fillPin,
          statusPin,
        },
        datastreams,
        saved: savedReading,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Gagal mengambil data dari Blynk.",
      },
      { status: error instanceof IotIngestError ? error.status : 500 },
    );
  }
}
