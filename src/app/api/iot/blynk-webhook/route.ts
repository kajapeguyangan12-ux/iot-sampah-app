import { NextResponse } from "next/server";

import { IotIngestError, persistSensorReading } from "@/lib/iot-ingest";

type BlynkWebhookPayload = {
  deviceId?: string;
  deviceCode?: string;
  pin?: string;
  value?: number | string;
  pinValue?: number | string;
  recordedAt?: string;
  timestamp?: string;
  authToken?: string;
};

export const runtime = "nodejs";

function normalizeNumericValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

export async function POST(request: Request) {
  let body: BlynkWebhookPayload;

  try {
    body = (await request.json()) as BlynkWebhookPayload;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Body webhook harus berupa JSON yang valid.",
      },
      { status: 400 },
    );
  }

  const fillPin = (process.env.BLYNK_FILL_PIN ?? "v0").toLowerCase();
  const expectedToken = process.env.BLYNK_AUTH_TOKEN;
  const resolvedPin = body.pin?.trim().toLowerCase();
  const resolvedDeviceId = body.deviceId?.trim() || body.deviceCode?.trim() || process.env.BLYNK_DEVICE_ID;
  const resolvedValue = normalizeNumericValue(body.value ?? body.pinValue);
  const recordedAt = body.recordedAt ?? body.timestamp;

  if (expectedToken && body.authToken && body.authToken !== expectedToken) {
    return NextResponse.json(
      {
        ok: false,
        message: "authToken webhook tidak cocok.",
      },
      { status: 401 },
    );
  }

  if (!resolvedDeviceId) {
    return NextResponse.json(
      {
        ok: false,
        message: "deviceId atau deviceCode wajib dikirim dari webhook Blynk.",
      },
      { status: 400 },
    );
  }

  if (resolvedPin && resolvedPin !== fillPin) {
    return NextResponse.json({
      ok: true,
      message: `Webhook untuk pin ${resolvedPin} diabaikan. Sistem hanya memproses ${fillPin}.`,
    });
  }

  if (!Number.isFinite(resolvedValue)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Nilai sensor dari webhook tidak bisa dibaca sebagai angka.",
      },
      { status: 422 },
    );
  }

  try {
    const savedReading = await persistSensorReading({
      deviceId: resolvedDeviceId,
      fillPercent: resolvedValue,
      recordedAt,
    });

    return NextResponse.json({
      ok: true,
      message: "Webhook Blynk berhasil disimpan ke Firestore.",
      data: savedReading,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Gagal menyimpan webhook Blynk ke Firestore.",
      },
      { status: error instanceof IotIngestError ? error.status : 500 },
    );
  }
}
