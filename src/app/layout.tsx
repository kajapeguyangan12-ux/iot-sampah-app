import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem IoT Sampah",
  description: "Panel kerja admin dan petugas untuk memantau kepenuhan tong, mengatur akun, dan menindaklanjuti rute angkut.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col text-[15px] leading-relaxed">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
