"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BinMap } from "@/components/bin-map";
import { useAuth } from "@/components/providers/auth-provider";
import { SensorActivityBadge } from "@/components/sensor-activity-badge";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { firebaseAuth } from "@/lib/firebase";
import { deriveBinStatusFromFillPercent } from "@/lib/bin-status";
import { formatDateTime } from "@/lib/format";
import { createPublicReport, findUserByUsername, subscribeBins } from "@/lib/firestore";
import { formatSensorLastSeen, getSensorActivity } from "@/lib/sensor-health";
import { useCurrentTime } from "@/hooks/use-current-time";
import type { WasteBin } from "@/types/domain";

type ReportForm = {
  reporterName: string;
  phone: string;
  binId: string;
  locationName: string;
  details: string;
};

const initialReportForm: ReportForm = {
  reporterName: "",
  phone: "",
  binId: "",
  locationName: "",
  details: "",
};
const GUEST_USERNAME = process.env.NEXT_PUBLIC_GUEST_USERNAME ?? "tamu";
const GUEST_PASSWORD = process.env.NEXT_PUBLIC_GUEST_PASSWORD ?? "123456";
const GUEST_EMAIL = process.env.NEXT_PUBLIC_GUEST_EMAIL ?? "";

export function PublicMonitoringPage() {
  const { profile, logout, authUser } = useAuth();
  const [bins, setBins] = useState<WasteBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportForm, setReportForm] = useState<ReportForm>(initialReportForm);
  const now = useCurrentTime();

  useEffect(() => {
    let active = true;
    let fallbackUnsubscribe: (() => void) | null = null;

    async function loadPublicBins() {
      try {
        const response = await fetch("/api/public-bins", {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          ok: boolean;
          message?: string;
          data?: WasteBin[];
        };

        if (!response.ok || !result.ok || !result.data) {
          throw new Error(result.message || "Gagal memuat data tong publik.");
        }

        if (!active) {
          return;
        }

        setBins(result.data);
        setError("");
      } catch (nextError) {
        if (!active) {
          return;
        }

        const message =
          nextError instanceof Error
            ? nextError.message
            : "Gagal memuat data tong publik.";

        if (message.includes("Firebase Admin belum dikonfigurasi")) {
          setError("");

          fallbackUnsubscribe?.();
          fallbackUnsubscribe = subscribeBins(
            (nextBins) => {
              if (!active) {
                return;
              }

              setBins(nextBins);
              setLoading(false);
            },
            (fallbackError) => {
              if (!active) {
                return;
              }

              setError(
                fallbackError instanceof Error
                  ? fallbackError.message
                  : "Gagal memuat data tong publik.",
              );
            },
          );

          return;
        }

        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPublicBins();
    const interval = window.setInterval(() => {
      void loadPublicBins();
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
      fallbackUnsubscribe?.();
    };
  }, []);

  const normalizedBins = bins.map((bin) => ({
    ...bin,
    status: deriveBinStatusFromFillPercent(bin.fillPercent),
  }));

  const fullBins = normalizedBins.filter((bin) => bin.status === "penuh").length;
  const warningBins = normalizedBins.filter(
    (bin) => bin.status === "setengah",
  ).length;
  const emptyBins = normalizedBins.filter((bin) => bin.status === "kosong").length;
  const offlineSensors = normalizedBins.filter(
    (bin) => !getSensorActivity(bin.lastUpdate, now).isOnline,
  ).length;
  const averageFill = bins.length
    ? Math.round(
        bins.reduce((total, bin) => total + bin.fillPercent, 0) / bins.length,
      )
    : 0;
  const highlightedBins = [...normalizedBins]
    .sort((left, right) => right.fillPercent - left.fillPercent)
    .slice(0, 6);

  async function submitReportFromClient() {
    if (!firebaseAuth) {
      throw new Error("Firebase Auth belum dikonfigurasi untuk laporan publik.");
    }

    if (!authUser && !firebaseAuth.currentUser) {
      const guestAccount = await findUserByUsername(GUEST_USERNAME).catch(() => null);
      const guestEmail = guestAccount?.email || GUEST_EMAIL;

      if (!guestEmail) {
        throw new Error(
          "Akun publik Firebase belum bisa dipakai. Isi NEXT_PUBLIC_GUEST_EMAIL atau pastikan user tamu ada di koleksi users.",
        );
      }

      await signInWithEmailAndPassword(firebaseAuth, guestEmail, GUEST_PASSWORD);
    }

    await createPublicReport(reportForm);
  }

  async function handleSubmitReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setReportError("");
    setReportMessage("");

    try {
      const response = await fetch("/api/public-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reportForm),
      });

      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Laporan gagal dikirim.");
      }

      setReportMessage(
        result.message || "Laporan berhasil dikirim. Tim akan menindaklanjuti.",
      );
      setReportForm(initialReportForm);
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Laporan gagal dikirim.";

      if (message.includes("Firebase Admin belum dikonfigurasi")) {
        try {
          await submitReportFromClient();
          setReportMessage("Laporan berhasil dikirim. Terima kasih sudah membantu monitoring.");
          setReportForm(initialReportForm);
          return;
        } catch (fallbackError) {
          setReportError(
            fallbackError instanceof Error
              ? fallbackError.message
              : "Laporan gagal dikirim.",
          );
          return;
        }
      }

      setReportError(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
      <section className="hero-grid glass-panel rounded-[2.4rem] border border-line p-8 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-brand">
              Eco-Smart Bin Grid
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-brand-strong md:text-5xl">
              Monitoring publik untuk sistem tempat sampah pintar
            </h1>
            <p className="mt-4 text-sm leading-7 text-foreground/70 md:text-base">
              Sistem berbasis Internet of Things (IoT) dengan energi surya,
              sanitasi otomatis, dan pemantauan web real-time yang
              dikembangkan oleh SMK Industri Penerbangan Cakra Nusantara.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {profile?.role === "tamu" ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
              >
                Logout Tamu
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
              >
                Masuk Admin/Petugas
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Tong"
            value={`${bins.length}`}
            detail="Titik yang terlihat oleh masyarakat saat ini."
            accent="neutral"
          />
          <StatCard
            label="Tong Penuh"
            value={`${fullBins}`}
            detail="Perlu diprioritaskan untuk diangkut."
            accent="danger"
          />
          <StatCard
            label="Perlu Dipantau"
            value={`${warningBins}`}
            detail="Sedang menuju penuh dan perlu perhatian."
            accent="warning"
          />
          <StatCard
            label="Rata-rata Isi"
            value={`${averageFill}%`}
            detail={`${emptyBins} tong masih tergolong kosong atau aman.`}
            accent="brand"
          />
          <StatCard
            label="Sensor Offline"
            value={`${offlineSensors}`}
            detail="Data terakhir masih tampil, tapi perangkat sedang diam."
            accent="danger"
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-[1.5rem] border border-danger/20 bg-danger/10 px-5 py-4 text-sm text-danger">
          {error}
        </div>
      ) : null}
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
          <div className="mb-5">
            <p className="text-sm uppercase tracking-[0.2em] text-brand">
              Peta Sebaran
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-brand-strong">
              Lokasi tong yang sedang dipantau
            </h2>
            <p className="mt-2 text-sm leading-7 text-foreground/65">
              Peta langsung fokus ke titik tong yang aktif supaya warga bisa
              cepat melihat area terdekat.
            </p>
          </div>
          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[1.75rem] border border-line bg-white text-sm text-foreground/60">
              Memuat peta...
            </div>
          ) : (
            <BinMap bins={normalizedBins} />
          )}
        </div>

        <div className="space-y-6">
          <section className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
            <div className="mb-5">
              <p className="text-sm uppercase tracking-[0.2em] text-brand">
                Kondisi Tong
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-brand-strong">
                Status terbaru yang bisa dilihat warga
              </h2>
            </div>
            <div className="space-y-4">
              {highlightedBins.map((bin) => (
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
                    <p>Persentase isi: {bin.fillPercent}%</p>
                    <p>Pembaruan terakhir: {formatDateTime(bin.lastUpdate)}</p>
                    <p>{formatSensorLastSeen(bin.lastUpdate, now)}</p>
                    <p>{bin.note}</p>
                  </div>
                </article>
              ))}
              {!highlightedBins.length ? (
                <div className="rounded-[1.5rem] border border-line bg-white p-5 text-sm text-foreground/60">
                  Belum ada data tong untuk ditampilkan ke publik.
                </div>
              ) : null}
            </div>
          </section>

          <section className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
            <div className="mb-5">
              <p className="text-sm uppercase tracking-[0.2em] text-brand">
                Pelaporan
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-brand-strong">
                Laporkan sampah yang belum diambil
              </h2>
              <p className="mt-2 text-sm leading-7 text-foreground/65">
                Isi lokasi atau pilih tong yang ingin dilaporkan. Laporan ini
                bisa dikirim tanpa login.
              </p>
            </div>

            {reportError ? (
              <div className="mb-4 rounded-[1.25rem] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
                {reportError}
              </div>
            ) : null}
            {reportMessage ? (
              <div className="mb-4 rounded-[1.25rem] border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand-strong">
                {reportMessage}
              </div>
            ) : null}

            <form onSubmit={handleSubmitReport} className="grid gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-brand-strong">
                  Nama pelapor
                </span>
                <input
                  value={reportForm.reporterName}
                  onChange={(event) =>
                    setReportForm((prev) => ({
                      ...prev,
                      reporterName: event.target.value,
                    }))
                  }
                  placeholder="Boleh dikosongkan jika anonim"
                  className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-brand-strong">
                  Nomor kontak
                </span>
                <input
                  value={reportForm.phone}
                  onChange={(event) =>
                    setReportForm((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="Nomor WA atau telepon jika ingin dihubungi"
                  className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-brand-strong">
                  Pilih tong
                </span>
                <select
                  value={reportForm.binId}
                  onChange={(event) => {
                    const selectedBin = bins.find((bin) => bin.id === event.target.value);
                    setReportForm((prev) => ({
                      ...prev,
                      binId: event.target.value,
                      locationName: selectedBin?.locationName ?? prev.locationName,
                    }));
                  }}
                  className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="">Pilih tong jika sudah tersedia</option>
                  {bins.map((bin) => (
                  <option key={bin.id} value={bin.id}>
                    {bin.locationName} - {bin.area}
                  </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-brand-strong">
                  Lokasi laporan
                </span>
                <input
                  value={reportForm.locationName}
                  onChange={(event) =>
                    setReportForm((prev) => ({
                      ...prev,
                      locationName: event.target.value,
                    }))
                  }
                  placeholder="Nama lokasi atau titik tong yang dilaporkan"
                  className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-brand-strong">
                  Isi laporan
                </span>
                <textarea
                  value={reportForm.details}
                  onChange={(event) =>
                    setReportForm((prev) => ({
                      ...prev,
                      details: event.target.value,
                    }))
                  }
                  placeholder="Contoh: tong sudah penuh sejak kemarin dan sampah belum diangkut"
                  rows={4}
                  className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={sending}
                className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {sending ? "Mengirim laporan..." : "Kirim Laporan"}
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}
