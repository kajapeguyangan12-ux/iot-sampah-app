"use client";

import { useEffect, useState } from "react";

import { formatDateTime } from "@/lib/format";
import { getPublicReports, updatePublicReportStatus } from "@/lib/firestore";
import type { PublicReport, PublicReportStatus } from "@/types/domain";

const statusTone: Record<PublicReportStatus, string> = {
  baru: "bg-danger/10 border-danger/20 text-danger",
  diproses: "bg-warning/20 border-warning/30 text-brand-strong",
  selesai: "bg-brand/10 border-brand/20 text-brand",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const nextReports = await getPublicReports();
      setReports(nextReports);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Gagal memuat laporan masyarakat.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(
    reportId: string,
    status: PublicReportStatus,
  ) {
    setUpdatingId(reportId);
    setError("");

    try {
      await updatePublicReportStatus(reportId, status);
      await loadReports();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Gagal memperbarui status laporan.",
      );
    } finally {
      setUpdatingId("");
    }
  }

  const newReports = reports.filter((report) => report.status === "baru").length;
  const processingReports = reports.filter(
    (report) => report.status === "diproses",
  ).length;
  const completedReports = reports.filter(
    (report) => report.status === "selesai",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-[1.5rem] border border-danger/20 bg-danger/10 px-5 py-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="glass-panel hero-grid rounded-[2.2rem] border border-line p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-brand">
          Laporan Masuk
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-strong">
          Tindak lanjuti laporan masyarakat dari mode tamu
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground/70">
          Semua laporan yang dikirim warga dari halaman publik akan masuk ke
          sini. Admin bisa mengecek lokasi, isi laporan, lalu menandai proses
          penanganannya.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.75rem] border border-line bg-white p-5">
            <p className="text-sm uppercase tracking-[0.16em] text-foreground/58">
              Total Laporan
            </p>
            <p className="mt-2 text-3xl font-semibold text-brand-strong">
              {reports.length}
            </p>
          </article>
          <article className="rounded-[1.75rem] border border-line bg-white p-5">
            <p className="text-sm uppercase tracking-[0.16em] text-foreground/58">
              Baru
            </p>
            <p className="mt-2 text-3xl font-semibold text-danger">
              {newReports}
            </p>
          </article>
          <article className="rounded-[1.75rem] border border-line bg-white p-5">
            <p className="text-sm uppercase tracking-[0.16em] text-foreground/58">
              Diproses
            </p>
            <p className="mt-2 text-3xl font-semibold text-brand-strong">
              {processingReports}
            </p>
          </article>
          <article className="rounded-[1.75rem] border border-line bg-white p-5">
            <p className="text-sm uppercase tracking-[0.16em] text-foreground/58">
              Selesai
            </p>
            <p className="mt-2 text-3xl font-semibold text-brand">
              {completedReports}
            </p>
          </article>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-brand-strong">
            Daftar Laporan Publik
          </h3>
          <div className="text-sm text-foreground/60">
            {loading ? "Memuat..." : `${reports.length} laporan`}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {reports.map((report) => (
            <article
              key={report.id}
              className="rounded-[1.5rem] border border-line bg-white p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="text-lg font-semibold text-brand-strong">
                      {report.locationName}
                    </h4>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusTone[report.status]}`}
                    >
                      {report.status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/65">
                    Dikirim: {formatDateTime(report.submittedAt)}
                  </p>
                  <p className="text-sm text-foreground/65">
                    Pelapor: {report.reporterName || "Anonim"}
                  </p>
                  <p className="text-sm text-foreground/65">
                    Kontak: {report.phone || "-"}
                  </p>
                  <p className="text-sm text-foreground/65">
                    Tong terkait: {report.binId || "-"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleUpdateStatus(report.id, "baru")}
                    disabled={updatingId === report.id}
                    className="rounded-full border border-line px-3 py-2 text-xs"
                  >
                    Tandai Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUpdateStatus(report.id, "diproses")}
                    disabled={updatingId === report.id}
                    className="rounded-full border border-line px-3 py-2 text-xs"
                  >
                    Proses
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUpdateStatus(report.id, "selesai")}
                    disabled={updatingId === report.id}
                    className="rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Selesai
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-line bg-surface px-4 py-4 text-sm text-foreground/75">
                {report.details}
              </div>
            </article>
          ))}

          {!loading && !reports.length ? (
            <div className="rounded-[1.5rem] border border-line bg-white p-5 text-sm text-foreground/60">
              Belum ada laporan dari masyarakat.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
