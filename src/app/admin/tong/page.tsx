"use client";

import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import {
  deriveBinStatusFromFillPercent,
  getBinStatusLabel,
} from "@/lib/bin-status";
import {
  createBin,
  deleteBin,
  getBins,
  updateBin,
  updateBinRealtimeMapping,
} from "@/lib/firestore";
import type { BinStatus, WasteBin } from "@/types/domain";

const initialForm = {
  code: "",
  locationName: "",
  address: "",
  area: "",
  lat: "",
  lng: "",
  deviceId: "",
  realtimeKey: "",
  status: "kosong" as BinStatus,
  fillPercent: "0",
  note: "",
};

export default function AdminBinsPage() {
  const [bins, setBins] = useState<WasteBin[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingBinId, setEditingBinId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mappingSavingId, setMappingSavingId] = useState("");
  const [error, setError] = useState("");
  const [mappingDrafts, setMappingDrafts] = useState<
    Record<string, { deviceId: string; realtimeKey: string }>
  >({});
  const derivedFormStatus = deriveBinStatusFromFillPercent(
    Number(form.fillPercent) || 0,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBins();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function loadBins() {
    setLoading(true);
    setError("");

    try {
      const nextBins = await getBins();
      setBins(nextBins);
      setMappingDrafts((prev) => {
        const nextDrafts = { ...prev };

        for (const bin of nextBins) {
          nextDrafts[bin.id] ??= {
            deviceId: bin.deviceId,
            realtimeKey: bin.realtimeKey ?? "",
          };
        }

        return nextDrafts;
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Gagal memuat data tong.",
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingBinId("");
  }

  function handleStartEdit(bin: WasteBin) {
    setEditingBinId(bin.id);
    setForm({
      code: bin.code,
      locationName: bin.locationName,
      address: bin.address,
      area: bin.area,
      lat: `${bin.lat}`,
      lng: `${bin.lng}`,
      deviceId: bin.deviceId,
      realtimeKey: bin.realtimeKey ?? "",
      status: bin.status,
      fillPercent: `${bin.fillPercent}`,
      note: bin.note,
    });
  }

  async function handleSubmitBin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      code: form.code,
      locationName: form.locationName,
      address: form.address,
      area: form.area,
      lat: Number(form.lat),
      lng: Number(form.lng),
      deviceId: form.deviceId,
      realtimeKey: form.realtimeKey || undefined,
      status: derivedFormStatus,
      fillPercent: Number(form.fillPercent),
      note: form.note,
    };

    try {
      if (editingBinId) {
        await updateBin(editingBinId, payload);
      } else {
        await createBin(payload);
      }

      resetForm();
      await loadBins();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : editingBinId
            ? "Gagal mengubah data tong."
            : "Gagal menambah tong.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBin(binId: string) {
    try {
      await deleteBin(binId);
      if (editingBinId === binId) {
        resetForm();
      }
      await loadBins();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Gagal menghapus tong.",
      );
    }
  }

  async function handleSaveMapping(binId: string) {
    const draft = mappingDrafts[binId];

    if (!draft) {
      return;
    }

    setMappingSavingId(binId);
    setError("");

    try {
      await updateBinRealtimeMapping(binId, draft);
      await loadBins();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Gagal menyimpan mapping realtime.",
      );
    } finally {
      setMappingSavingId("");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-[1.5rem] border border-danger/20 bg-danger/10 px-5 py-4 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section className="glass-panel hero-grid rounded-[2.1rem] border border-line p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.2em] text-brand">
          Kelola Tong
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-strong">
          Rapikan titik angkut dan perangkat aktif
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground/70">
          Tambahkan lokasi baru, pasangkan device yang benar, lalu rapikan data
          tong saat ada perubahan di lapangan. Jika sensor menulis ke RTDB
          dengan key berbeda, simpan key itu pada `realtimeKey`.
        </p>
      </section>

      <section className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-brand-strong">
              {editingBinId ? "Edit Tong Sampah" : "Tambah Tong Sampah"}
            </h3>
            <p className="mt-2 text-sm text-foreground/65">
              Lengkapi data lokasi dengan teliti supaya petugas bisa langsung
              diarahkan ke titik yang benar. Idealnya `deviceId` sama dengan key
              RTDB. Kalau belum sama, isi `realtimeKey`.
            </p>
          </div>
          {editingBinId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-line px-4 py-2 text-sm text-foreground/70"
            >
              Batal Edit
            </button>
          ) : null}
        </div>
        <div className="mt-5 rounded-[1.5rem] border border-line bg-white p-5">
          <form
            onSubmit={handleSubmitBin}
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-brand-strong">Kode tong</span>
              <input
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value }))
                }
                placeholder="Contoh: TNG-001"
                className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-brand-strong">Device ID</span>
              <input
                value={form.deviceId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, deviceId: event.target.value }))
                }
                placeholder="ID perangkat sensor"
                className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-brand-strong">Realtime key</span>
              <input
                value={form.realtimeKey}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, realtimeKey: event.target.value }))
                }
                placeholder="Key node di RTDB jika berbeda dari Device ID"
                className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-brand-strong">Area</span>
              <input
                value={form.area}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, area: event.target.value }))
                }
                placeholder="Contoh: zona barat"
                className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-sm font-medium text-brand-strong">Nama lokasi</span>
              <input
                value={form.locationName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    locationName: event.target.value,
                  }))
                }
                placeholder="Nama titik tong di lapangan"
                className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-brand-strong">Status</span>
              <select
                value={derivedFormStatus}
                disabled
                className="rounded-[1.2rem] border border-line bg-surface px-4 py-3 text-sm text-foreground/70 outline-none disabled:opacity-100"
              >
                <option value={derivedFormStatus}>
                  Otomatis dari persentase isi: {getBinStatusLabel(derivedFormStatus)}
                </option>
              </select>
            </label>
            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-3">
              <span className="text-sm font-medium text-brand-strong">Alamat</span>
              <input
                value={form.address}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, address: event.target.value }))
                }
                placeholder="Alamat lengkap lokasi tong"
                className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-brand-strong">Latitude</span>
              <input
                value={form.lat}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lat: event.target.value }))
                }
                placeholder="Koordinat lintang"
                className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-brand-strong">Longitude</span>
              <input
                value={form.lng}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lng: event.target.value }))
                }
                placeholder="Koordinat bujur"
                className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-brand-strong">Persentase isi</span>
              <input
                value={form.fillPercent}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    fillPercent: event.target.value,
                  }))
                }
                placeholder="Isi tong 0 sampai 100"
                className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2 xl:col-span-2">
              <span className="text-sm font-medium text-brand-strong">Catatan petugas</span>
              <input
                value={form.note}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, note: event.target.value }))
                }
                placeholder="Keterangan tambahan tentang kondisi tong"
                className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
            >
              {saving
                ? "Menyimpan..."
                : editingBinId
                  ? "Simpan Perubahan"
                  : "Simpan Tong"}
            </button>
          </form>
        </div>
      </section>

      <section className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-brand-strong">
            Daftar Tong Sampah
          </h3>
          <div className="text-sm text-foreground/60">
            {loading ? "Memuat..." : `${bins.length} tong`}
          </div>
        </div>
        <div className="mt-5 rounded-[1.5rem] border border-line bg-white p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-foreground/60">
                <tr>
                  <th className="pb-3 font-medium">Tong</th>
                  <th className="pb-3 font-medium">Device</th>
                  <th className="pb-3 font-medium">RTDB Key</th>
                  <th className="pb-3 font-medium">Area</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {bins.map((bin) => (
                  <tr key={bin.id} className="border-t border-line align-top">
                    <td className="py-3">
                      <p className="font-medium">{bin.locationName}</p>
                      <p className="text-foreground/60">{bin.code}</p>
                    </td>
                    <td className="py-3">
                      <input
                        value={mappingDrafts[bin.id]?.deviceId ?? bin.deviceId}
                        onChange={(event) =>
                          setMappingDrafts((prev) => ({
                            ...prev,
                            [bin.id]: {
                              deviceId: event.target.value,
                              realtimeKey:
                                prev[bin.id]?.realtimeKey ?? bin.realtimeKey ?? "",
                            },
                          }))
                        }
                        className="w-full min-w-36 rounded-[1rem] border border-line bg-white px-3 py-2 font-mono text-xs outline-none"
                      />
                    </td>
                    <td className="py-3">
                      <input
                        value={mappingDrafts[bin.id]?.realtimeKey ?? bin.realtimeKey ?? ""}
                        onChange={(event) =>
                          setMappingDrafts((prev) => ({
                            ...prev,
                            [bin.id]: {
                              deviceId: prev[bin.id]?.deviceId ?? bin.deviceId,
                              realtimeKey: event.target.value,
                            },
                          }))
                        }
                        placeholder="contoh: tong_sampah_1"
                        className="w-full min-w-40 rounded-[1rem] border border-line bg-white px-3 py-2 font-mono text-xs outline-none"
                      />
                    </td>
                    <td className="py-3">{bin.area}</td>
                    <td className="py-3">
                      <StatusBadge status={bin.status} />
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSaveMapping(bin.id)}
                          disabled={mappingSavingId === bin.id}
                          className="rounded-full border border-line px-3 py-2 text-xs"
                        >
                          {mappingSavingId === bin.id ? "Menyimpan..." : "Simpan Link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(bin)}
                          className="rounded-full border border-line px-3 py-2 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteBin(bin.id)}
                          className="rounded-full border border-danger/20 px-3 py-2 text-xs text-danger"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
