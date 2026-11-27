"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowsLeftRight,
  Check,
  PencilSimple,
  Plus,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { BezelCard } from "@/components/ui/bezel-card";
import { CategoryIcon, AVAILABLE_ICONS } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ModalSheet } from "@/components/ui/modal-sheet";
import { AmountCalculator } from "@/components/calculator/amount-calculator";
import {
  archiveWalletAction,
  createWalletAction,
  transferBetweenWalletsAction,
  updateWalletAction,
} from "@/actions/wallets";
import { formatIDR, getTodayISO } from "@/lib/format";
import type {
  AppSessionContext,
  Wallet,
  WalletType,
} from "@/lib/types/database";

const WALLET_TYPES: Array<{ value: WalletType; label: string }> = [
  { value: "bank", label: "Rekening Bank" },
  { value: "ewallet", label: "E-Wallet / Dompet Digital" },
  { value: "cash", label: "Uang Tunai / Kas" },
  { value: "savings", label: "Kantong Tabungan" },
  { value: "investment", label: "Kantong Investasi" },
];

const WALLET_COLORS = [
  "#0D6E52",
  "#2B5B84",
  "#C4781A",
  "#B84A39",
  "#4F6D5A",
  "#2A7B76",
  "#6D5D7A",
  "#8C6D46",
];

