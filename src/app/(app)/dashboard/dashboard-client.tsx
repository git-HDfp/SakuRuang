"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutGroup, motion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowsLeftRight,
  Calculator,
  ChartPieSlice,
  Plus,
  Receipt,
  Sparkle,
  UsersThree,
  Wallet as WalletIcon,
} from "@phosphor-icons/react";
import { BezelCard } from "@/components/ui/bezel-card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ModalSheet } from "@/components/ui/modal-sheet";
import { TransactionForm } from "@/components/transactions/transaction-form";
import {
  CashflowTrendChart,
  CategoryDonutChart,
} from "@/components/analytics/charts";
import {
  formatDateID,
  formatIDR,
  formatMonthLabel,
  getDaysRemainingInMonth,
} from "@/lib/format";
import type {
  AppSessionContext,
  BudgetWithProgress,
  CategorySpendPoint,
  DailySpendPoint,
  MonthlyCashflowPoint,
  SplitBillWithParticipants,
  TransactionType,
  TransactionWithRelations,
} from "@/lib/types/database";

export function DashboardClient({
  session,
  currentMonth,
  recentTransactions,
  budgets,
  splitBills,
  analytics,
}: {
  session: AppSessionContext;
  currentMonth: string;
  recentTransactions: TransactionWithRelations[];
  budgets: BudgetWithProgress[];
  splitBills: SplitBillWithParticipants[];
  analytics: {
    monthlyCashflow: MonthlyCashflowPoint[];
    dailySpend: DailySpendPoint[];
    categoryBreakdown: CategorySpendPoint[];
    monthIncome: number;
    monthExpense: number;
    monthNet: number;
    savingsRate: number;
  };
}) {
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txDefaultType, setTxDefaultType] =
    useState<TransactionType>("expense");
  const [focusedWalletId, setFocusedWalletId] = useState<string | null>(null);
  const [focusedBudgetId, setFocusedBudgetId] = useState<string | null>(null);

  const totalBalance = session.wallets.reduce((acc, w) => acc + w.balance, 0);
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + b.amount_limit, 0);
  const totalBudgetSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const remainingBudget = Math.max(0, totalBudgetLimit - totalBudgetSpent);
  const daysLeft = getDaysRemainingInMonth(currentMonth);
  const safeDailySpend = Math.round(remainingBudget / Math.max(1, daysLeft));

  const openSplitBills = splitBills.filter((sb) => sb.status === "open");
  const totalOutstandingSplit = openSplitBills.reduce(
    (acc, sb) => acc + sb.outstanding_amount,
    0
  );

  // Reorder wallets so clicked wallet floats up to #1 spot and others blur
  const orderedWallets = useMemo(() => {
    const base = session.wallets.slice(0, 4);
    if (!focusedWalletId) return base;
    const selected = session.wallets.find((w) => w.id === focusedWalletId);
    if (!selected) return base;
    const others = base.filter((w) => w.id !== focusedWalletId);
    return [selected, ...others];
  }, [session.wallets, focusedWalletId]);

  // Reorder budgets so clicked budget floats up to #1 spot and others blur
  const orderedBudgets = useMemo(() => {
    const base = budgets.slice(0, 4);
    if (!focusedBudgetId) return base;
    const selected = budgets.find((b) => b.id === focusedBudgetId);
    if (!selected) return base;
    const others = base.filter((b) => b.id !== focusedBudgetId);
    return [selected, ...others];
  }, [budgets, focusedBudgetId]);

  function openQuickTransaction(type: TransactionType) {
    setTxDefaultType(type);
    setTxModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-pill-animated px-3 py-1 text-xs font-semibold text-white shadow-xs">
              {session.activeSpace.type === "family" ? (
                <>
                  <UsersThree size={14} weight="duotone" />
                  <span>
                    Ruang Keluarga · {session.activeSpace.member_count} Anggota
                  </span>
                </>
              ) : (
                <>
                  <Sparkle size={13} weight="duotone" />
                  <span>Ruang Pribadi</span>
                </>
              )}
            </span>
            <span className="text-xs font-medium text-[#52635D]">
              {formatMonthLabel(currentMonth)}
            </span>
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-[#101A17]">
            {session.activeSpace.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openQuickTransaction("transfer")}
            className="min-h-[42px] rounded-full bg-white hover:bg-[#E2F4EE] text-[#101A17] ring-1 ring-[#0D6E52]/15 px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowsLeftRight size={15} weight="bold" className="text-[#0D6E52]" />
            <span>Transfer Kantong</span>
          </button>

          <button
            type="button"
            onClick={() => openQuickTransaction("expense")}
            className="min-h-[42px] rounded-full bg-teal-pill-animated hover:opacity-95 active:scale-[0.98] text-white px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Calculator size={16} weight="duotone" />
            <span>+ Catat dengan Kalkulator</span>
          </button>
        </div>
      </div>

      {/* Asymmetric Bento Row 1: Animated Teal Gradient Hero (7 cols) + Interactive Multi-Kantong (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 7: Animated Teal Aurora Hero Card */}
        <BezelCard variant="teal-hero" className="lg:col-span-7">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-xs px-3 py-1 text-xs font-medium text-white/95">
                <Sparkle size={13} weight="fill" className="text-[#7AF0CB]" />
                <span>Total Saldo Aktif ({session.wallets.length} Kantong)</span>
              </span>
              <Link
                href="/family"
                className="rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xs px-3 py-1 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
              >
                <UsersThree size={15} weight="duotone" />
                <span>
                  {session.activeSpace.type === "family"
                    ? "Kelola Anggota & Invite"
                    : "Tautkan Ruang Keluarga"}
                </span>
              </Link>
            </div>

            <p className="mt-4 font-mono text-3xl md:text-5xl font-semibold tracking-tight text-white tabular-nums drop-shadow-xs">
              {formatIDR(totalBalance)}
            </p>
            <p className="mt-1 text-xs text-white/75">
              Klik pada kantong atau bagian diagram di bawah untuk menyorot
              detail & mengangkat item ke atas.
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/12 backdrop-blur-xs p-3.5 ring-1 ring-white/15">
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <ArrowDownLeft
                  size={15}
                  weight="bold"
                  className="text-[#7AF0CB]"
                />
                <span>Pemasukan Bulan Ini</span>
              </div>
              <p className="mt-1.5 font-mono text-base font-semibold text-[#7AF0CB] tabular-nums">
                +{formatIDR(analytics.monthIncome)}
              </p>
            </div>

            <div className="rounded-2xl bg-white/12 backdrop-blur-xs p-3.5 ring-1 ring-white/15">
              <div className="flex items-center gap-1.5 text-xs text-white/80">
                <ArrowUpRight
                  size={15}
                  weight="bold"
                  className="text-[#FFB4AE]"
                />
                <span>Pengeluaran Bulan Ini</span>
              </div>
              <p className="mt-1.5 font-mono text-base font-semibold text-[#FFB4AE] tabular-nums">
                -{formatIDR(analytics.monthExpense)}
              </p>
            </div>

            <div className="rounded-2xl bg-white/12 backdrop-blur-xs p-3.5 ring-1 ring-white/15">
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>Rasio Tabungan</span>
                <span className="font-mono font-semibold text-[#7AF0CB] tabular-nums">
                  {analytics.savingsRate}%
                </span>
              </div>
              <p className="mt-1.5 font-mono text-base font-semibold text-white tabular-nums">
                {formatIDR(analytics.monthNet)}
              </p>
            </div>
          </div>
        </BezelCard>

        {/* Col 5: Interactive Multi-Kantong / Dompet List (Click to elevate & blur rest!) */}
        <BezelCard
          className="lg:col-span-5"
          innerClassName="flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
                  Kantong & Dompet
                </h2>
                <p className="text-xs text-[#52635D]">
                  Klik salah satu kantong untuk fokus ke atas
                </p>
              </div>
              <div className="flex items-center gap-2">
                {focusedWalletId && (
                  <button
                    type="button"
                    onClick={() => setFocusedWalletId(null)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E2F4EE] text-[#0D6E52] px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                  >
                    <ArrowCounterClockwise size={11} weight="bold" />
                    <span>Reset</span>
                  </button>
                )}
                <Link
                  href="/wallets"
                  className="text-xs font-semibold text-[#0D6E52] hover:underline flex items-center gap-1"
                >
                  <span>Kelola</span>
                  <ArrowRight size={13} weight="bold" />
                </Link>
              </div>
            </div>

            {session.wallets.length === 0 ? (
              <p className="text-xs text-[#52635D] py-6 text-center">
                Belum ada kantong. Tambahkan kantong pertama Anda.
              </p>
            ) : (
              <LayoutGroup id="dashboard-wallets-stack">
                <div className="space-y-2">
                  {orderedWallets.map((w) => {
                    const isSelected = focusedWalletId === w.id;
                    const isBlurred = focusedWalletId !== null && !isSelected;
                    const pct =
                      totalBalance > 0
                        ? Math.max(
                            0,
                            Math.round((w.balance / totalBalance) * 100)
                          )
                        : 0;

                    return (
                      <motion.button
                        layout
                        key={w.id}
                        type="button"
                        onClick={() =>
                          setFocusedWalletId((prev) =>
                            prev === w.id ? null : w.id
                          )
                        }
                        transition={{
                          layout: {
                            type: "spring",
                            stiffness: 380,
                            damping: 28,
                          },
                        }}
                        className={`w-full rounded-2xl px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? "bg-teal-animated text-white shadow-[0_12px_26px_-6px_rgba(13,110,82,0.45)] -translate-y-1 scale-[1.03] ring-2 ring-[#139A7E]"
                            : isBlurred
                            ? "bg-[#F3F7F5] text-[#52635D] opacity-35 blur-[1.6px] scale-[0.97] hover:opacity-75 hover:blur-[0.4px]"
                            : "bg-[#F3F7F5] hover:bg-[#E2F4EE]/70 text-[#101A17] ring-1 ring-[#0D6E52]/[0.07]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            style={{
                              backgroundColor: isSelected
                                ? "rgba(255,255,255,0.2)"
                                : `${w.color}18`,
                              color: isSelected ? "#FFFFFF" : w.color,
                            }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          >
                            <CategoryIcon
                              name={w.icon}
                              size={17}
                              weight="duotone"
                            />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">
                              {w.name}
                            </p>
                            <p
                              className={`text-[11px] capitalize ${
                                isSelected ? "text-white/80" : "text-[#52635D]"
                              }`}
                            >
                              {w.type} · {pct}% porsi saldo
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-semibold tabular-nums shrink-0">
                          {formatIDR(w.balance)}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </LayoutGroup>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#0D6E52]/[0.09] flex items-center justify-between">
            <Link
              href="/wallets"
              className="text-xs font-medium text-[#52635D] hover:text-[#101A17] flex items-center gap-1.5"
            >
              <WalletIcon size={15} weight="duotone" className="text-[#0D6E52]" />
              <span>Tambah atau bagi kantong baru</span>
            </Link>
            <Link
              href="/wallets"
              className="rounded-full bg-teal-pill-animated text-white px-3 py-1 text-xs font-semibold shadow-2xs"
            >
              + Kantong
            </Link>
          </div>
        </BezelCard>
      </div>

      {/* Asymmetric Bento Row 2: Dataviz Cashflow 6 Bulan (7 cols) + Category Donut Breakdown (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BezelCard className="lg:col-span-7">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
                Tren Arus Kas 6 Bulan Terakhir
              </h2>
              <p className="text-xs text-[#52635D]">
                Klik batang bulan untuk mengangkat sorotan & memblur bulan lain
              </p>
            </div>
            <Link
              href="/analytics"
              className="text-xs font-semibold text-[#0D6E52] hover:underline flex items-center gap-1"
            >
              <span>Detail Dataviz</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>

          <CashflowTrendChart data={analytics.monthlyCashflow} />
        </BezelCard>

        <BezelCard className="lg:col-span-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
                Distribusi Kategori Bulan Ini
              </h2>
              <p className="text-xs text-[#52635D]">
                Klik kategori (misal Belanja Rumah) untuk naik ke atas
              </p>
            </div>
            <Link
              href="/analytics"
              className="text-xs font-semibold text-[#0D6E52] hover:underline"
            >
              Lihat Semua
            </Link>
          </div>

          <CategoryDonutChart
            data={analytics.categoryBreakdown}
            totalExpense={analytics.monthExpense}
          />
        </BezelCard>
      </div>

      {/* Asymmetric Bento Row 3: Recent Transactions (7 cols) + Monthly Budget & Split Bill Snapshot (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 7: Recent Transactions */}
        <BezelCard className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
                Transaksi Terbaru
              </h2>
              <p className="text-xs text-[#52635D]">
                Catatan aktivitas terbaru di {session.activeSpace.name}
              </p>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-[#0D6E52] hover:underline flex items-center gap-1"
            >
              <span>Semua Transaksi</span>
              <ArrowRight size={13} weight="bold" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <EmptyState
              icon="Receipt"
              title="Belum Ada Transaksi"
              description="Gunakan kalkulator nominal built-in untuk mencatat pengeluaran atau pemasukan pertama."
              action={
                <button
                  type="button"
                  onClick={() => openQuickTransaction("expense")}
                  className="rounded-full bg-teal-pill-animated text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  + Catat Transaksi Pertama
                </button>
              }
            />
          ) : (
            <div className="divide-y divide-[#0D6E52]/[0.08]">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      style={{
                        backgroundColor: `${tx.category_color ?? "#0D6E52"}18`,
                        color: tx.category_color ?? "#0D6E52",
                      }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    >
                      <CategoryIcon
                        name={tx.category_icon}
                        size={18}
                        weight="duotone"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#101A17] truncate">
                        {tx.note || tx.category_name}
                      </p>
                      <p className="text-[11px] text-[#52635D] truncate">
                        {tx.category_name} · {tx.wallet_name}
                        {tx.destination_wallet_name
                          ? ` → ${tx.destination_wallet_name}`
                          : ""}{" "}
                        · {formatDateID(tx.occurred_at)} · oleh {tx.creator_name}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${
                      tx.type === "income"
                        ? "text-[#0D6E52]"
                        : tx.type === "expense"
                        ? "text-[#C83E37]"
                        : "text-[#2B5B84]"
                    }`}
                  >
                    {tx.type === "income"
                      ? `+${formatIDR(tx.amount)}`
                      : tx.type === "expense"
                      ? `-${formatIDR(tx.amount)}`
                      : formatIDR(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </BezelCard>

        {/* Col 5: Monthly Budgets (Interactive Focus) + Active Split Bills */}
        <div className="lg:col-span-5 space-y-5">
          {/* Monthly Budget Snapshot */}
          <BezelCard>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ChartPieSlice
                  size={18}
                  weight="duotone"
                  className="text-[#0D6E52]"
                />
                <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
                  Anggaran Bulanan
                </h2>
              </div>
              <Link
                href="/budgets"
                className="text-xs font-semibold text-[#0D6E52] hover:underline"
              >
                Atur Anggaran
              </Link>
            </div>

            {budgets.length === 0 ? (
              <p className="text-xs text-[#52635D] py-3">
                Belum ada batas anggaran bulan ini.{" "}
                <Link
                  href="/budgets"
                  className="text-[#0D6E52] font-semibold underline"
                >
                  Buat anggaran sekarang
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-teal-soft-animated p-3 ring-1 ring-[#0D6E52]/15 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[#52635D]">
                      Batas Aman Harian ({daysLeft} hari tersisa)
                    </p>
                    <p className="font-mono text-sm font-semibold text-[#0D6E52] tabular-nums mt-0.5">
                      {formatIDR(safeDailySpend)} / hari
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#52635D]">Sisa Anggaran</p>
                    <p className="font-mono text-xs font-semibold text-[#101A17] tabular-nums mt-0.5">
                      {formatIDR(remainingBudget)}
                    </p>
                  </div>
                </div>

                <LayoutGroup id="dashboard-budget-bars">
                  <div className="space-y-2">
                    {orderedBudgets.map((b) => {
                      const isSelected = focusedBudgetId === b.id;
                      const isBlurred =
                        focusedBudgetId !== null && !isSelected;
                      const barColor =
                        b.status === "over"
                          ? "bg-[#C83E37]"
                          : b.status === "warning"
                          ? "bg-[#C4781A]"
                          : "bg-teal-pill-animated";

                      return (
                        <motion.button
                          layout
                          key={b.id}
                          type="button"
                          onClick={() =>
                            setFocusedBudgetId((prev) =>
                              prev === b.id ? null : b.id
                            )
                          }
                          transition={{
                            layout: {
                              type: "spring",
                              stiffness: 360,
                              damping: 28,
                            },
                          }}
                          className={`w-full rounded-xl p-2.5 text-left space-y-1.5 transition-all duration-300 cursor-pointer ${
                            isSelected
                              ? "bg-teal-animated text-white shadow-md -translate-y-0.5 scale-[1.02]"
                              : isBlurred
                              ? "bg-[#F3F7F5] opacity-35 blur-[1.4px] scale-[0.98]"
                              : "bg-[#F3F7F5] hover:bg-[#E2F4EE]/60"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold">
                              {b.category_name}
                            </span>
                            <span
                              className={`font-mono text-[11px] tabular-nums ${
                                isSelected ? "text-white/90" : "text-[#52635D]"
                              }`}
                            >
                              {formatIDR(b.spent)} / {formatIDR(b.amount_limit)}{" "}
                              ({b.percentage}%)
                            </span>
                          </div>
                          <div
                            className={`h-2 w-full rounded-full overflow-hidden ${
                              isSelected ? "bg-white/20" : "bg-[#E2ECE8]"
                            }`}
                          >
                            <div
                              className={`h-full rounded-full ${
                                isSelected ? "bg-[#7AF0CB]" : barColor
                              } transition-all`}
                              style={{
                                width: `${Math.min(100, b.percentage)}%`,
                              }}
                            />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </LayoutGroup>
              </div>
            )}
          </BezelCard>

          {/* Split Bill Snapshot */}
          <BezelCard variant="teal-tinted">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} weight="duotone" className="text-[#0D6E52]" />
                <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
                  Split Bill & Patungan
                </h2>
              </div>
              <Link
                href="/split-bill"
                className="text-xs font-semibold text-[#0D6E52] hover:underline flex items-center gap-1"
              >
                <Plus size={12} weight="bold" />
                <span>Buat Patungan</span>
              </Link>
            </div>

            <div className="rounded-xl bg-white/85 backdrop-blur-xs p-3.5 ring-1 ring-[#0D6E52]/12 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#52635D]">
                  Belum Terkumpul ({openSplitBills.length} tagihan aktif)
                </p>
                <p className="font-mono text-base font-semibold text-[#C4781A] tabular-nums mt-0.5">
                  {formatIDR(totalOutstandingSplit)}
                </p>
              </div>
              <Link
                href="/split-bill"
                className="rounded-full bg-teal-pill-animated text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs"
              >
                Kelola
              </Link>
            </div>
          </BezelCard>
        </div>
      </div>

      {/* Transaction Modal */}
      <ModalSheet
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        title={`Catat Transaksi · ${session.activeSpace.name}`}
        subtitle="Gunakan keypad kalkulator untuk menghitung total belanja secara langsung."
      >
        <TransactionForm
          spaceId={session.activeSpace.id}
          wallets={session.wallets}
          categories={session.categories}
          defaultType={txDefaultType}
          onSuccess={() => setTxModalOpen(false)}
        />
      </ModalSheet>
    </div>
  );
}
