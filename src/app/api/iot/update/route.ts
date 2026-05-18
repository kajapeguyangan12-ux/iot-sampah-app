import { NextResponse } from "next/server";

import { IotIngestError, persistSensorReading } from "@/lib/iot-ingest";
import type { BinStatus } from "@/types/domain";

type Payload = {
  deviceId?: string;
  status?: BinStatus;
  fillPercent?: number;
  recordedAt?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: Payload;

  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Body request harus berupa JSON yang valid.",
      },
      { status: 400 },
    );
  }

  if (!body.deviceId || typeof body.fillPercent !== "number") {
    return NextResponse.json(
      {
        ok: false,
        message: "deviceId dan fillPercent wajib diisi.",
      },
      { status: 400 },
    );
  }

  try {
    const savedReading = await persistSensorReading({
      deviceId: body.deviceId,
      status: body.status,
      fillPercent: body.fillPercent,
      recordedAt: body.recordedAt,
    });

    return NextResponse.json({
      ok: true,
      message: "Payload IoT diterima dan berhasil disimpan ke Firestore.",
      data: savedReading,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Gagal menyimpan payload IoT ke Firestore.",
      },
      { status: error instanceof IotIngestError ? error.status : 500 },
    );
  }
}
