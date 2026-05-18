"use client";

import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { firebaseDb, getNamedFirestore, getSecondaryAuth } from "@/lib/firebase";
import type { AppUser, BinStatus, SensorLog, WasteBin } from "@/types/domain";

type BinInput = Omit<WasteBin, "id" | "lastUpdate">;
type ManagedUserInput = {
  name: string;
  username: string;
  email: string;
  password: string;
  area: string;
  role: AppUser["role"];
};

function normalizeUsername(username: string) {
  return username.trim().toLowerCase().replace(/\s+/g, "");
}

function createFallbackUsername(user: Pick<AppUser, "name" | "email" | "id">) {
  const raw = user.email.split("@")[0] || user.name || user.id;
  return normalizeUsername(raw.replace(/[^a-zA-Z0-9._-]/g, ""));
}

function requireDb() {
  if (!firebaseDb) {
    throw new Error("Firebase Firestore belum dikonfigurasi.");
  }

  return firebaseDb;
}

function requireNamedDb(appName: string) {
  const db = getNamedFirestore(appName);

  if (!db) {
    throw new Error("Firebase Firestore belum dikonfigurasi.");
  }

  return db;
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const db = requireDb();
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Omit<AppUser, "id">;
  return { id: snapshot.id, ...data };
}

export async function upsertUserProfile(user: AppUser) {
  const db = requireDb();
  await setUserProfile(db, user);
}

async function setUserProfile(db: ReturnType<typeof requireDb>, user: AppUser) {
  await setDoc(
    doc(db, "users", user.id),
    {
      ...user,
      usernameLowercase: normalizeUsername(user.username),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function findUserByUsername(username: string): Promise<AppUser | null> {
  const db = requireDb();
  const normalized = normalizeUsername(username);

  const directSnapshot = await getDocs(
    query(
      collection(db, "users"),
      where("usernameLowercase", "==", normalized),
      limit(1),
    ),
  );

  if (!directSnapshot.empty) {
    const docSnapshot = directSnapshot.docs[0];
    return {
      id: docSnapshot.id,
      ...(docSnapshot.data() as Omit<AppUser, "id">),
    };
  }

  const fallbackSnapshot = await getDocs(collection(db, "users"));

  for (const item of fallbackSnapshot.docs) {
    const data = item.data() as Partial<AppUser> & {
      usernameLowercase?: string;
    };
    const candidate: AppUser = {
      id: item.id,
      name: data.name ?? "",
      username:
        data.username && data.username.trim()
          ? data.username
          : createFallbackUsername({
              id: item.id,
              name: data.name ?? "",
              email: data.email ?? item.id,
            }),
      email: data.email ?? "",
      role: data.role ?? "petugas",
      area: data.area ?? "",
    };

    if (normalizeUsername(candidate.username) === normalized) {
      if (!data.username || !data.usernameLowercase) {
        await upsertUserProfile(candidate);
      }
      return candidate;
    }
  }

  return null;
}

export async function ensureProfileHasUsername(user: AppUser) {
  if (user.username?.trim()) {
    return user;
  }

  const nextUser: AppUser = {
    ...user,
    username: createFallbackUsername(user),
  };

  await upsertUserProfile(nextUser);
  return nextUser;
}

export async function ensureUsernameAvailable(username: string, excludeUid?: string) {
  const existing = await findUserByUsername(username);

  if (existing && existing.id !== excludeUid) {
    throw new Error("Username sudah dipakai. Gunakan username lain.");
  }
}

export async function createManagedUser(input: ManagedUserInput) {
  const appName = "managed-user-creator";
  const secondaryAuth = getSecondaryAuth(appName);
  const secondaryDb = requireNamedDb(appName);

  if (!secondaryAuth) {
    throw new Error("Firebase Auth belum dikonfigurasi.");
  }

  await ensureUsernameAvailable(input.username);

  const credential = await createUserWithEmailAndPassword(
    secondaryAuth,
    input.email,
    input.password,
  );

  const user: AppUser = {
    id: credential.user.uid,
    name: input.name,
    username: normalizeUsername(input.username),
    email: input.email,
    role: input.role,
    area: input.area,
  };

  await setUserProfile(secondaryDb, user);
  await signOut(secondaryAuth);

  return user;
}

export async function getUsers(): Promise<AppUser[]> {
  const db = requireDb();
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("name")));
  const users = snapshot.docs.map((item) => {
    const data = item.data() as Partial<AppUser>;

    return {
      id: item.id,
      name: data.name ?? "",
      username:
        data.username && data.username.trim()
          ? data.username
          : createFallbackUsername({
              id: item.id,
              name: data.name ?? "",
              email: data.email ?? item.id,
            }),
      email: data.email ?? "",
      role: data.role ?? "petugas",
      area: data.area ?? "",
    } satisfies AppUser;
  });

  await Promise.all(
    users
      .filter((user) => !(snapshot.docs.find((docItem) => docItem.id === user.id)?.data() as Partial<AppUser>).username)
      .map((user) => upsertUserProfile(user)),
  );

  return users;
}

export async function updateUserRole(uid: string, role: AppUser["role"]) {
  const db = requireDb();
  await updateDoc(doc(db, "users", uid), {
    role,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUsername(uid: string, username: string) {
  const db = requireDb();
  const normalized = normalizeUsername(username);

  if (!normalized) {
    throw new Error("Username tidak boleh kosong.");
  }

  await ensureUsernameAvailable(normalized, uid);

  await updateDoc(doc(db, "users", uid), {
    username: normalized,
    usernameLowercase: normalized,
    updatedAt: serverTimestamp(),
  });
}

export async function getBins(): Promise<WasteBin[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(collection(db, "bins"), orderBy("lastUpdate", "desc")),
  );
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<WasteBin, "id">),
  }));
}

export async function createBin(input: BinInput) {
  const db = requireDb();
  await addDoc(collection(db, "bins"), {
    ...input,
    lastUpdate: new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateBinStatus(
  id: string,
  status: BinStatus,
  fillPercent: number,
) {
  const db = requireDb();
  await updateDoc(doc(db, "bins", id), {
    status,
    fillPercent,
    lastUpdate: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBin(id: string) {
  const db = requireDb();
  await deleteDoc(doc(db, "bins", id));
}

export async function getSensorLogs(): Promise<SensorLog[]> {
  const db = requireDb();
  const snapshot = await getDocs(
    query(collection(db, "sensor_logs"), orderBy("recordedAt", "desc")),
  );
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Omit<SensorLog, "id">),
  }));
}
