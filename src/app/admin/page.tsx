"use client";

import { useEffect, useState } from "react";

import { BinMap } from "@/components/bin-map";
import { SensorActivityBadge } from "@/components/sensor-activity-badge";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { useCurrentTime } from "@/hooks/use-current-time";
import { formatDateTime } from "@/lib/format";
import { getUsers, subscribeBins, subscribeSensorLogs } from "@/lib/firestore";
import { formatSensorLastSeen, getSensorActivity } from "@/lib/sensor-health";
import type { AppUser, SensorLog, WasteBin } from "@/types/domain";

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [bins, setBins] = useState<WasteBin[]>([]);
  const [logs, setLogs] = useState<SensorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const now = useCurrentTime();

  useEffect(() => {
    let active = true;

    void getUsers()
      .then((nextUsers) => {
        if (!active) {
          return;
        }

        setUsers(nextUsers);
      })
      .catch((nextError) => {
        if (!active) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Gagal memuat data pengguna.",
        );
      });

    const unsubscribeBins = subscribeBins(
      (nextBins) => {
        if (!active) {
          return;
        }

        setBins(nextBins);
        setLoading(false);
      },
      (nextError) => {
        if (!active) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Gagal memuat data tong realtime.",
        );
        setLoading(false);
      },
    );

    const unsubscribeLogs = subscribeSensorLogs(
      (nextLogs) => {
        if (!active) {
          return;
        }

        setLogs(nextLogs);
      },
      (nextError) => {
        if (!active) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Gagal memuat log sensor realtime.",
        );
      },
    );

    return () => {
      active = false;
      unsubscribeBins();
      unsubscribeLogs();
    };
  }, []);

  const fullBins = bins.filter((bin) => bin.status === "penuh").length;
  const warningBins = bins.filter((bin) => bin.status === "setengah").length;
  const offlineSensors = bins.filter(
    (bin) => !getSensorActivity(bin.lastUpdate, now).isOnline,
  ).length;
  const priorityBins = [...bins]
    .sort((left, right) => right.fillPercent - left.fillPercent)
    .slice(0, 4);
  const areaSummary = Object.entries(
    bins.reduce<Record<string, number>>((carry, bin) => {
      carry[bin.area] = (carry[bin.area] ?? 0) + 1;
      return carry;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-[1.5rem] border border-danger/20 bg-danger/10 px-5 py-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="glass-panel hero-grid rounded-[2.2rem] border border-line p-6 md:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-brand">
              Eco-Smart Bin Grid
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-strong">
              Dashboard monitoring real-time untuk tim admin
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground/70">
              Sistem tempat sampah pintar berbasis Internet of Things (IoT)
              dengan energi surya, sanitasi otomatis, dan pemantauan berbasis
              web oleh SMK Industri Penerbangan Cakra Nusantara.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          <StatCard
            label="Total Tong"
            value={`${bins.length}`}
            detail="Titik aktif yang sedang dipantau."
            accent="brand"
          />
          <StatCard
            label="Tong Penuh"
            value={`${fullBins}`}
            detail="Perlu dijadwalkan ke rute angkut terdekat."
            accent="danger"
          />
          <StatCard
            label="Tong Waspada"
            value={`${warningBins}`}
            detail="Pantau sebelum berpindah ke status penuh."
            accent="warning"
          />
          <StatCard
            label="Pengguna Aktif"
            value={`${users.length}`}
            detail="Akun admin dan petugas yang tercatat."
            accent="neutral"
          />
          <StatCard
            label="Sensor Offline"
            value={`${offlineSensors}`}
            detail="Masih tampilkan data terakhir, tapi sensor tidak update."
            accent="danger"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.2em] text-brand">
              Peta Sebaran
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-brand-strong">
              Lihat titik yang butuh perhatian lebih dulu
            </h2>
            <p className="mt-2 text-sm leading-7 text-foreground/65">
              Fokuskan keputusan ke marker merah dan kuning untuk menjaga area
              tetap tertangani.
            </p>
          </div>
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[1.75rem] border border-line bg-white text-sm text-foreground/60">
              Memuat peta...
            </div>
          ) : (
            <BinMap bins={bins} />
          )}
        </div>

        <div className="space-y-6">
          <section className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
            <div className="mb-5">
              <p className="text-sm uppercase tracking-[0.2em] text-brand">
                Prioritas
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-brand-strong">
                Daftar tindak lanjut tercepat
              </h2>
              <p className="mt-2 text-sm leading-7 text-foreground/65">
                Susun rute atau penugasan berdasarkan kapasitas tertinggi saat
                ini.
              </p>
            </div>
            <div className="space-y-4">
              {priorityBins.map((bin) => (
                <article
                  key={bin.id}
                  className="rounded-[1.5rem] border border-line bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-strong">
                        {bin.locationName}
                      </p>
                      <p className="text-sm text-foreground/60">{bin.area}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <SensorActivityBadge lastUpdate={bin.lastUpdate} now={now} />
                      <StatusBadge status={bin.status} />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-foreground/72">
                    <p>Kapasitas saat ini: {bin.fillPercent}%</p>
                    <p>Pembaruan terakhir: {formatDateTime(bin.lastUpdate)}</p>
                    <p>{formatSensorLastSeen(bin.lastUpdate, now)}</p>
                    <p>{bin.note}</p>
                  </div>
                </article>
              ))}
              {!priorityBins.length ? (
                <div className="rounded-[1.5rem] border border-line bg-white p-5 text-sm text-foreground/60">
                  Belum ada data tong untuk disusun prioritasnya.
                </div>
              ) : null}
            </div>
          </section>

          <section className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
            <div className="mb-5">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-brand">
                  Area
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-brand-strong">
                  Sebaran tong per wilayah
                </h2>
              </div>
            </div>
            <div className="space-y-3">
              {areaSummary.map(([area, count]) => (
                <div
                  key={area}
                  className="rounded-[1.4rem] border border-line bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-brand-strong">{area}</p>
                    <span className="text-sm text-foreground/60">
                      {count} tong
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[#eee5d4]">
                    <div
                      className="h-2 rounded-full bg-brand"
                      style={{
                        width: `${Math.max(
                          14,
                          Math.min(
                            100,
                            Math.round((count / Math.max(bins.length, 1)) * 100),
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              {!areaSummary.length ? (
                <div className="rounded-[1.5rem] border border-line bg-white p-5 text-sm text-foreground/60">
                  Sebaran area belum tersedia.
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
        <div className="mb-5">
          <p className="text-sm uppercase tracking-[0.2em] text-brand">
            Monitoring
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-brand-strong">
            Pembaruan sensor terakhir
          </h2>
          <p className="mt-2 text-sm leading-7 text-foreground/65">
            Cek data terbaru untuk memastikan status lapangan yang tampil masih
            relevan.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {logs.slice(0, 6).map((log) => (
            <article
              key={log.id}
              className="rounded-[1.5rem] border border-line bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-strong">
                    {log.deviceId}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {formatDateTime(log.recordedAt)}
                  </p>
                </div>
                <StatusBadge status={log.status} />
              </div>
              <p className="mt-3 text-sm text-foreground/70">
                Tong {log.binId} melaporkan kapasitas {log.fillPercent}%.
              </p>
            </article>
          ))}
          {!logs.length ? (
            <div className="rounded-[1.5rem] border border-line bg-white p-5 text-sm text-foreground/60">
              Belum ada log sensor di Firestore.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