export function WalletsClient({ session }: { session: AppSessionContext }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create Wallet Form State
  const [targetSpaceId, setTargetSpaceId] = useState<string>(
    session.activeSpace.id
  );
  const [name, setName] = useState("");
  const [type, setType] = useState<WalletType>("bank");
  const [initialBalance, setInitialBalance] = useState(0);
  const [color, setColor] = useState("#0D6E52");
  const [icon, setIcon] = useState("Wallet");

  // Transfer Form State
  const [sourceWalletId, setSourceWalletId] = useState<string>(
    session.wallets[0]?.id ?? ""
  );
  const [destinationWalletId, setDestinationWalletId] = useState<string>(
    session.wallets[1]?.id ?? session.wallets[0]?.id ?? ""
  );
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferDate, setTransferDate] = useState<string>(getTodayISO());
  const [transferNote, setTransferNote] = useState<string>("");

  const totalBalance = session.wallets.reduce((acc, w) => acc + w.balance, 0);

  function openCreateModal() {
    setTargetSpaceId(session.activeSpace.id);
    setName("");
    setType("bank");
    setInitialBalance(0);
    setColor("#0D6E52");
    setIcon("Wallet");
    setErrorMsg(null);
    setCreateOpen(true);
  }

  function openEditModal(wallet: Wallet) {
    setEditingWallet(wallet);
    setName(wallet.name);
    setType(wallet.type);
    setColor(wallet.color);
    setIcon(wallet.icon);
    setErrorMsg(null);
  }

  function handleCreateWallet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await createWalletAction({
        spaceId: targetSpaceId,
        name,
        type,
        initialBalance,
        color,
        icon,
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      setCreateOpen(false);
      router.refresh();
    });
  }

  function handleUpdateWallet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingWallet) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await updateWalletAction({
        id: editingWallet.id,
        name,
        type,
        color,
        icon,
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      setEditingWallet(null);
      router.refresh();
    });
  }

  function handleArchiveWallet(walletId: string) {
    startTransition(async () => {
      await archiveWalletAction(walletId);
      router.refresh();
    });
  }

  function handleTransferSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await transferBetweenWalletsAction({
        spaceId: session.activeSpace.id,
        sourceWalletId,
        destinationWalletId,
        amount: transferAmount,
        occurredAt: transferDate,
        note: transferNote,
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      setTransferOpen(false);
      setTransferAmount(0);
      setTransferNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#141916]">
            Multi-Kantong & Dompet
          </h1>
          <p className="text-xs text-[#5A655E] mt-1">
            Pisahkan alokasi dana ke banyak kantong di{" "}
            <span className="font-semibold text-[#141916]">
              {session.activeSpace.name}
            </span>{" "}
            atau bagikan ke Ruang Keluarga.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session.wallets.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setSourceWalletId(session.wallets[0]?.id ?? "");
                setDestinationWalletId(session.wallets[1]?.id ?? "");
                setErrorMsg(null);
                setTransferOpen(true);
              }}
              className="min-h-[42px] rounded-full bg-[#EFEFE9] hover:bg-[#E4E5DD] text-[#141916] px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowsLeftRight size={15} weight="bold" className="text-[#0D6E52]" />
              <span>Transfer Antar Kantong</span>
            </button>
          )}

          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[42px] rounded-full bg-[#0D6E52] hover:bg-[#095740] active:scale-[0.98] text-white px-5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={15} weight="bold" />
            <span>Tambah Kantong Baru</span>
          </button>
        </div>
      </div>

      {/* Total Balance Overview Banner */}
      <BezelCard innerClassName="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-[#5A655E]">
            Akumulasi Saldo ({session.wallets.length} Kantong Aktif)
          </span>
          <p className="mt-1 font-mono text-3xl font-semibold tracking-tight text-[#141916] tabular-nums">
            {formatIDR(totalBalance)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EF] px-3.5 py-1.5 text-xs font-semibold text-[#0D6E52]">
            <UsersThree size={16} weight="duotone" />
            <span>
              {session.activeSpace.type === "family"
                ? `Dibagikan ke ${session.activeSpace.member_count} anggota keluarga`
                : "Kantong Privat (Hanya Anda)"}
            </span>
          </span>
        </div>
      </BezelCard>

      {/* Wallets Grid */}
      {session.wallets.length === 0 ? (
        <EmptyState
          icon="Wallet"
          title="Belum Ada Kantong Aktif"
          description="Buat kantong untuk rekening bank, e-wallet, dana darurat, atau kantong belanja keluarga."
          action={
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-full bg-[#0D6E52] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              + Buat Kantong Pertama
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          {session.wallets.map((w, idx) => {
            const colSpan =
              idx === 0 && session.wallets.length % 2 !== 0
                ? "lg:col-span-6"
                : "lg:col-span-6";
            const shareRatio =
              totalBalance > 0
                ? Math.max(0, Math.round((w.balance / totalBalance) * 100))
                : 0;

            return (
              <BezelCard
                key={w.id}
                className={colSpan}
                innerClassName="flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        style={{
                          backgroundColor: `${w.color}18`,
                          color: w.color,
                        }}
                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      >
                        <CategoryIcon name={w.icon} size={22} weight="duotone" />
                      </span>
                      <div>
                        <h2 className="text-base font-semibold tracking-tight text-[#141916]">
                          {w.name}
                        </h2>
                        <span className="text-xs text-[#5A655E]">
                          {WALLET_TYPES.find((t) => t.value === w.type)?.label ??
                            w.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(w)}
                        title="Ubah kantong"
                        aria-label="Ubah kantong"
                        className="min-w-[34px] min-h-[34px] rounded-xl bg-[#F6F7F4] hover:bg-[#EFEFE9] text-[#5A655E] hover:text-[#141916] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <PencilSimple size={15} />
                      </button>
                      {session.wallets.length > 1 && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleArchiveWallet(w.id)}
                          title="Arsipkan kantong"
                          aria-label="Arsipkan kantong"
                          className="min-w-[34px] min-h-[34px] rounded-xl bg-[#F6F7F4] hover:bg-[#C83E37]/10 text-[#5A655E] hover:text-[#C83E37] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Archive size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs text-[#5A655E]">Saldo Saat Ini</p>
                    <p className="mt-0.5 font-mono text-2xl font-semibold tracking-tight text-[#141916] tabular-nums">
                      {formatIDR(w.balance)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#141916]/[0.07] space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#5A655E]">
                    <span>Porsi dari total saldo ruang</span>
                    <span className="font-mono font-semibold text-[#141916] tabular-nums">
                      {shareRatio}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#EFEFE9] overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(100, shareRatio)}%`,
                        backgroundColor: w.color,
                      }}
                      className="h-full rounded-full transition-all"
                    />
                  </div>
                </div>
              </BezelCard>
            );
          })}
        </div>
      )}

      {/* Create New Wallet Modal */}
      <ModalSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tambah Kantong / Dompet Baru"
        subtitle="Bisa ditaruh di Ruang Pribadi atau langsung dibagi ke Ruang Keluarga."
      >
        <form onSubmit={handleCreateWallet} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-[#C83E37]/10 border border-[#C83E37]/25 px-3.5 py-2.5 text-xs text-[#C83E37] flex items-center gap-2">
              <WarningCircle size={16} weight="fill" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Choose Ownership Space: Personal or Family */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="w-space"
              className="text-xs font-medium text-[#141916]"
            >
              Kepemilikan & Visibilitas Kantong
            </label>
            <select
              id="w-space"
              value={targetSpaceId}
              onChange={(e) => setTargetSpaceId(e.target.value)}
              className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            >
              {session.spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name} (
                  {sp.type === "family"
                    ? `Dibagikan ke ${sp.member_count} anggota keluarga`
                    : "Hanya Pribadi"}
                  )
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="w-name"
                className="text-xs font-medium text-[#141916]"
              >
                Nama Kantong
              </label>
              <input
                id="w-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Belanja Dapur / BCA"
                className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="w-type"
                className="text-xs font-medium text-[#141916]"
              >
                Tipe Kantong
              </label>
              <select
                id="w-type"
                value={type}
                onChange={(e) => setType(e.target.value as WalletType)}
                className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
              >
                {WALLET_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <AmountCalculator
            value={initialBalance}
            onChange={setInitialBalance}
            label="Saldo Awal Kantong (Rp)"
            defaultOpenKeypad={false}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="w-icon"
                className="text-xs font-medium text-[#141916]"
              >
                Ikon Kantong
              </label>
              <select
                id="w-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/12"
              >
                {AVAILABLE_ICONS.map((ic) => (
                  <option key={ic} value={ic}>
                    {ic}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-[#141916]">
                Warna Penanda
              </span>
              <div className="min-h-[44px] flex items-center gap-2">
                {WALLET_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColor(col)}
                    style={{ backgroundColor: col }}
                    aria-label={`Warna ${col}`}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                      color === col
                        ? "scale-110 ring-2 ring-offset-2 ring-[#141916]"
                        : "opacity-75"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="min-h-[46px] w-full rounded-full bg-[#0D6E52] hover:bg-[#095740] disabled:opacity-50 text-white px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Check size={17} weight="bold" />
            <span>{isPending ? "Menyimpan..." : "Simpan Kantong"}</span>
          </button>
        </form>
      </ModalSheet>

      {/* Edit Wallet Modal */}
      <ModalSheet
        open={Boolean(editingWallet)}
        onClose={() => setEditingWallet(null)}
        title="Ubah Kantong"
      >
        <form onSubmit={handleUpdateWallet} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-w-name"
              className="text-xs font-medium text-[#141916]"
            >
              Nama Kantong
            </label>
            <input
              id="edit-w-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/12"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-w-type"
              className="text-xs font-medium text-[#141916]"
            >
              Tipe Kantong
            </label>
            <select
              id="edit-w-type"
              value={type}
              onChange={(e) => setType(e.target.value as WalletType)}
              className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/12"
            >
              {WALLET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {WALLET_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setColor(col)}
                style={{ backgroundColor: col }}
                className={`w-6 h-6 rounded-full cursor-pointer ${
                  color === col
                    ? "scale-110 ring-2 ring-offset-2 ring-[#141916]"
                    : "opacity-75"
                }`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="min-h-[46px] w-full rounded-full bg-[#0D6E52] text-white px-5 py-2.5 text-sm font-semibold cursor-pointer"
          >
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>
      </ModalSheet>

      {/* Transfer Between Wallets Modal */}
      <ModalSheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer Antar Kantong"
        subtitle="Memindahkan saldo antar kantong secara atomik tanpa tercatat sebagai pengeluaran."
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-[#C83E37]/10 border border-[#C83E37]/25 px-3.5 py-2.5 text-xs text-[#C83E37]">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="tf-src"
                className="text-xs font-medium text-[#141916]"
              >
                Dari Kantong Asal
              </label>
              <select
                id="tf-src"
                value={sourceWalletId}
                onChange={(e) => setSourceWalletId(e.target.value)}
                className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs text-[#141916] ring-1 ring-[#141916]/12"
              >
                {session.wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatIDR(w.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="tf-dst"
                className="text-xs font-medium text-[#141916]"
              >
                Ke Kantong Tujuan
              </label>
              <select
                id="tf-dst"
                value={destinationWalletId}
                onChange={(e) => setDestinationWalletId(e.target.value)}
                className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs text-[#141916] ring-1 ring-[#141916]/12"
              >
                {session.wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatIDR(w.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <AmountCalculator
            value={transferAmount}
            onChange={setTransferAmount}
            label="Nominal Transfer (Kalkulator Aktif)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="tf-date"
                className="text-xs font-medium text-[#141916]"
              >
                Tanggal Transfer
              </label>
              <input
                id="tf-date"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs font-mono text-[#141916] ring-1 ring-[#141916]/12"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="tf-note"
                className="text-xs font-medium text-[#141916]"
              >
                Catatan
              </label>
              <input
                id="tf-note"
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="Contoh: Alokasi tabungan"
                className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-xs text-[#141916] ring-1 ring-[#141916]/12"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || transferAmount <= 0}
            className="min-h-[46px] w-full rounded-full bg-[#0D6E52] hover:bg-[#095740] disabled:opacity-50 text-white px-5 py-2.5 text-sm font-semibold cursor-pointer"
          >
            {isPending
              ? "Memproses..."
              : `Transfer ${transferAmount > 0 ? formatIDR(transferAmount) : ""}`}
          </button>
        </form>
      </ModalSheet>
    </div>
  );
}
