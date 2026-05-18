"use client";

import { useEffect, useState } from "react";

import {
  createManagedUser,
  getUsers,
  updateUsername,
  updateUserRole,
} from "@/lib/firestore";
import type { AppUser } from "@/types/domain";

const initialUserForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  area: "",
  role: "petugas" as AppUser["role"],
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [usernameDrafts, setUsernameDrafts] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingUsernameId, setSavingUsernameId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const nextUsers = await getUsers();
      setUsers(nextUsers);
      setUsernameDrafts(
        Object.fromEntries(nextUsers.map((user) => [user.id, user.username])),
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Gagal memuat data pengguna.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createManagedUser(userForm);
      setUserForm(initialUserForm);
      await loadUsers();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Gagal membuat akun user.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(uid: string, role: AppUser["role"]) {
    try {
      await updateUserRole(uid, role);
      await loadUsers();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Gagal mengubah role user.",
      );
    }
  }

  async function handleUsernameSave(uid: string) {
    setSavingUsernameId(uid);
    setError("");

    try {
      await updateUsername(uid, usernameDrafts[uid] ?? "");
      await loadUsers();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Gagal mengubah username.",
      );
    } finally {
      setSavingUsernameId("");
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
          Kelola Pengguna
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-brand-strong">
          Jaga akses tim tetap ringkas dan tepat sasaran
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground/70">
          Tambahkan akun baru saat ada pergantian petugas, sesuaikan area kerja,
          lalu cek kembali username agar setiap orang bisa masuk tanpa hambatan.
        </p>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <div className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
          <h3 className="text-xl font-semibold text-brand-strong">
            Buat Akun User
          </h3>
          <p className="mt-2 text-sm text-foreground/65">
            Isi data seperlunya agar user langsung bisa bekerja dari halaman
            yang sesuai dengan rolenya.
          </p>
          <form
            onSubmit={handleCreateUser}
            className="mt-5 grid gap-3 md:grid-cols-2"
          >
            <input
              value={userForm.name}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Nama user"
              className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none md:col-span-2"
            />
            <input
              value={userForm.username}
              onChange={(event) =>
                setUserForm((prev) => ({
                  ...prev,
                  username: event.target.value,
                }))
              }
              placeholder="Username login"
              className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
            />
            <input
              value={userForm.email}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="Email user"
              className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
            />
            <input
              value={userForm.password}
              onChange={(event) =>
                setUserForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              placeholder="Password awal"
              type="password"
              className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
            />
            <input
              value={userForm.area}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, area: event.target.value }))
              }
              placeholder="Area tugas"
              className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
            />
            <select
              value={userForm.role}
              onChange={(event) =>
                setUserForm((prev) => ({
                  ...prev,
                  role: event.target.value as AppUser["role"],
                }))
              }
              className="rounded-[1.2rem] border border-line bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="admin">admin</option>
              <option value="petugas">petugas</option>
            </select>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white"
            >
              {saving ? "Membuat akun..." : "Buat Akun User"}
            </button>
          </form>
        </div>

        <div className="glass-panel rounded-[2rem] border border-line p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-brand-strong">
              Daftar Pengguna
            </h3>
            <div className="text-sm text-foreground/60">
              {loading ? "Memuat..." : `${users.length} pengguna`}
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-foreground/60">
                <tr>
                  <th className="pb-3 font-medium">Nama</th>
                  <th className="pb-3 font-medium">Username</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Area</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-line">
                    <td className="py-3">{user.name}</td>
                    <td className="py-3">
                      <div className="flex min-w-[220px] items-center gap-2">
                        <input
                          value={usernameDrafts[user.id] ?? ""}
                          onChange={(event) =>
                            setUsernameDrafts((prev) => ({
                              ...prev,
                              [user.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-full border border-line bg-white px-3 py-2 font-mono text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void handleUsernameSave(user.id)}
                          disabled={savingUsernameId === user.id}
                          className="rounded-full bg-brand px-3 py-2 text-xs font-semibold text-white"
                        >
                          {savingUsernameId === user.id ? "..." : "Simpan"}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 text-foreground/68">{user.email}</td>
                    <td className="py-3">
                      <select
                        value={user.role}
                        onChange={(event) =>
                          void handleRoleChange(
                            user.id,
                            event.target.value as AppUser["role"],
                          )
                        }
                        className="rounded-full border border-line bg-white px-3 py-2 text-xs uppercase"
                      >
                        <option value="admin">admin</option>
                        <option value="petugas">petugas</option>
                      </select>
                    </td>
                    <td className="py-3">{user.area}</td>
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
