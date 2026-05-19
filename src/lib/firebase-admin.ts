import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getFirestore } from "firebase-admin/firestore";

function getPrivateKey() {
  const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim();

  if (!rawKey || rawKey === "ROTATE_ME_AND_SET_IN_VERCEL") {
    return null;
  }

  const normalizedKey = rawKey.replace(/\\n/g, "\n");

  if (
    !normalizedKey.includes("-----BEGIN PRIVATE KEY-----") ||
    !normalizedKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY belum valid. Isi dengan private key service account lengkap dalam format PEM.",
    );
  }

  return normalizedKey;
}

export function isFirebaseAdminConfigured() {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      getPrivateKey(),
  );
}

function getFirebaseAdminApp() {
  const privateKey = getPrivateKey();

  if (!isFirebaseAdminConfigured()) {
    throw new Error(
      "Firebase Admin belum dikonfigurasi. Isi FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, dan FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  if (getApps().length) {
    return getApps()[0]!;
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: privateKey ?? undefined,
    }),
    databaseURL: process.env.FIREBASE_ADMIN_DATABASE_URL ?? process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAdminRealtimeDb() {
  return getDatabase(getFirebaseAdminApp());
}
