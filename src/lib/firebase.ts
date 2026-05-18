import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const app = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseApp = app;
export const firebaseAuth = app ? getAuth(app) : null;
export const firebaseDb = app ? getFirestore(app) : null;

export function getNamedFirebaseApp(appName = "managed-user-creator"): FirebaseApp | null {
  if (!isFirebaseConfigured) {
    return null;
  }

  return (
    getApps().find((item) => item.name === appName) ?? initializeApp(firebaseConfig, appName)
  );
}

export function getSecondaryAuth(appName = "managed-user-creator") {
  const secondaryApp = getNamedFirebaseApp(appName);

  if (!secondaryApp) {
    return null;
  }

  return getAuth(secondaryApp);
}

export function getNamedFirestore(appName = "managed-user-creator") {
  const namedApp = getNamedFirebaseApp(appName);

  if (!namedApp) {
    return null;
  }

  return getFirestore(namedApp);
}

export async function getFirebaseAnalytics() {
  if (!app || typeof window === "undefined") {
    return null;
  }

  const supported = await isSupported();
  return supported ? getAnalytics(app) : null;
}
