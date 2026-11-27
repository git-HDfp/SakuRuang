import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SakuRuang - Pencatat Keuangan Pribadi & Keluarga",
  description:
    "Kelola keuangan pribadi dan keluarga dengan multi-kantong, kalkulator transaksi langsung, anggaran bulanan, bagi tagihan, dan laporan arus kas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F6F7F4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable}`}
    >
      <body className="min-h-[100dvh] bg-[#F6F7F4] text-[#141916] antialiased selection:bg-[#0D6E52]/15 selection:text-[#0D6E52]">
        {children}
      </body>
    </html>
  );
}
