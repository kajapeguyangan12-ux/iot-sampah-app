"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { ensureProfileHasUsername, findUserByUsername, getUserProfile } from "@/lib/firestore";
import type { AppUser } from "@/types/domain";

const GUEST_USERNAME = process.env.NEXT_PUBLIC_GUEST_USERNAME ?? "tamu";
const GUEST_PASSWORD = process.env.NEXT_PUBLIC_GUEST_PASSWORD ?? "123456";
const GUEST_SESSION_KEY = "iot-sampah-guest-session";

const guestProfile: AppUser = {
  id: "guest-shared",
  name: "Pengunjung Tamu",
  username: GUEST_USERNAME,
  email: "guest@iot-sampah.local",
  role: "tamu",
  area: "Publik",
};

type AuthContextValue = {
  authUser: User | null;
  profile: AppUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<AppUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(GUEST_SESSION_KEY) === "true") {
      setProfile(guestProfile);
      setLoading(false);
    }

    if (!isFirebaseConfigured || !firebaseAuth) {
      if (typeof window !== "undefined" && window.localStorage.getItem(GUEST_SESSION_KEY) !== "true") {
        setLoading(false);
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setAuthUser(user);

      if (!user) {
        if (typeof window !== "undefined" && window.localStorage.getItem(GUEST_SESSION_KEY) === "true") {
          setProfile(guestProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
        return;
      }

      const nextProfile = await getUserProfile(user.uid);
      setProfile(nextProfile ? await ensureProfileHasUsername(nextProfile) : null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextValue = {
    authUser,
    profile,
    loading,
    async signIn(username, password) {
      const normalizedUsername = username.trim().toLowerCase();
      const canUseGuestFallback =
        normalizedUsername === GUEST_USERNAME.toLowerCase() &&
        password === GUEST_PASSWORD;

      if (!firebaseAuth) {
        if (canUseGuestFallback) {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(GUEST_SESSION_KEY, "true");
          }
          setAuthUser(null);
          setProfile(guestProfile);
          setLoading(false);
          return guestProfile;
        }

        throw new Error("Firebase Auth belum aktif.");
      }

      setLoading(true);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(GUEST_SESSION_KEY);
      }
      const account =
        (await findUserByUsername(username)) ??
        (username.includes("@")
          ? {
              email: username,
            }
          : null);

      if (!account?.email && canUseGuestFallback) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(GUEST_SESSION_KEY, "true");
        }
        setAuthUser(null);
        setProfile(guestProfile);
        setLoading(false);
        return guestProfile;
      }

      if (!account?.email) {
        setLoading(false);
        throw new Error("Username tidak ditemukan.");
      }

      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        account.email,
        password,
      );
      const nextProfile = await getUserProfile(credential.user.uid);
      if (!nextProfile) {
        setLoading(false);
        throw new Error(
          "Profil pengguna belum ada di Firestore. Buat admin pertama lewat setup atau minta admin membuat akun Anda.",
        );
      }
      const ensuredProfile = await ensureProfileHasUsername(nextProfile);
      setProfile(ensuredProfile);
      setLoading(false);
      return ensuredProfile;
    },
    async logout() {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(GUEST_SESSION_KEY);
      }

      setProfile(null);

      if (!firebaseAuth) {
        setAuthUser(null);
        return;
      }

      await signOut(firebaseAuth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  }

  return context;
}
