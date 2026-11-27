"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartBar,
  ChartPieSlice,
  House,
  ListBullets,
  Plus,
  Receipt,
  SignOut,
  UsersThree,
  Vault,
  Wallet,
} from "@phosphor-icons/react";
import { SpaceSwitcher } from "./space-switcher";
import { ModalSheet } from "@/components/ui/modal-sheet";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { signOutAction } from "@/actions/auth";
import { getInitials } from "@/lib/format";
import type { AppSessionContext } from "@/lib/types/database";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Ringkasan", icon: House },
  { href: "/transactions", label: "Transaksi", icon: ListBullets },
  { href: "/wallets", label: "Kantong & Dompet", icon: Wallet },
  { href: "/budgets", label: "Anggaran Bulanan", icon: ChartPieSlice },
  { href: "/split-bill", label: "Split Bill", icon: Receipt },
  { href: "/analytics", label: "Diagram & Dataviz", icon: ChartBar },
  { href: "/family", label: "Ruang Keluarga", icon: UsersThree },
];

export function AppShell({
  session,
  children,
}: {
  session: AppSessionContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-[#F6F7F4] text-[#141916] flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-68 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 bg-[#F6F7F4] border-r border-[#141916]/[0.08] px-4 py-5 justify-between z-20">
        <div className="space-y-5">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-2">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#0D6E52] text-white flex items-center justify-center shadow-xs">
                <Vault size={20} weight="duotone" />
              </div>
              <div>
                <span className="text-base font-semibold tracking-tight block leading-none">
                  SakuRuang
                </span>
                <span className="text-[11px] text-[#5A655E] mt-0.5 block">
                  Pribadi & Keluarga
                </span>
              </div>
            </Link>
            <span className="rounded-full bg-[#E6F4EF] px-2 py-0.5 text-[10px] font-mono font-medium text-[#0D6E52]">
              Cloud
            </span>
          </div>

          {/* Space Switcher (Personal vs Family) */}
          <SpaceSwitcher
            spaces={session.spaces}
            activeSpace={session.activeSpace}
          />

          {/* Primary Quick Add Transaction Button */}
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="w-full min-h-[44px] rounded-full bg-teal-pill-animated hover:opacity-95 active:scale-[0.98] text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md transition-all cursor-pointer"
          >
            <span>Catat Transaksi + Kalkulator</span>
            <span className="w-6 h-6 rounded-full bg-white/18 flex items-center justify-center">
              <Plus size={14} weight="bold" />
            </span>
          </button>

          {/* Navigation Menu */}
          <nav className="space-y-1" aria-label="Menu Utama">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-h-[42px] rounded-xl px-3 py-2 text-xs font-medium flex items-center justify-between transition-all ${
                    isActive
                      ? "bg-white text-[#0D6E52] font-semibold ring-1 ring-[#141916]/[0.07] shadow-2xs"
                      : "text-[#5A655E] hover:text-[#141916] hover:bg-[#EFEFE9]/60"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon
                      size={18}
                      weight={isActive ? "duotone" : "regular"}
                      className={isActive ? "text-[#0D6E52]" : "text-[#5A655E]"}
                    />
                    <span>{item.label}</span>
                  </span>
                  {item.href === "/family" &&
                    session.activeSpace.type === "family" && (
                      <span className="rounded-full bg-[#E6F4EF] text-[#0D6E52] px-2 py-0.5 text-[10px] font-mono tabular-nums">
                        {session.activeSpace.member_count}
                      </span>
                    )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Active Space Members & Current User Footer */}
        <div className="space-y-3 pt-4 border-t border-[#141916]/[0.08]">
          {session.activeSpace.type === "family" && (
            <div className="px-2">
              <p className="text-[11px] font-medium text-[#5A655E] mb-1.5">
                Anggota Tertaut ({session.members.length})
              </p>
              <div className="flex items-center -space-x-1.5 overflow-hidden">
                {session.members.map((m) => (
                  <div
                    key={m.id}
                    title={`${m.profile.full_name} (${m.role})`}
                    style={{ backgroundColor: m.profile.avatar_color }}
                    className="w-7 h-7 rounded-full text-white text-[11px] font-semibold flex items-center justify-center ring-2 ring-[#F6F7F4]"
                  >
                    {getInitials(m.profile.full_name)}
                  </div>
                ))}
                <Link
                  href="/family"
                  title="Undang anggota keluarga"
                  className="w-7 h-7 rounded-full bg-[#EFEFE9] hover:bg-[#E6F4EF] text-[#0D6E52] text-xs font-bold flex items-center justify-center ring-2 ring-[#F6F7F4]"
                >
                  +
                </Link>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-2.5 ring-1 ring-[#141916]/[0.07] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                style={{ backgroundColor: session.user.avatar_color }}
                className="w-8 h-8 rounded-xl text-white text-xs font-semibold flex items-center justify-center shrink-0"
              >
                {getInitials(session.user.full_name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#141916] truncate">
                  {session.user.full_name}
                </p>
                <p className="text-[11px] text-[#5A655E] truncate">
                  {session.user.email}
                </p>
              </div>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                title="Keluar Akun"
                aria-label="Keluar Akun"
                className="min-w-[36px] min-h-[36px] rounded-xl bg-[#F6F7F4] hover:bg-[#C83E37]/10 text-[#5A655E] hover:text-[#C83E37] flex items-center justify-center transition-colors cursor-pointer"
              >
                <SignOut size={16} weight="bold" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Sticky Top Header */}
      <header className="lg:hidden sticky top-0 z-20 bg-[#F6F7F4]/90 backdrop-blur-md border-b border-[#141916]/[0.08] px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 max-w-[230px]">
            <SpaceSwitcher
              spaces={session.spaces}
              activeSpace={session.activeSpace}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/family"
              aria-label="Ruang Keluarga & Invite"
              className="min-h-[40px] rounded-xl bg-white px-2.5 py-1.5 ring-1 ring-[#141916]/[0.08] text-xs font-medium text-[#141916] flex items-center gap-1.5"
            >
              <UsersThree size={16} weight="duotone" className="text-[#0D6E52]" />
              <span className="hidden sm:inline">Keluarga</span>
            </Link>

            <form action={signOutAction}>
              <button
                type="submit"
                aria-label="Keluar"
                className="min-w-[40px] min-h-[40px] rounded-xl bg-white ring-1 ring-[#141916]/[0.08] text-[#5A655E] flex items-center justify-center"
              >
                <SignOut size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Mobile Secondary Horizontal Pill Bar for quick access to all 7 features */}
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#0D6E52] text-white"
                    : "bg-white text-[#5A655E] ring-1 ring-[#141916]/[0.06]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-68">
        <div className="max-w-[1260px] mx-auto px-4 pt-5 pb-28 md:px-8 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Floating Bottom Navigation Bar + Quick Add Calculator FAB */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="lg:hidden fixed bottom-3 inset-x-3 z-30 rounded-2xl bg-white/95 backdrop-blur-md ring-1 ring-[#141916]/12 shadow-xl px-2 py-1.5 grid grid-cols-5 items-center"
      >
        <Link
          href="/dashboard"
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
            pathname.startsWith("/dashboard")
              ? "text-[#0D6E52] font-semibold"
              : "text-[#5A655E]"
          }`}
        >
          <House
            size={19}
            weight={pathname.startsWith("/dashboard") ? "duotone" : "regular"}
          />
          <span>Beranda</span>
        </Link>

        <Link
          href="/transactions"
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
            pathname.startsWith("/transactions")
              ? "text-[#0D6E52] font-semibold"
              : "text-[#5A655E]"
          }`}
        >
          <ListBullets
            size={19}
            weight={pathname.startsWith("/transactions") ? "duotone" : "regular"}
          />
          <span>Transaksi</span>
        </Link>

        {/* Center Quick Add Button with Calculator */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Catat Transaksi dengan Kalkulator"
            className="min-w-[52px] min-h-[46px] rounded-2xl bg-teal-pill-animated active:scale-[0.95] text-white shadow-lg flex flex-col items-center justify-center cursor-pointer"
          >
            <Plus size={20} weight="bold" />
            <span className="text-[10px] font-semibold leading-none mt-0.5">
              Catat
            </span>
          </button>
        </div>

        <Link
          href="/wallets"
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
            pathname.startsWith("/wallets")
              ? "text-[#0D6E52] font-semibold"
              : "text-[#5A655E]"
          }`}
        >
          <Wallet
            size={19}
            weight={pathname.startsWith("/wallets") ? "duotone" : "regular"}
          />
          <span>Kantong</span>
        </Link>

        <Link
          href="/split-bill"
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
            pathname.startsWith("/split-bill")
              ? "text-[#0D6E52] font-semibold"
              : "text-[#5A655E]"
          }`}
        >
          <Receipt
            size={19}
            weight={pathname.startsWith("/split-bill") ? "duotone" : "regular"}
          />
          <span>Patungan</span>
        </Link>
      </nav>

      {/* Global Quick Add Transaction Modal / Bottom Sheet */}
      <ModalSheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        title={`Catat Transaksi · ${session.activeSpace.name}`}
        subtitle="Dilengkapi kalkulator nominal otomatis untuk pengeluaran, pemasukan, dan transfer."
      >
        <TransactionForm
          spaceId={session.activeSpace.id}
          wallets={session.wallets}
          categories={session.categories}
          onSuccess={() => setQuickAddOpen(false)}
        />
      </ModalSheet>
    </div>
  );
}
