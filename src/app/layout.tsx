import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eco-Smart Bin Grid",
  description:
    "Sistem tempat sampah pintar berbasis Internet of Things (IoT) dengan monitoring real-time, energi surya, dan sanitasi otomatis oleh SMK Industri Penerbangan Cakra Nusantara.",
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
