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
    if (!isFirebaseConfigured || !firebaseAuth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setAuthUser(user);

      if (!user) {
        setProfile(null);
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
      if (!firebaseAuth) {
        throw new Error("Firebase Auth belum aktif.");
      }

      setLoading(true);
      const account =
        (await findUserByUsername(username)) ??
        (username.includes("@")
          ? {
              email: username,
            }
          : null);

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
      if (!firebaseAuth) {
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
