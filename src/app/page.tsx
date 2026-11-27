import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  ChartBar,
  Check,
  FileText,
  GoogleLogo,
  LockKey,
  Receipt,
  UsersThree,
  Vault,
  Wallet,
} from "@phosphor-icons/react/dist/ssr";
import { getCurrentUserProfile } from "@/lib/data/repository";

const MODULES = [
  {
    icon: UsersThree,
    tag: "RUANG KERJA",
    title: "Ruang Pribadi & Ruang Keluarga",
    description:
      "Pisahkan pencatatan uang pribadi dari kas rumah tangga. Buat Ruang Keluarga dan undang pasangan menggunakan kode 8 karakter.",
  },
  {
    icon: Wallet,
    tag: "MULTI-KANTONG",
    title: "Dompet Tunai, Bank, & E-Wallet",
    description:
      "Catat saldo di tiap kantong sesuai kondisi nyata. Mutasi antar kantong tercatat sebagai transfer sehingga tidak dihitung pengeluaran ganda.",
  },
  {
    icon: Calculator,
    tag: "INPUT NOMINAL",
    title: "Kalkulator Langsung di Form Transaksi",
    description:
      "Hitung penjumlahan atau perkalian belanjaan langsung pada kolom nominal transaksi tanpa berpindah ke aplikasi kalkulator lain.",
  },
  {
    icon: Receipt,
    tag: "ANGGARAN & PATUNGAN",
    title: "Batas Anggaran & Split Bill",
    description:
      "Pantau sisa anggaran bulanan per kategori dan catat pembagian tagihan bersama dengan metode bagi rata, nominal tetap, atau persentase.",
  },
  {
    icon: ChartBar,
    tag: "RINGKASAN ARUS KAS",
    title: "Diagram Pemasukan & Pengeluaran",
    description:
      "Lihat perbandingan arus kas bulanan, pengeluaran harian, dan komposisi kategori belanja berdasarkan data transaksi yang Anda catat.",
  },
  {
    icon: FileText,
    tag: "REKAP MUTASI",
    title: "Ekspor Laporan PDF, Excel, & CSV",
    description:
      "Unduh laporan mutasi transaksi mingguan, bulanan, atau rentang tanggal pilihan Anda kapan saja untuk arsip pribadi maupun keluarga.",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Masuk dengan Akun Google",
    description:
      "Tidak perlu membuat kata sandi baru. Saat pertama kali masuk, Ruang Pribadi, Dompet Utama, dan 10 kategori dasar langsung siap digunakan.",
  },
  {
    step: "02",
    title: "Atur Kantong & Catat Transaksi",
    description:
      "Sesuaikan nama kantong dan saldo awal Anda, lalu catat pengeluaran, pemasukan, atau transfer antar kantong dari ponsel maupun desktop.",
  },
  {
    step: "03",
    title: "Bagikan Kode Ruang Keluarga (Opsional)",
    description:
      "Jika ingin mencatat kas rumah bersama pasangan, buat Ruang Keluarga di menu Keluarga dan bagikan kode undangannya.",
  },
];

