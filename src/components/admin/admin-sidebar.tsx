"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";

const navItems = [
  { href: "/admin", label: "Dashboard", code: "01" },
  { href: "/admin/pengguna", label: "Kelola Pengguna", code: "02" },
  { href: "/admin/tong", label: "Kelola Tong", code: "03" },
  { href: "/admin/laporan", label: "Laporan Masuk", code: "04" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <div className="hero-grid rounded-[2rem] border border-[#245542]/14 bg-brand-strong p-6 text-white shadow-[0_30px_70px_rgba(18,63,49,0.16)]">
        <p className="text-xs uppercase tracking-[0.28em] text-white/70">Panel Admin</p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight">
          Kendalikan prioritas operasional dari satu panel.
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/75">
          Login sebagai {profile?.name}. Gunakan menu di bawah untuk memantau kondisi tong, memperbarui data, dan menjaga akses tim tetap rapi.
        </p>

        <nav className="mt-8 grid gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "border-[#f3d39a]/65 bg-[#f7edd5] text-[#143f30] shadow-[0_14px_30px_rgba(8,38,28,0.18)]"
                    : "border-white/10 bg-white/6 text-white/88 hover:bg-white/12 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      active
                        ? "bg-[#1f6f50] text-white"
                        : "bg-white/10 text-white/78 group-hover:bg-white/16"
                    }`}
                  >
                    {item.code}
                  </span>
                  <span>{item.label}</span>
                </span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    active ? "bg-[#1f6f50]" : "bg-white/20 group-hover:bg-white/35"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-[1.5rem] border border-white/12 bg-white/8 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-white/65">Akses Cepat</p>
          <div className="mt-3 space-y-3 text-sm text-white/78">
            <p>Periksa dashboard untuk melihat tong yang harus segera diangkut.</p>
            <p>Pastikan akun petugas aktif dan area tugasnya sesuai.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/petugas"
              className="rounded-full border border-white/16 px-4 py-2 text-sm font-semibold text-white"
            >
              Mode Petugas
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-strong"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
