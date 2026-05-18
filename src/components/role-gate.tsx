"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import type { UserRole } from "@/types/domain";

type RoleGateProps = {
  allow: UserRole;
  children: React.ReactNode;
};

export function RoleGate({ allow, children }: RoleGateProps) {
  const router = useRouter();
  const { loading, profile, authUser } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!authUser) {
      router.replace("/login");
      return;
    }

    if (profile && profile.role !== allow) {
      router.replace(profile.role === "admin" ? "/admin" : "/petugas");
    }
  }, [allow, authUser, loading, profile, router]);

  if (loading || !authUser || !profile || profile.role !== allow) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-12">
        <div className="rounded-[1.75rem] border border-line bg-surface px-6 py-5 text-sm text-foreground/65 shadow-sm">
          {loading
            ? "Memuat akses halaman..."
            : authUser && !profile
              ? "Profil Firestore belum ditemukan untuk akun ini."
              : "Mengarahkan ke halaman yang sesuai..."}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