export default async function HomePage() {
  const { profile } = await getCurrentUserProfile();
  const isLoggedIn = Boolean(profile);

  return (
    <div className="min-h-[100dvh] bg-[#F6F7F4] text-[#141916] flex flex-col justify-between">
      {/* Top Minimal Navbar */}
      <header className="sticky top-0 z-30 h-16 bg-[#F6F7F4]/90 backdrop-blur-md border-b border-[#141916]/[0.08]">
        <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0D6E52] text-white flex items-center justify-center">
              <Vault size={18} weight="duotone" />
            </div>
            <span className="text-base font-bold tracking-tight text-[#141916]">
              SakuRuang
            </span>
          </Link>

          <nav
            aria-label="Navigasi utama"
            className="hidden sm:flex items-center gap-6 text-xs font-medium text-[#5A655E]"
          >
            <a
              href="#fitur"
              className="hover:text-[#141916] transition-colors"
            >
              Modul & Fitur
            </a>
            <a
              href="#alur"
              className="hover:text-[#141916] transition-colors"
            >
              Cara Mulai
            </a>
          </nav>

          <div>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="min-h-[40px] inline-flex items-center gap-2 rounded-lg bg-[#0D6E52] hover:bg-[#095740] text-white px-4 py-2 text-xs font-semibold transition-colors"
              >
                <span>Buka Dashboard</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="min-h-[40px] inline-flex items-center gap-2 rounded-lg bg-[#141916] hover:bg-[#0D6E52] text-white px-4 py-2 text-xs font-semibold transition-colors"
              >
                <GoogleLogo size={15} weight="bold" />
                <span>Masuk dengan Google</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Clean Utilitarian Hero — Zero Dummy Numbers */}
        <section className="py-16 sm:py-24 border-b border-[#141916]/[0.08]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#EDF3EC] px-3 py-1 text-[11px] font-mono uppercase tracking-wider font-semibold text-[#0D6E52]">
                <span>PENCATAT KEUANGAN PRIBADI & KELUARGA</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.12] text-[#141916]">
                Catat pengeluaran pribadi dan kas rumah dalam satu ruang kerja
                yang rapi.
              </h1>

              <p className="text-base text-[#5A655E] leading-relaxed">
                Aplikasi pencatatan keuangan berbasis web untuk mengelola
                multi-kantong, anggaran bulanan, patungan tagihan, serta berbagi
                buku kas keluarga tanpa mencampur saldo pribadi Anda.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="min-h-[46px] inline-flex items-center gap-2.5 rounded-xl bg-[#0D6E52] hover:bg-[#095740] text-white px-6 py-3 text-sm font-semibold transition-colors"
                  >
                    <span>Buka Dashboard Anda</span>
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="min-h-[46px] inline-flex items-center gap-2.5 rounded-xl bg-[#141916] hover:bg-[#0D6E52] text-white px-6 py-3 text-sm font-semibold transition-colors"
                  >
                    <GoogleLogo size={18} weight="bold" />
                    <span>Masuk dengan Akun Google</span>
                    <ArrowRight size={15} weight="bold" />
                  </Link>
                )}

                <a
                  href="#fitur"
                  className="min-h-[46px] inline-flex items-center rounded-xl bg-white hover:bg-[#EFEFE9] text-[#141916] px-5 py-3 text-sm font-medium border border-[#141916]/[0.1] transition-colors"
                >
                  Lihat Modul Aplikasi
                </a>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#5A655E]">
                <span className="inline-flex items-center gap-1.5">
                  <Check size={14} weight="bold" className="text-[#0D6E52]" />
                  Login praktis via Google OAuth
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check size={14} weight="bold" className="text-[#0D6E52]" />
                  Data kosong & bersih untuk akun baru
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LockKey size={14} weight="bold" className="text-[#0D6E52]" />
                  Isolasi data per ruang (Supabase RLS)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Functional Modules Grid */}
        <section
          id="fitur"
          className="py-16 sm:py-20 bg-white border-b border-[#141916]/[0.08] scroll-mt-16"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="max-w-xl mb-10">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#0D6E52] block mb-1.5">
                MODUL UTAMA
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141916]">
                Semua fungsi pencatatan harian yang langsung bisa dipakai.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.title}
                    className="rounded-xl bg-[#F6F7F4] p-6 border border-[#141916]/[0.07] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-white text-[#0D6E52] border border-[#141916]/[0.08] flex items-center justify-center">
                          <Icon size={19} weight="duotone" />
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-[#5A655E]">
                          {mod.tag}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#141916]">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-[#5A655E] mt-2 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3-Step Workflow Section */}
        <section
          id="alur"
          className="py-16 sm:py-20 border-b border-[#141916]/[0.08] scroll-mt-16"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="max-w-xl mb-10">
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[#0D6E52] block mb-1.5">
                CARA MULAI
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#141916]">
                Mulai dari buku kas bersih milik Anda sendiri.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STEPS.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl bg-white p-6 border border-[#141916]/[0.08]"
                >
                  <span className="font-mono text-xs font-bold text-[#0D6E52] bg-[#E6F4EF] px-2.5 py-1 rounded-md inline-block">
                    Langkah {item.step}
                  </span>
                  <h3 className="text-base font-bold text-[#141916] mt-4">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#5A655E] mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom Direct Action Bar */}
        <section className="py-14 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="rounded-2xl bg-[#F6F7F4] p-6 sm:p-8 border border-[#141916]/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="max-w-lg">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#141916]">
                  Siap mencatat transaksi pertama Anda?
                </h2>
                <p className="text-xs sm:text-sm text-[#5A655E] mt-1">
                  Masuk dengan akun Google untuk membuka dashboard SakuRuang.
                </p>
              </div>

              <div className="shrink-0">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="min-h-[46px] inline-flex items-center gap-2 rounded-xl bg-[#0D6E52] hover:bg-[#095740] text-white px-5 py-2.5 text-sm font-semibold transition-colors"
                  >
                    <span>Buka Dashboard</span>
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="min-h-[46px] inline-flex items-center gap-2.5 rounded-xl bg-[#141916] hover:bg-[#0D6E52] text-white px-5 py-2.5 text-sm font-semibold transition-colors"
                  >
                    <GoogleLogo size={17} weight="bold" />
                    <span>Masuk dengan Google</span>
                    <ArrowRight size={15} weight="bold" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-[#141916]/[0.08] bg-[#F6F7F4] py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5A655E]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#0D6E52] text-white flex items-center justify-center">
              <Vault size={13} weight="duotone" />
            </div>
            <span className="font-semibold text-[#141916]">SakuRuang</span>
            <span>· Pencatat Keuangan Pribadi & Keluarga</span>
          </div>
          <span className="font-mono text-[11px]">
            Supabase Auth & PostgreSQL
          </span>
        </div>
      </footer>
    </div>
  );
}
