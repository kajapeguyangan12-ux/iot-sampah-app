"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";
import { subscribePublicReports } from "@/lib/firestore";
import type { PublicReport } from "@/types/domain";

const navItems = [
  { href: "/admin", label: "Dashboard", code: "01" },
  { href: "/admin/pengguna", label: "Kelola Pengguna", code: "02" },
  { href: "/admin/tong", label: "Kelola Tong", code: "03" },
  { href: "/admin/laporan", label: "Laporan Masuk", code: "04" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const [reports, setReports] = useState<PublicReport[]>([]);

  useEffect(() => {
    const unsubscribe = subscribePublicReports(
      (nextReports) => {
        setReports(nextReports);
      },
      () => {
        setReports([]);
      },
    );

    return () => unsubscribe();
  }, []);

  const newReports = reports.filter((report) => report.status === "baru").length;

  return (
    <aside className="xl:sticky xl:top-6 xl:self-start">
      <div className="hero-grid rounded-[2rem] border border-[#245542]/14 bg-brand-strong p-6 text-white shadow-[0_30px_70px_rgba(18,63,49,0.16)]">
        <p className="text-xs uppercase tracking-[0.28em] text-white/70">
          Eco-Smart Bin Grid
        </p>
        <h1 className="mt-4 text-3xl font-semibold leading-tight">
          Panel admin untuk monitoring tong sampah pintar.
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/75">
          Dikembangkan oleh SMK Industri Penerbangan Cakra Nusantara untuk
          memantau kondisi tong, laporan masuk, dan data operasional dalam satu
          sistem.
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
                  {item.href === "/admin/laporan" && newReports > 0 ? (
                    <span
                      className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-[11px] font-bold ${
                        active
                          ? "bg-danger text-white"
                          : "bg-[#f3d39a] text-[#143f30]"
                      }`}
                    >
                      {newReports}
                    </span>
                  ) : null}
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
          <div className="flex flex-wrap gap-3">
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
