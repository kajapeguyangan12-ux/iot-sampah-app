"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BinMap } from "@/components/bin-map";
import { useAuth } from "@/components/providers/auth-provider";
import { RoleGate } from "@/components/role-gate";
import { SensorActivityBadge } from "@/components/sensor-activity-badge";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { useCurrentTime } from "@/hooks/use-current-time";
import { statusOrder } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/format";
import { subscribeBins } from "@/lib/firestore";
import { formatSensorLastSeen, getSensorActivity } from "@/lib/sensor-health";
import type { WasteBin } from "@/types/domain";

export default function OfficerPage() {
  return (
    <RoleGate allow="petugas">
      <OfficerDashboard />
    </RoleGate>
  );
}

function OfficerDashboard() {
  const { profile, logout } = useAuth();
  const [bins, setBins] = useState<WasteBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const now = useCurrentTime();
  const hasValidCoordinates = (bin: WasteBin) =>
    Number.isFinite(bin.lat) && Number.isFinite(bin.lng);

  useEffect(() => {
    const unsubscribe = subscribeBins(
      (nextBins) => {
        setBins(nextBins);
        setLoading(false);
      },
      (nextError) => {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Gagal memuat data tong realtime.",
        );
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const sortedBins = [...bins].sort(
    (left, right) =>
      statusOrder.indexOf(left.status) - statusOrder.indexOf(right.status),
  );
  const urgentBins = sortedBins.filter((bin) => bin.status === "penuh").length;
  const onWatchBins = sortedBins.filter((bin) => bin.status === "setengah").length;
  const readyBins = sortedBins.filter((bin) => bin.status === "kosong").length;
  const offlineSensors = sortedBins.filter(
    (bin) => !getSensorActivity(bin.lastUpdate, now).isOnline,
  ).length;
  const nearestAction = sortedBins[0];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <header className="hero-grid glass-panel rounded-[2.2rem] border border-line p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-brand">
              Eco-Smart Bin Grid
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-brand-strong">
              Panel petugas untuk tindak lanjut lapangan
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground/70">
              Dikembangkan oleh SMK Industri Penerbangan Cakra Nusantara untuk
              membantu petugas melihat prioritas angkut, kondisi tong, dan arah
              titik lapangan secara real-time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-brand-strong"
            >
              Buka Dashboard Admin
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Perlu Angkut"
            value={`${urgentBins}`}
            detail="Tong yang sebaiknya didatangi lebih dulu."
            accent="danger"
          />
          <StatCard
            label="Perlu Dipantau"
            value={`${onWatchBins}`}
            detail="Cocok dimasukkan ke putaran rute berikutnya."
            accent="warning"
          />
          <StatCard
            label="Sudah Aman"
            value={`${readyBins}`}
            detail="Status kosong atau rendah untuk saat ini."
            accent="brand"
          />
          <StatCard
            label="Tujuan Awal"
            value={nearestAction ? nearestAction.code : "-"}
            detail={
              nearestAction ? nearestAction.locationName : "Belum ada data tong."
            }
            accent="neutral"
          />
          <StatCard
            label="Sensor Offline"
            value={`${offlineSensors}`}
            detail="Tetap pakai data terakhir, tapi perangkat belum update."
            accent="danger"
          />
        </div>
      </header>

      {error ? (
        <div className="rounded-[1.5rem] border border-danger/20 bg-danger/10 px-5 py-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-[1.75rem] border border-line p-4 shadow-sm">
          <div className="mb-4 px-2">
            <h2 className="text-xl font-semibold text-brand-strong">
              Peta Navigasi Tong
            </h2>
            <p className="text-sm text-foreground/65">
              Klik marker lalu pilih `Buka Arah` untuk langsung membuka panduan
              perjalanan. Status tong akan ikut bergerak saat data RTDB berubah.
            </p>
          </div>
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center text-sm text-foreground/60">
              Memuat peta...
            </div>
          ) : (
            <BinMap bins={sortedBins} showDirection />
          )}
        </div>

        <div className="glass-panel rounded-[1.75rem] border border-line p-6 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-brand-strong">
                Prioritas Angkut
              </h2>
              <p className="mt-2 text-sm text-foreground/65">
                Urutan sudah disusun dari status paling mendesak ke yang paling
                aman.
              </p>
            </div>
            <div className="rounded-full border border-line bg-white px-4 py-2 text-sm text-foreground/60">
              {loading ? "Memuat..." : `${sortedBins.length} titik`}
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {sortedBins.map((bin) => (
              <article
                key={bin.id}
                className="rounded-[1.5rem] border border-line bg-white p-4 shadow-[0_12px_26px_rgba(38,40,30,0.05)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-strong">
                      {bin.locationName}
                    </p>
                    <p className="text-sm text-foreground/60">{bin.address}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <SensorActivityBadge lastUpdate={bin.lastUpdate} now={now} />
                    <StatusBadge status={bin.status} />
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-foreground/72">
                  <p>Kode tong: {bin.code}</p>
                  <p>Kapasitas: {bin.fillPercent}%</p>
                  <p>Pembaruan terakhir: {formatDateTime(bin.lastUpdate)}</p>
                  <p>{formatSensorLastSeen(bin.lastUpdate, now)}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {hasValidCoordinates(bin) ? (
                    <Link
                      href={`https://www.google.com/maps/dir/?api=1&destination=${bin.lat},${bin.lng}`}
                      target="_blank"
                      className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white"
                    >
                      Tunjukkan Arah
                    </Link>
                  ) : (
                    <span className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-foreground/55">
                      Titik peta belum diatur
                    </span>
                  )}
                  <span className="rounded-full border border-line px-4 py-2 text-sm text-foreground/65">
                    {bin.note}
                  </span>
                </div>
              </article>
            ))}
            {!sortedBins.length ? (
              <p className="rounded-[1.5rem] border border-line bg-white p-5 text-sm text-foreground/60">
                Belum ada tong di Firestore.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
