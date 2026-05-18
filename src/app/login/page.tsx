import { LoginForm } from "@/components/login-form";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-10 md:px-10 xl:px-12">
      <section className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="hero-grid fade-up relative overflow-hidden rounded-[2.4rem] border border-[#245542]/14 bg-brand-strong p-8 text-white shadow-[0_32px_80px_rgba(18,63,49,0.18)] md:p-10">
          <div className="absolute inset-y-0 right-0 w-40 bg-linear-to-l from-[#f0d598]/14 to-transparent" />
          <p className="relative text-sm uppercase tracking-[0.24em] text-white/68">
            Akses Cepat
          </p>
          <h1 className="relative mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            Mulai kerja dari informasi yang paling perlu ditindaklanjuti.
          </h1>
          <p className="relative mt-5 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
            Setelah login, admin bisa memantau alarm kepenuhan dan mengatur data operasional. Petugas bisa langsung melihat tong prioritas serta arah menuju titik angkut.
          </p>
          <div className="relative mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/60">Admin</p>
              <p className="mt-2 text-sm text-white/82">Pantau dashboard, pengguna, dan data tong dalam satu alur.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/60">Petugas</p>
              <p className="mt-2 text-sm text-white/82">Buka rute lapangan dan cek titik mana yang harus didahulukan.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/60">Sensor</p>
              <p className="mt-2 text-sm text-white/82">Lihat pembaruan status tanpa perlu membuka banyak menu.</p>
            </div>
          </div>
          <div className="relative mt-8 rounded-[1.5rem] border border-white/14 bg-white/8 p-5 text-sm">
            <p className="font-semibold">Kesiapan Data</p>
            <p className="mt-2 text-white/78">
              {isFirebaseConfigured
                ? "Koneksi Firebase terdeteksi. Data kerja akan diambil dari Realtime Database dan Firestore."
                : "Firebase belum aktif penuh. Aplikasi akan tetap menampilkan data contoh agar alur halaman bisa dicek."}
            </p>
          </div>
        </div>

        <div className="fade-up flex items-center">
          <div className="w-full">
            <div className="mb-5 px-1">
              <p className="text-sm uppercase tracking-[0.2em] text-brand">Login</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-strong">
                Masuk dan lanjutkan tugas hari ini
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-foreground/70">
                Gunakan akun yang sudah dibuat admin untuk membuka panel yang sesuai dengan peran Anda.
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
