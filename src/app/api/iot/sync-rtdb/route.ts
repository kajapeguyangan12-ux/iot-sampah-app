import { NextResponse } from "next/server";

import { syncRealtimeToFirestore } from "@/lib/realtime-sync";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await syncRealtimeToFirestore();

    return NextResponse.json({
      ok: true,
      message: "Snapshot Realtime Database berhasil disinkronkan ke Firestore.",
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal sinkronkan Realtime Database ke Firestore.",
      },
      { status: 500 },
    );
  }
}
