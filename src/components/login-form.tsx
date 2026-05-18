"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { isFirebaseConfigured } from "@/lib/firebase";

export function LoginForm() {
  const router = useRouter();
  const { signIn, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!isFirebaseConfigured) {
      setError("Firebase belum dikonfigurasi penuh.");
      return;
    }

    try {
      const profile = await signIn(username, password);
      router.push(profile?.role === "petugas" ? "/petugas" : "/admin");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Login gagal diproses.",
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel grid gap-5 rounded-[2rem] border border-line p-6 shadow-sm md:p-8"
    >
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-strong">Username</label>
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Masukkan username"
          className="w-full rounded-[1.2rem] border border-line bg-white/90 px-4 py-3.5 outline-none focus:border-brand focus:bg-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-brand-strong">Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Masukkan password"
          className="w-full rounded-[1.2rem] border border-line bg-white/90 px-4 py-3.5 outline-none focus:border-brand focus:bg-white"
        />
      </div>

      {error ? (
        <p className="rounded-[1.2rem] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="rounded-[1.2rem] border border-brand/10 bg-brand/6 px-4 py-3 text-sm text-foreground/72">
        Masuk untuk melihat prioritas tong, pembaruan sensor terakhir, dan tindakan lapangan yang perlu dikerjakan hari ini.
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-1 rounded-full bg-brand px-5 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong disabled:hover:translate-y-0"
      >
        {loading ? "Memproses..." : "Masuk ke Sistem"}
      </button>
    </form>
  );
}
