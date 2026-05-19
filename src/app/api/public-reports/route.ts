import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase-admin";

type Payload = {
  reporterName?: string;
  phone?: string;
  binId?: string;
  locationName?: string;
  details?: string;
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

  const locationName = body.locationName?.trim() ?? "";
  const details = body.details?.trim() ?? "";

  if (!locationName) {
    return NextResponse.json(
      {
        ok: false,
        message: "Lokasi laporan wajib diisi.",
      },
      { status: 400 },
    );
  }

  if (!details) {
    return NextResponse.json(
      {
        ok: false,
        message: "Isi laporan wajib diisi.",
      },
      { status: 400 },
    );
  }

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Firebase Admin belum dikonfigurasi untuk menerima laporan publik.",
      },
      { status: 500 },
    );
  }

  try {
    const db = getFirebaseAdminDb();
    await db.collection("public_reports").add({
      reporterName: body.reporterName?.trim() || null,
      phone: body.phone?.trim() || null,
      binId: body.binId?.trim() || null,
      locationName,
      details,
      source: "public-monitoring",
      status: "baru",
      createdAt: FieldValue.serverTimestamp(),
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      message: "Laporan berhasil dikirim. Terima kasih sudah membantu monitoring.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Gagal menyimpan laporan publik.",
      },
      { status: 500 },
    );
  }
}
