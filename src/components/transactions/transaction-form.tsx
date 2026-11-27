"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowsLeftRight,
  Check,
  Plus,
  WarningCircle,
} from "@phosphor-icons/react";
import { AmountCalculator } from "@/components/calculator/amount-calculator";
import { CategoryIcon, AVAILABLE_ICONS } from "@/components/ui/category-icon";
import { createTransactionAction } from "@/actions/transactions";
import { createCategoryAction } from "@/actions/categories";
import { formatIDR, getTodayISO } from "@/lib/format";
import type { Category, TransactionType, Wallet } from "@/lib/types/database";

const CATEGORY_COLORS = [
  "#0D6E52",
  "#2B5B84",
  "#C4781A",
  "#B84A39",
  "#4F6D5A",
  "#2A7B76",
  "#6D5D7A",
  "#8C6D46",
];

export function TransactionForm({
  spaceId,
  wallets,
  categories,
  defaultType = "expense",
  onSuccess,
}: {
  spaceId: string;
  wallets: Wallet[];
  categories: Category[];
  defaultType?: TransactionType;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<number>(0);
  const [walletId, setWalletId] = useState<string>(wallets[0]?.id ?? "");
  const [destinationWalletId, setDestinationWalletId] = useState<string>(
    wallets[1]?.id ?? wallets[0]?.id ?? ""
  );

  const filteredCategories = categories.filter((c) =>
    type === "income" ? c.type === "income" : c.type === "expense"
  );

  const [categoryId, setCategoryId] = useState<string>(
    filteredCategories[0]?.id ?? ""
  );
  const [occurredAt, setOccurredAt] = useState<string>(getTodayISO());
  const [note, setNote] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline custom category creator
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Tag");
  const [newCatColor, setNewCatColor] = useState("#0D6E52");

  function handleTypeSwitch(nextType: TransactionType) {
    setType(nextType);
    setErrorMsg(null);
    if (nextType !== "transfer") {
      const firstCat = categories.find((c) => c.type === nextType);
      setCategoryId(firstCat?.id ?? "");
    }
  }

  function handleCreateCustomCategory() {
    if (!newCatName.trim()) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await createCategoryAction({
        spaceId,
        name: newCatName.trim(),
        type: type === "income" ? "income" : "expense",
        icon: newCatIcon,
        color: newCatColor,
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      setCategoryId(res.data.categoryId);
      setNewCatName("");
      setShowNewCat(false);
      router.refresh();
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const activeCatId =
      type === "transfer"
        ? null
        : categoryId || filteredCategories[0]?.id || null;

    startTransition(async () => {
      const res = await createTransactionAction({
        spaceId,
        type,
        walletId,
        destinationWalletId: type === "transfer" ? destinationWalletId : null,
        categoryId: activeCatId,
        amount,
        occurredAt,
        note,
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      router.refresh();
      if (onSuccess) onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Type Selector Tabs */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#EFEFE9] p-1">
        <button
          type="button"
          onClick={() => handleTypeSwitch("expense")}
          className={`min-h-[40px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            type === "expense"
              ? "bg-white text-[#141916] shadow-xs"
              : "text-[#5A655E] hover:text-[#141916]"
          }`}
        >
          <ArrowUpRight
            size={15}
            weight="bold"
            className={type === "expense" ? "text-[#C83E37]" : ""}
          />
          <span>Pengeluaran</span>
        </button>

        <button
          type="button"
          onClick={() => handleTypeSwitch("income")}
          className={`min-h-[40px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            type === "income"
              ? "bg-white text-[#141916] shadow-xs"
              : "text-[#5A655E] hover:text-[#141916]"
          }`}
        >
          <ArrowDownLeft
            size={15}
            weight="bold"
            className={type === "income" ? "text-[#0D6E52]" : ""}
          />
          <span>Pemasukan</span>
        </button>

        <button
          type="button"
          onClick={() => handleTypeSwitch("transfer")}
          className={`min-h-[40px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            type === "transfer"
              ? "bg-white text-[#141916] shadow-xs"
              : "text-[#5A655E] hover:text-[#141916]"
          }`}
        >
          <ArrowsLeftRight
            size={15}
            weight="bold"
            className={type === "transfer" ? "text-[#2B5B84]" : ""}
          />
          <span>Transfer</span>
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-[#C83E37]/10 border border-[#C83E37]/25 px-3.5 py-2.5 text-xs text-[#C83E37] flex items-center gap-2"
        >
          <WarningCircle size={16} weight="fill" className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Built-in Calculator Amount Input */}
      <AmountCalculator
        value={amount}
        onChange={setAmount}
        label={
          type === "expense"
            ? "Nominal Pengeluaran (Kalkulator Aktif)"
            : type === "income"
            ? "Nominal Pemasukan (Kalkulator Aktif)"
            : "Nominal Transfer Antar Kantong"
        }
      />

      {/* Wallet Selector(s) */}
      <div
        className={`grid gap-3 ${
          type === "transfer" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="tx-wallet"
            className="text-xs font-medium text-[#141916]"
          >
            {type === "transfer" ? "Dari Kantong Asal" : "Pilih Kantong / Dompet"}
          </label>
          <select
            id="tx-wallet"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/[0.12] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({formatIDR(w.balance)})
              </option>
            ))}
          </select>
        </div>

        {type === "transfer" && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tx-dest-wallet"
              className="text-xs font-medium text-[#141916]"
            >
              Ke Kantong Tujuan
            </label>
            <select
              id="tx-dest-wallet"
              value={destinationWalletId}
              onChange={(e) => setDestinationWalletId(e.target.value)}
              className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/[0.12] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatIDR(w.balance)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Category Selector (for Expense / Income) */}
      {type !== "transfer" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#141916]">
              Pilih Kategori
            </span>
            <button
              type="button"
              onClick={() => setShowNewCat((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#0D6E52] hover:text-[#095740] cursor-pointer"
            >
              <Plus size={13} weight="bold" />
              <span>{showNewCat ? "Batal" : "Kategori Baru"}</span>
            </button>
          </div>

          {showNewCat && (
            <div className="rounded-xl bg-[#F6F7F4] p-3 ring-1 ring-[#141916]/10 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nama kategori baru..."
                  className="min-h-[40px] rounded-lg bg-white px-3 py-1.5 text-xs text-[#141916] ring-1 ring-[#141916]/12 focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
                />
                <select
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="min-h-[40px] rounded-lg bg-white px-2.5 py-1.5 text-xs text-[#141916] ring-1 ring-[#141916]/12"
                >
                  {AVAILABLE_ICONS.map((ic) => (
                    <option key={ic} value={ic}>
                      Ikon: {ic}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {CATEGORY_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewCatColor(col)}
                      style={{ backgroundColor: col }}
                      aria-label={`Pilih warna ${col}`}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                        newCatColor === col
                          ? "scale-110 ring-2 ring-offset-1 ring-[#141916]"
                          : "opacity-75"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={isPending || !newCatName.trim()}
                  onClick={handleCreateCustomCategory}
                  className="rounded-lg bg-[#0D6E52] text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50 cursor-pointer"
                >
                  Tambah
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
            {filteredCategories.map((cat) => {
              const selected =
                (categoryId || filteredCategories[0]?.id) === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`min-h-[42px] rounded-xl px-2.5 py-2 text-left flex items-center gap-2 transition-all cursor-pointer ${
                    selected
                      ? "bg-[#E6F4EF] text-[#0D6E52] ring-2 ring-[#0D6E52]"
                      : "bg-[#F6F7F4] hover:bg-[#EFEFE9] text-[#141916] ring-1 ring-[#141916]/[0.06]"
                  }`}
                >
                  <span
                    style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <CategoryIcon name={cat.icon} size={15} weight="duotone" />
                  </span>
                  <span className="text-xs font-medium truncate">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Date & Note */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-5 flex flex-col gap-1.5">
          <label
            htmlFor="tx-date"
            className="text-xs font-medium text-[#141916]"
          >
            Tanggal
          </label>
          <input
            id="tx-date"
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs font-mono text-[#141916] ring-1 ring-[#141916]/[0.12] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52] tabular-nums"
          />
        </div>

        <div className="sm:col-span-7 flex flex-col gap-1.5">
          <label
            htmlFor="tx-note"
            className="text-xs font-medium text-[#141916]"
          >
            Catatan (Opsional)
          </label>
          <input
            id="tx-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: Belanja sayur & buah mingguan"
            className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] placeholder:text-[#5A655E]/60 ring-1 ring-[#141916]/[0.12] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || amount <= 0 || wallets.length === 0}
        className="min-h-[46px] w-full rounded-full bg-[#0D6E52] hover:bg-[#095740] active:scale-[0.98] disabled:opacity-50 text-white px-5 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Check size={17} weight="bold" />
        <span>
          {isPending
            ? "Menyimpan..."
            : `Simpan ${
                type === "expense"
                  ? "Pengeluaran"
                  : type === "income"
                  ? "Pemasukan"
                  : "Transfer"
              } ${amount > 0 ? formatIDR(amount) : ""}`}
        </span>
      </button>
    </form>
  );
}
