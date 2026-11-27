"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  ArrowCounterClockwise,
  DownloadSimple,
  Sparkle,
} from "@phosphor-icons/react";
import { BezelCard } from "@/components/ui/bezel-card";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  CashflowTrendChart,
  CategoryDonutChart,
  DailySpendAreaChart,
  WalletDistributionBarChart,
} from "@/components/analytics/charts";
import { ReportDownloadModal } from "@/components/reports/report-download-modal";
import { formatDateID, formatIDR, formatMonthLabel } from "@/lib/format";
import type {
  AppSessionContext,
  CategorySpendPoint,
  DailySpendPoint,
  MonthlyCashflowPoint,
  TransactionWithRelations,
} from "@/lib/types/database";

export function AnalyticsClient({
  session,
  selectedMonth,
  analytics,
  transactions = [],
}: {
  session: AppSessionContext;
  selectedMonth: string;
  analytics: {
    monthlyCashflow: MonthlyCashflowPoint[];
    dailySpend: DailySpendPoint[];
    categoryBreakdown: CategorySpendPoint[];
    monthIncome: number;
    monthExpense: number;
    monthNet: number;
    savingsRate: number;
  };
  transactions?: TransactionWithRelations[];
}) {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Reorder the full category breakdown so clicking any category lifts it to #1 top position and blurs the rest!
  const orderedCategoryBreakdown = useMemo(() => {
    if (!selectedCategoryId) return analytics.categoryBreakdown;
    const focused = analytics.categoryBreakdown.find(
      (c) => c.category_id === selectedCategoryId
    );
    if (!focused) return analytics.categoryBreakdown;
    const rest = analytics.categoryBreakdown.filter(
      (c) => c.category_id !== selectedCategoryId
    );
    return [focused, ...rest];
  }, [analytics.categoryBreakdown, selectedCategoryId]);

  const focusedCategoryTransactions = useMemo(() => {
    if (!selectedCategoryId) return [];
    return transactions
      .filter(
        (tx) =>
          tx.type === "expense" &&
          tx.occurred_at.startsWith(selectedMonth) &&
          (tx.category_id ?? "uncategorized") === selectedCategoryId
      )
      .slice(0, 5);
  }, [transactions, selectedCategoryId, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-pill-animated px-3 py-1 text-xs font-semibold text-white shadow-xs">
            <Sparkle size={13} weight="fill" />
            <span>Interaktif · Klik Bagian untuk Fokus & Angkat ke Atas</span>
          </span>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-[#101A17]">
            Visualisasi Data & Diagram
          </h1>
          <p className="text-xs text-[#52635D] mt-1">
            Analisis arus kas, proporsi kategori, ritme pengeluaran harian, dan
            distribusi kantong di{" "}
            <span className="font-semibold text-[#101A17]">
              {session.activeSpace.name}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <input
            type="month"
            aria-label="Pilih bulan analisis"
            value={selectedMonth}
            onChange={(e) => {
              if (e.target.value) {
                router.push(`/analytics?month=${e.target.value}`);
              }
            }}
            className="min-h-[42px] rounded-full bg-white px-4 py-2 text-xs font-mono font-medium text-[#101A17] ring-1 ring-[#0D6E52]/20 focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
          />

          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="min-h-[42px] rounded-full bg-[#0D6E52] hover:bg-[#095740] active:scale-[0.98] text-white px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <DownloadSimple size={15} weight="bold" />
            <span>Unduh Laporan Lengkap</span>
          </button>
        </div>
      </div>

      {/* KPI Cards with Animated Teal Hero Accent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BezelCard variant="teal-hero" innerClassName="p-4">
          <p className="text-xs text-white/80">
            Pemasukan ({formatMonthLabel(selectedMonth)})
          </p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#7AF0CB] tabular-nums">
            +{formatIDR(analytics.monthIncome)}
          </p>
        </BezelCard>

        <BezelCard innerClassName="p-4">
          <p className="text-xs text-[#52635D]">
            Pengeluaran ({formatMonthLabel(selectedMonth)})
          </p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#C83E37] tabular-nums">
            -{formatIDR(analytics.monthExpense)}
          </p>
        </BezelCard>

        <BezelCard innerClassName="p-4">
          <p className="text-xs text-[#52635D]">Arus Kas Bersih (Net)</p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#101A17] tabular-nums">
            {formatIDR(analytics.monthNet)}
          </p>
        </BezelCard>

        <BezelCard variant="teal-tinted" innerClassName="p-4">
          <p className="text-xs font-medium text-[#0D6E52]">
            Savings Rate Bulan Ini
          </p>
          <p className="mt-1 font-mono text-xl font-semibold text-[#0D6E52] tabular-nums">
            {analytics.savingsRate}%
          </p>
        </BezelCard>
      </div>

      {/* Asymmetric Bento Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BezelCard className="lg:col-span-7">
          <div className="mb-3">
            <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
              Diagram Arus Kas 6 Bulan
            </h2>
            <p className="text-xs text-[#52635D]">
              Klik bulan mana saja untuk melihat sorotan penuh & memblur bulan
              lainnya
            </p>
          </div>
          <CashflowTrendChart data={analytics.monthlyCashflow} />
        </BezelCard>

        <BezelCard className="lg:col-span-5">
          <div className="mb-3">
            <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
              Komposisi Pengeluaran per Kategori
            </h2>
            <p className="text-xs text-[#52635D]">
              Periode {formatMonthLabel(selectedMonth)} · Tersinkron dengan
              tabel di bawah
            </p>
          </div>
          <CategoryDonutChart
            data={analytics.categoryBreakdown}
            totalExpense={analytics.monthExpense}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </BezelCard>
      </div>

      {/* Charts Row 2: Daily Spend Velocity + Wallet Balance Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <BezelCard className="lg:col-span-6">
          <div className="mb-3">
            <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
              Ritme Pengeluaran Harian
            </h2>
            <p className="text-xs text-[#52635D]">
              Distribusi pengeluaran dari tanggal 1 s/d akhir{" "}
              {formatMonthLabel(selectedMonth)}
            </p>
          </div>
          <DailySpendAreaChart data={analytics.dailySpend} />
        </BezelCard>

        <BezelCard className="lg:col-span-6">
          <div className="mb-3">
            <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
              Distribusi Saldo Antar Kantong
            </h2>
            <p className="text-xs text-[#52635D]">
              Klik kantong untuk mengangkatnya ke urutan pertama & memblur yang
              lain
            </p>
          </div>
          <WalletDistributionBarChart wallets={session.wallets} />
        </BezelCard>
      </div>

      {/* Interactive Category Breakdown Table (Synchronized with Donut Chart!) */}
      <BezelCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[#101A17]">
              Rincian Kategori Pengeluaran ({formatMonthLabel(selectedMonth)})
            </h2>
            <p className="text-xs text-[#52635D]">
              Klik salah satu baris kategori (misal: Belanja Rumah) untuk
              mengangkatnya ke atas & memblur kategori lain
            </p>
          </div>

          {selectedCategoryId && (
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-pill-animated text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm cursor-pointer self-start sm:self-auto"
            >
              <ArrowCounterClockwise size={13} weight="bold" />
              <span>Tampilkan Semua Kategori</span>
            </button>
          )}
        </div>

        {orderedCategoryBreakdown.length === 0 ? (
          <p className="text-xs text-[#52635D] py-6 text-center">
            Belum ada catatan pengeluaran pada periode ini.
          </p>
        ) : (
          <LayoutGroup id="analytics-category-detail-list">
            <div className="space-y-2.5">
              {orderedCategoryBreakdown.map((cat) => {
                const avgTx = Math.round(
                  cat.amount / Math.max(1, cat.transaction_count)
                );
                const isSelected = selectedCategoryId === cat.category_id;
                const isBlurred = selectedCategoryId !== null && !isSelected;

                return (
                  <motion.div
                    layout
                    key={cat.category_id}
                    transition={{
                      layout: { type: "spring", stiffness: 360, damping: 28 },
                    }}
                    className={`w-full rounded-2xl transition-all duration-300 ${
                      isSelected
                        ? "bg-teal-animated text-white shadow-[0_14px_30px_-8px_rgba(13,110,82,0.48)] -translate-y-1 scale-[1.015] ring-2 ring-[#139A7E]"
                        : isBlurred
                        ? "bg-[#F3F7F5] text-[#52635D] opacity-35 blur-[1.8px] scale-[0.98] hover:opacity-75 hover:blur-[0.5px]"
                        : "bg-[#F3F7F5] hover:bg-[#E2F4EE]/70 text-[#101A17] ring-1 ring-[#0D6E52]/[0.08]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCategoryId((prev) =>
                          prev === cat.category_id ? null : cat.category_id
                        )
                      }
                      className="w-full p-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          style={{
                            backgroundColor: isSelected
                              ? "rgba(255,255,255,0.2)"
                              : `${cat.color}18`,
                            color: isSelected ? "#FFFFFF" : cat.color,
                          }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        >
                          <CategoryIcon
                            name={cat.icon}
                            size={20}
                            weight="duotone"
                          />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{cat.name}</p>
                            {isSelected && (
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
                                Fokus Terpilih · Naik ke Atas
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs mt-0.5 ${
                              isSelected ? "text-white/80" : "text-[#52635D]"
                            }`}
                          >
                            {cat.transaction_count} transaksi · Rata-rata{" "}
                            <span className="font-mono tabular-nums font-semibold">
                              {formatIDR(avgTx)}
                            </span>{" "}
                            / transaksi
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:min-w-[260px] justify-end">
                        <div
                          className={`w-28 h-2.5 rounded-full overflow-hidden hidden sm:block ${
                            isSelected ? "bg-white/20" : "bg-[#E2ECE8]"
                          }`}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, cat.percentage)}%`,
                              backgroundColor: isSelected
                                ? "#7AF0CB"
                                : cat.color,
                            }}
                            className="h-full rounded-full transition-all"
                          />
                        </div>
                        <span
                          className={`font-mono text-xs tabular-nums w-11 text-right font-semibold ${
                            isSelected ? "text-[#7AF0CB]" : "text-[#52635D]"
                          }`}
                        >
                          {cat.percentage}%
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums min-w-[115px] text-right">
                          {formatIDR(cat.amount)}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Transactions inside the Elevated Spotlight Card */}
                    <AnimatePresence>
                      {isSelected && focusedCategoryTransactions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-4 pt-2 border-t border-white/15 space-y-2"
                        >
                          <p className="text-[11px] font-medium text-white/80">
                            Rincian Transaksi di Kategori {cat.name}:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {focusedCategoryTransactions.map((tx) => (
                              <div
                                key={tx.id}
                                className="rounded-xl bg-white/12 backdrop-blur-xs px-3 py-2 ring-1 ring-white/15 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold text-white truncate">
                                    {tx.note || tx.category_name}
                                  </p>
                                  <p className="text-[10px] text-white/75 truncate">
                                    {formatDateID(tx.occurred_at)} ·{" "}
                                    {tx.wallet_name} · oleh {tx.creator_name}
                                  </p>
                                </div>
                                <span className="font-mono font-semibold text-[#7AF0CB] tabular-nums shrink-0">
                                  {formatIDR(tx.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </LayoutGroup>
        )}
      </BezelCard>

      <ReportDownloadModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        accountName={session.user.full_name}
        accountEmail={session.user.email}
        spaceName={session.activeSpace.name}
        spaceType={session.activeSpace.type}
        transactions={transactions}
        wallets={session.wallets}
        defaultMonth={selectedMonth}
      />
    </div>
  );
}
