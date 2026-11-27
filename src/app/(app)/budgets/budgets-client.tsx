"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { BezelCard } from "@/components/ui/bezel-card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ModalSheet } from "@/components/ui/modal-sheet";
import { AmountCalculator } from "@/components/calculator/amount-calculator";
import { deleteBudgetAction, upsertBudgetAction } from "@/actions/budgets";
import {
  formatIDR,
  formatMonthLabel,
  getDaysRemainingInMonth,
} from "@/lib/format";
import type {
  AppSessionContext,
  BudgetWithProgress,
} from "@/lib/types/database";

export function BudgetsClient({
  session,
  selectedMonth,
  budgets,
}: {
  session: AppSessionContext;
  selectedMonth: string;
  budgets: BudgetWithProgress[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);

  const expenseCategories = session.categories.filter(
    (c) => c.type === "expense"
  );

  const [categoryId, setCategoryId] = useState<string>(
    expenseCategories[0]?.id ?? ""
  );
  const [amountLimit, setAmountLimit] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalLimit = budgets.reduce((acc, b) => acc + b.amount_limit, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const totalRemaining = Math.max(0, totalLimit - totalSpent);
  const overallPercentage =
    totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const daysLeft = getDaysRemainingInMonth(selectedMonth);
  const safeDailySpend = Math.round(totalRemaining / Math.max(1, daysLeft));

  function openNewBudgetModal() {
    setCategoryId(expenseCategories[0]?.id ?? "");
    setAmountLimit(0);
    setErrorMsg(null);
    setModalOpen(true);
  }

  function openEditBudgetModal(budget: BudgetWithProgress) {
    setCategoryId(budget.category_id);
    setAmountLimit(budget.amount_limit);
    setErrorMsg(null);
    setModalOpen(true);
  }

  function handleSaveBudget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await upsertBudgetAction({
        spaceId: session.activeSpace.id,
        categoryId,
        month: selectedMonth,
        amountLimit,
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      setModalOpen(false);
      router.refresh();
    });
  }

  function handleDeleteBudget(id: string) {
    startTransition(async () => {
      await deleteBudgetAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#141916]">
            Anggaran Bulanan
          </h1>
          <p className="text-xs text-[#5A655E] mt-1">
            Atur batas pengeluaran per kategori untuk{" "}
            <span className="font-semibold text-[#141916]">
              {session.activeSpace.name}
            </span>{" "}
            · {formatMonthLabel(selectedMonth)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            aria-label="Pilih bulan anggaran"
            value={selectedMonth}
            onChange={(e) => {
              if (e.target.value) {
                router.push(`/budgets?month=${e.target.value}`);
              }
            }}
            className="min-h-[42px] rounded-full bg-white px-4 py-2 text-xs font-mono font-medium text-[#141916] ring-1 ring-[#141916]/12 focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
          />

          <button
            type="button"
            onClick={openNewBudgetModal}
            className="min-h-[42px] rounded-full bg-[#0D6E52] hover:bg-[#095740] active:scale-[0.98] text-white px-5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} weight="bold" />
            <span>Atur Anggaran Kategori</span>
          </button>
        </div>
      </div>

      {/* Overall Monthly Budget Summary Card */}
      <BezelCard innerClassName="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-[#F6F7F4] p-4 ring-1 ring-[#141916]/[0.05]">
            <p className="text-xs text-[#5A655E]">Total Plafon Anggaran</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#141916] tabular-nums">
              {formatIDR(totalLimit)}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F6F7F4] p-4 ring-1 ring-[#141916]/[0.05]">
            <p className="text-xs text-[#5A655E]">Terpakai Bulan Ini</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#C83E37] tabular-nums">
              {formatIDR(totalSpent)}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F6F7F4] p-4 ring-1 ring-[#141916]/[0.05]">
            <p className="text-xs text-[#5A655E]">Sisa Ruang Anggaran</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#0D6E52] tabular-nums">
              {formatIDR(totalRemaining)}
            </p>
          </div>

          <div className="rounded-2xl bg-[#E6F4EF] p-4 ring-1 ring-[#0D6E52]/15">
            <p className="text-xs font-medium text-[#0D6E52]">
              Batas Belanja Harian Aman ({daysLeft} hr)
            </p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#0D6E52] tabular-nums">
              {formatIDR(safeDailySpend)}
            </p>
          </div>
        </div>

        {totalLimit > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#5A655E]">
                Serapan Total Anggaran ({formatMonthLabel(selectedMonth)})
              </span>
              <span className="font-mono font-semibold text-[#141916] tabular-nums">
                {overallPercentage}%
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#EFEFE9] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  overallPercentage >= 100
                    ? "bg-[#C83E37]"
                    : overallPercentage >= 75
                    ? "bg-[#C4781A]"
                    : "bg-[#0D6E52]"
                }`}
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
          </div>
        )}
      </BezelCard>

      {/* Category Budgets Grid */}
      {budgets.length === 0 ? (
        <EmptyState
          icon="ChartPieSlice"
          title="Anggaran Bulan Ini Belum Diatur"
          description="Tetapkan batas pengeluaran per kategori (seperti Makan & Minum, Belanja Rumah, atau Tagihan) agar pengeluaran tetap terkendali."
          action={
            <button
              type="button"
              onClick={openNewBudgetModal}
              className="rounded-full bg-[#0D6E52] text-white px-5 py-2.5 text-xs font-semibold cursor-pointer"
            >
              + Buat Anggaran Pertama
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {budgets.map((b) => {
            const statusLabel =
              b.status === "over"
                ? "Melebihi Plafon"
                : b.status === "warning"
                ? "Waspada (≥75%)"
                : "Aman";

            const statusClasses =
              b.status === "over"
                ? "bg-[#C83E37]/12 text-[#C83E37]"
                : b.status === "warning"
                ? "bg-[#C4781A]/15 text-[#C4781A]"
                : "bg-[#E6F4EF] text-[#0D6E52]";

            const barColor =
              b.status === "over"
                ? "bg-[#C83E37]"
                : b.status === "warning"
                ? "bg-[#C4781A]"
                : "bg-[#0D6E52]";

            return (
              <BezelCard
                key={b.id}
                innerClassName="flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        backgroundColor: `${b.category_color}18`,
                        color: b.category_color,
                      }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    >
                      <CategoryIcon
                        name={b.category_icon}
                        size={20}
                        weight="duotone"
                      />
                    </span>
                    <div>
                      <h2 className="text-base font-semibold text-[#141916]">
                        {b.category_name}
                      </h2>
                      <span
                        className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClasses}`}
                      >
                        {statusLabel} · {b.percentage}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditBudgetModal(b)}
                      title="Ubah plafon anggaran"
                      aria-label="Ubah plafon anggaran"
                      className="min-w-[34px] min-h-[34px] rounded-xl bg-[#F6F7F4] hover:bg-[#EFEFE9] text-[#5A655E] hover:text-[#141916] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <PencilSimple size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDeleteBudget(b.id)}
                      title="Hapus anggaran"
                      aria-label="Hapus anggaran"
                      className="min-w-[34px] min-h-[34px] rounded-xl bg-[#F6F7F4] hover:bg-[#C83E37]/10 text-[#5A655E] hover:text-[#C83E37] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between font-mono tabular-nums">
                    <div>
                      <span className="text-xs text-[#5A655E] block font-sans">
                        Terpakai
                      </span>
                      <span className="text-lg font-semibold text-[#141916]">
                        {formatIDR(b.spent)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#5A655E] block font-sans">
                        Dari Plafon
                      </span>
                      <span className="text-sm font-medium text-[#5A655E]">
                        {formatIDR(b.amount_limit)}
                      </span>
                    </div>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-[#EFEFE9] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#5A655E] pt-1">
                    <span>
                      {b.remaining >= 0
                        ? "Sisa anggaran tersedia"
                        : "Melebihi batas anggaran"}
                    </span>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        b.remaining >= 0 ? "text-[#0D6E52]" : "text-[#C83E37]"
                      }`}
                    >
                      {formatIDR(Math.abs(b.remaining))}
                    </span>
                  </div>
                </div>
              </BezelCard>
            );
          })}
        </div>
      )}

      {/* Upsert Budget Modal with Built-in Calculator */}
      <ModalSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Atur Anggaran · ${formatMonthLabel(selectedMonth)}`}
        subtitle="Gunakan kalkulator untuk menghitung plafon pengeluaran bulanan."
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-[#C83E37]/10 border border-[#C83E37]/25 px-3.5 py-2.5 text-xs text-[#C83E37] flex items-center gap-2">
              <WarningCircle size={16} weight="fill" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="budget-cat"
              className="text-xs font-medium text-[#141916]"
            >
              Kategori Pengeluaran
            </label>
            <select
              id="budget-cat"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <AmountCalculator
            value={amountLimit}
            onChange={setAmountLimit}
            label="Batas Anggaran Bulanan (Rp)"
          />

          <button
            type="submit"
            disabled={isPending || amountLimit <= 0}
            className="min-h-[46px] w-full rounded-full bg-[#0D6E52] hover:bg-[#095740] disabled:opacity-50 text-white px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check size={17} weight="bold" />
            <span>
              {isPending
                ? "Menyimpan..."
                : `Simpan Plafon ${amountLimit > 0 ? formatIDR(amountLimit) : ""}`}
            </span>
          </button>
        </form>
      </ModalSheet>
    </div>
  );
}
