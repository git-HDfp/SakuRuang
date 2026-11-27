import Link from "next/link";
import {
  Vault,
  UsersThree,
  Calculator,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") ? params.next : "/dashboard";
  const initialError = params.error ?? null;

  return (
    <main className="min-h-[100dvh] bg-[#F6F7F4] text-[#141916] flex flex-col justify-between px-4 py-8 sm:px-8">
      {/* Top Minimal Header */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#0D6E52] text-white flex items-center justify-center">
            <Vault size={19} weight="duotone" />
          </div>
          <span className="text-base font-bold tracking-tight text-[#141916]">
            SakuRuang
          </span>
        </Link>

        <Link
          href="/"
          className="text-xs font-medium text-[#5A655E] hover:text-[#141916] transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </header>

      {/* Center Focused Auth Box */}
      <section className="my-10 max-w-md w-full mx-auto">
        <div className="rounded-2xl bg-white p-6 sm:p-8 border border-[#141916]/[0.08]">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EF] px-2.5 py-1 text-[11px] font-mono font-medium text-[#0D6E52]">
              <ShieldCheck size={14} weight="bold" />
              Supabase Cloud Auth
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#141916] mt-3">
              Masuk ke SakuRuang
            </h1>
            <p className="text-sm text-[#5A655E] mt-1 leading-relaxed">
              Masuk atau daftar akun baru untuk mengakses ruang keuangan pribadi
              maupun ruang keluarga Anda.
            </p>
          </div>

          <LoginForm nextPath={nextPath} initialError={initialError} />

          <div className="mt-6 pt-5 border-t border-[#141916]/[0.08] space-y-2.5 text-xs text-[#5A655E]">
            <div className="flex items-start gap-2.5">
              <UsersThree
                size={16}
                weight="duotone"
                className="text-[#0D6E52] shrink-0 mt-0.5"
              />
              <span>
                Data ruang pribadi terisolasi penuh dan hanya dapat diakses oleh
                akun Anda.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Calculator
                size={16}
                weight="duotone"
                className="text-[#0D6E52] shrink-0 mt-0.5"
              />
              <span>
                Bisa membuat atau bergabung ke Ruang Keluarga kapan saja lewat
                kode undangan.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Minimal Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5A655E]">
        <span>SakuRuang · Pencatat Keuangan Pribadi & Keluarga</span>
        <span className="font-mono">Supabase PostgreSQL + RLS</span>
      </footer>
    </main>
  );
}
