"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  DownloadSimple,
  Funnel,
  MagnifyingGlass,
  Trash,
} from "@phosphor-icons/react";
import { BezelCard } from "@/components/ui/bezel-card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState, ErrorBanner } from "@/components/ui/empty-state";
import { ModalSheet } from "@/components/ui/modal-sheet";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { ReportDownloadModal } from "@/components/reports/report-download-modal";
import { deleteTransactionAction } from "@/actions/transactions";
import {
  formatIDR,
  formatRelativeDateHeading,
} from "@/lib/format";
import type {
  AppSessionContext,
  TransactionWithRelations,
} from "@/lib/types/database";

export function TransactionsClient({
  session,
  initialTransactions,
  currentMonth,
}: {
  session: AppSessionContext;
  initialTransactions: TransactionWithRelations[];
  currentMonth: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentMonth]);
    for (const tx of initialTransactions) {
      set.add(tx.occurred_at.slice(0, 7));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [initialTransactions, currentMonth]);

  const filtered = useMemo(() => {
    return initialTransactions.filter((tx) => {
      if (monthFilter !== "all" && !tx.occurred_at.startsWith(monthFilter)) {
        return false;
      }
      if (typeFilter !== "all" && tx.type !== typeFilter) {
        return false;
      }
      if (
        walletFilter !== "all" &&
        tx.wallet_id !== walletFilter &&
        tx.destination_wallet_id !== walletFilter
      ) {
        return false;
      }
      if (categoryFilter !== "all" && tx.category_id !== categoryFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchNote = (tx.note ?? "").toLowerCase().includes(q);
        const matchCat = (tx.category_name ?? "").toLowerCase().includes(q);
        const matchWallet = tx.wallet_name.toLowerCase().includes(q);
        const matchCreator = tx.creator_name.toLowerCase().includes(q);
        if (!matchNote && !matchCat && !matchWallet && !matchCreator) {
          return false;
        }
      }
      return true;
    });
  }, [
    initialTransactions,
    monthFilter,
    typeFilter,
    walletFilter,
    categoryFilter,
    search,
  ]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, TransactionWithRelations[]>();
    for (const tx of filtered) {
      const dateKey = tx.occurred_at.slice(0, 10);
      const list = groups.get(dateKey) ?? [];
      list.push(tx);
      groups.set(dateKey, list);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === "income") income += tx.amount;
      else if (tx.type === "expense") expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [filtered]);

  function handleDelete(id: string) {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await deleteTransactionAction(id);
      if (!res.ok) {
        setErrorMessage(res.error);
        return;
      }
      router.refresh();
    });
  }

  function resetFilters() {
    setSearch("");
    setMonthFilter("all");
    setTypeFilter("all");
    setWalletFilter("all");
    setCategoryFilter("all");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#141916]">
            Riwayat Transaksi
          </h1>
          <p className="text-xs text-[#5A655E] mt-1">
            Seluruh pemasukan, pengeluaran, dan transfer di{" "}
            <span className="font-semibold text-[#141916]">
              {session.activeSpace.name}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="min-h-[44px] rounded-full bg-white hover:bg-[#EFEFE9] active:scale-[0.98] text-[#141916] px-4 py-2.5 text-xs font-semibold flex items-center gap-2 ring-1 ring-[#141916]/12 transition-all cursor-pointer"
          >
            <DownloadSimple
              size={16}
              weight="bold"
              className="text-[#0D6E52]"
            />
            <span>Unduh Laporan</span>
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="min-h-[44px] rounded-full bg-[#0D6E52] hover:bg-[#095740] active:scale-[0.98] text-white px-5 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Calculator size={16} weight="duotone" />
            <span>+ Catat Transaksi Baru</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <ErrorBanner
          message={errorMessage}
          onRetry={() => setErrorMessage(null)}
        />
      )}

      {/* Filter Bar + Filtered Summary */}
      <BezelCard innerClassName="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <MagnifyingGlass
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A655E]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari catatan, kategori, kantong..."
              aria-label="Cari transaksi"
              className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] pl-9 pr-3.5 py-2 text-xs text-[#141916] placeholder:text-[#5A655E]/70 ring-1 ring-[#141916]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            />
          </div>

          {/* Month Filter */}
          <div className="lg:col-span-2">
            <select
              aria-label="Filter bulan"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs text-[#141916] ring-1 ring-[#141916]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            >
              <option value="all">Semua Bulan</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  Bulan {m}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="lg:col-span-2">
            <select
              aria-label="Filter tipe transaksi"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs text-[#141916] ring-1 ring-[#141916]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            >
              <option value="all">Semua Tipe</option>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          {/* Wallet Filter */}
          <div className="lg:col-span-2">
            <select
              aria-label="Filter kantong"
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs text-[#141916] ring-1 ring-[#141916]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            >
              <option value="all">Semua Kantong</option>
              {session.wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-2">
            <select
              aria-label="Filter kategori"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs text-[#141916] ring-1 ring-[#141916]/10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            >
              <option value="all">Semua Kategori</option>
              {session.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="pt-3 border-t border-[#141916]/[0.07] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#5A655E]">
            <Funnel size={14} weight="duotone" className="text-[#0D6E52]" />
            <span>Menampilkan {filtered.length} transaksi</span>
            {(search ||
              monthFilter !== "all" ||
              typeFilter !== "all" ||
              walletFilter !== "all" ||
              categoryFilter !== "all") && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[#0D6E52] font-semibold hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
            <span>
              Masuk:{" "}
              <strong className="text-[#0D6E52]">
                +{formatIDR(summary.income)}
              </strong>
            </span>
            <span>
              Keluar:{" "}
              <strong className="text-[#C83E37]">
                -{formatIDR(summary.expense)}
              </strong>
            </span>
            <span>
              Selisih:{" "}
              <strong className="text-[#141916]">
                {formatIDR(summary.net)}
              </strong>
            </span>
          </div>
        </div>
      </BezelCard>

      {/* Grouped Transaction List */}
      {groupedByDate.length === 0 ? (
        <EmptyState
          icon="Receipt"
          title="Tidak Ada Transaksi Ditemukan"
          description="Belum ada transaksi yang cocok dengan filter pencarian ini, atau ruang ini belum memiliki catatan."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-full bg-[#EFEFE9] text-[#141916] px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Reset Filter
              </button>
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="rounded-full bg-[#0D6E52] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                + Catat Transaksi
              </button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([dateKey, items]) => {
            const dailyDelta = items.reduce((acc, tx) => {
              if (tx.type === "income") return acc + tx.amount;
              if (tx.type === "expense") return acc - tx.amount;
              return acc;
            }, 0);

            return (
              <BezelCard key={dateKey} innerClassName="p-4 md:p-5">
                <div className="pb-3 mb-3 border-b border-[#141916]/[0.07] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#141916]">
                    {formatRelativeDateHeading(dateKey)}
                  </span>
                  <span className="font-mono text-xs font-medium text-[#5A655E] tabular-nums">
                    {dailyDelta >= 0 ? "+" : ""}
                    {formatIDR(dailyDelta)}
                  </span>
                </div>

                <div className="divide-y divide-[#141916]/[0.06]">
                  {items.map((tx) => (
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
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        >
                          <CategoryIcon
                            name={tx.category_icon}
                            size={19}
                            weight="duotone"
                          />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#141916] truncate">
                            {tx.note || tx.category_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5A655E] mt-0.5">
                            <span className="font-medium text-[#141916]/80">
                              {tx.category_name}
                            </span>
                            <span>·</span>
                            <span>
                              {tx.wallet_name}
                              {tx.destination_wallet_name
                                ? ` → ${tx.destination_wallet_name}`
                                : ""}
                            </span>
                            <span>·</span>
                            <span>Dicatat oleh {tx.creator_name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`font-mono text-sm font-semibold tabular-nums ${
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

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDelete(tx.id)}
                          title="Hapus transaksi & kembalikan saldo"
                          aria-label="Hapus transaksi"
                          className="min-w-[34px] min-h-[34px] rounded-xl bg-[#F6F7F4] hover:bg-[#C83E37]/10 text-[#5A655E] hover:text-[#C83E37] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </BezelCard>
            );
          })}
        </div>
      )}

      <ModalSheet
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={`Catat Transaksi · ${session.activeSpace.name}`}
        subtitle="Kalkulator nominal built-in aktif."
      >
        <TransactionForm
          spaceId={session.activeSpace.id}
          wallets={session.wallets}
          categories={session.categories}
          onSuccess={() => setAddModalOpen(false)}
        />
      </ModalSheet>

      <ReportDownloadModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        accountName={session.user.full_name}
        accountEmail={session.user.email}
        spaceName={session.activeSpace.name}
        spaceType={session.activeSpace.type}
        transactions={initialTransactions}
        wallets={session.wallets}
        defaultMonth={monthFilter !== "all" ? monthFilter : currentMonth}
      />
    </div>
  );
}
