"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle,
  Clock,
  Plus,
  Trash,
  UserPlus,
  WarningCircle,
} from "@phosphor-icons/react";
import { BezelCard } from "@/components/ui/bezel-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ModalSheet } from "@/components/ui/modal-sheet";
import { AmountCalculator } from "@/components/calculator/amount-calculator";
import {
  createSplitBillAction,
  deleteSplitBillAction,
  toggleSplitParticipantPaidAction,
} from "@/actions/split-bills";
import { formatDateID, formatIDR, getTodayISO } from "@/lib/format";
import type {
  AppSessionContext,
  SplitBillWithParticipants,
  SplitMethod,
} from "@/lib/types/database";

interface DraftParticipant {
  key: string;
  userId: string | null;
  participantName: string;
  shareAmount: number;
  sharePercentage: number;
  isPaid: boolean;
}

export function SplitBillClient({
  session,
  splitBills,
}: {
  session: AppSessionContext;
  splitBills: SplitBillWithParticipants[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [recordToWalletOnPay, setRecordToWalletOnPay] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Split Bill Form State
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [extraFee, setExtraFee] = useState(0);
  const [method, setMethod] = useState<SplitMethod>("equal");
  const [paidByUserId, setPaidByUserId] = useState(session.user.id);
  const [walletId, setWalletId] = useState(session.wallets[0]?.id ?? "");
  const [occurredAt, setOccurredAt] = useState(getTodayISO());
  const [newFriendName, setNewFriendName] = useState("");

  const [participants, setParticipants] = useState<DraftParticipant[]>(() =>
    buildDefaultParticipants(session)
  );

  const grandTotal = totalAmount + extraFee;

  function buildDefaultParticipants(ctx: AppSessionContext): DraftParticipant[] {
    if (ctx.members.length >= 2) {
      return ctx.members.map((m, idx) => ({
        key: `m-${m.user_id}`,
        userId: m.user_id,
        participantName: m.profile.full_name,
        shareAmount: 0,
        sharePercentage: Math.round(100 / ctx.members.length),
        isPaid: idx === 0,
      }));
    }
    return [
      {
        key: `u-${ctx.user.id}`,
        userId: ctx.user.id,
        participantName: ctx.user.full_name,
        shareAmount: 0,
        sharePercentage: 50,
        isPaid: true,
      },
      {
        key: "guest-1",
        userId: null,
        participantName: "Teman Patungan 1",
        shareAmount: 0,
        sharePercentage: 50,
        isPaid: false,
      },
    ];
  }

  function recalculateShares(
    nextList: DraftParticipant[],
    nextGrandTotal: number,
    nextMethod: SplitMethod
  ): DraftParticipant[] {
    if (nextList.length === 0) return [];

    if (nextMethod === "equal") {
      const count = nextList.length;
      const base = Math.floor(nextGrandTotal / count);
      const remainder = nextGrandTotal - base * count;
      const pct = Number((100 / count).toFixed(2));
      return nextList.map((p, idx) => ({
        ...p,
        shareAmount: idx === 0 ? base + remainder : base,
        sharePercentage: pct,
      }));
    }

    if (nextMethod === "percentage") {
      let runningSum = 0;
      return nextList.map((p, idx) => {
        if (idx === nextList.length - 1) {
          return {
            ...p,
            shareAmount: Math.max(0, nextGrandTotal - runningSum),
          };
        }
        const amt = Math.round((nextGrandTotal * (p.sharePercentage || 0)) / 100);
        runningSum += amt;
        return { ...p, shareAmount: amt };
      });
    }

    return nextList;
  }

  function handleTotalAmountChange(nextTotal: number) {
    setTotalAmount(nextTotal);
    setParticipants((prev) =>
      recalculateShares(prev, nextTotal + extraFee, method)
    );
  }

  function handleExtraFeeChange(nextFee: number) {
    setExtraFee(nextFee);
    setParticipants((prev) =>
      recalculateShares(prev, totalAmount + nextFee, method)
    );
  }

  function handleMethodChange(nextMethod: SplitMethod) {
    setMethod(nextMethod);
    setParticipants((prev) =>
      recalculateShares(prev, grandTotal, nextMethod)
    );
  }

  function handleAddExternalParticipant() {
    if (!newFriendName.trim()) return;
    const nextList: DraftParticipant[] = [
      ...participants,
      {
        key: `ext-${Date.now()}`,
        userId: null,
        participantName: newFriendName.trim(),
        shareAmount: 0,
        sharePercentage: 0,
        isPaid: false,
      },
    ];
    if (method === "percentage") {
      const equalPct = Number((100 / nextList.length).toFixed(2));
      nextList.forEach((p) => {
        p.sharePercentage = equalPct;
      });
    }
    setParticipants(recalculateShares(nextList, grandTotal, method));
    setNewFriendName("");
  }

  function handleRemoveParticipant(key: string) {
    if (participants.length <= 2) return;
    const nextList = participants.filter((p) => p.key !== key);
    setParticipants(recalculateShares(nextList, grandTotal, method));
  }

  function handleCreateSplitBill(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const syncedParticipants = recalculateShares(
      participants,
      grandTotal,
      method
    );

    startTransition(async () => {
      const res = await createSplitBillAction({
        spaceId: session.activeSpace.id,
        title,
        totalAmount,
        extraFee,
        method,
        paidByUserId,
        walletId: walletId || null,
        occurredAt,
        participants: syncedParticipants.map((p) => ({
          userId: p.userId,
          participantName: p.participantName,
          shareAmount: p.shareAmount,
          sharePercentage: p.sharePercentage,
          isPaid: p.isPaid,
        })),
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      setCreateOpen(false);
      setTitle("");
      setTotalAmount(0);
      setExtraFee(0);
      router.refresh();
    });
  }

  function handleTogglePaid(participantId: string, currentPaid: boolean) {
    startTransition(async () => {
      await toggleSplitParticipantPaidAction({
        participantId,
        isPaid: !currentPaid,
        recordSettlementTransaction: recordToWalletOnPay,
      });
      router.refresh();
    });
  }

  function handleDeleteBill(id: string) {
    startTransition(async () => {
      await deleteSplitBillAction(id);
      router.refresh();
    });
  }

  const totalAllBills = splitBills.reduce((acc, b) => acc + b.grand_total, 0);
  const totalCollected = splitBills.reduce(
    (acc, b) => acc + b.collected_amount,
    0
  );
  const totalOutstanding = splitBills.reduce(
    (acc, b) => acc + b.outstanding_amount,
    0
  );

  const currentAllocated = participants.reduce(
    (acc, p) => acc + p.shareAmount,
    0
  );
  const unallocatedDiff = grandTotal - currentAllocated;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#141916]">
            Split Bill & Patungan
          </h1>
          <p className="text-xs text-[#5A655E] mt-1">
            Bagi tagihan makan, belanja rumah, atau liburan dengan metode Bagi
            Rata, Nominal Kustom, atau Persentase.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTitle("");
            setTotalAmount(0);
            setExtraFee(0);
            setMethod("equal");
            setParticipants(buildDefaultParticipants(session));
            setErrorMsg(null);
            setCreateOpen(true);
          }}
          className="min-h-[44px] rounded-full bg-[#0D6E52] hover:bg-[#095740] active:scale-[0.98] text-white px-5 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} weight="bold" />
          <span>Buat Split Bill Baru</span>
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BezelCard innerClassName="p-4">
          <p className="text-xs text-[#5A655E]">Total Tagihan Patungan</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#141916] tabular-nums">
            {formatIDR(totalAllBills)}
          </p>
        </BezelCard>

        <BezelCard innerClassName="p-4">
          <p className="text-xs text-[#5A655E]">Sudah Lunas / Terkumpul</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#0D6E52] tabular-nums">
            {formatIDR(totalCollected)}
          </p>
        </BezelCard>

        <BezelCard innerClassName="p-4">
          <p className="text-xs text-[#5A655E]">Belum Lunas (Piutang)</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#C4781A] tabular-nums">
            {formatIDR(totalOutstanding)}
          </p>
        </BezelCard>
      </div>

      {/* Auto-record toggle option */}
      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#141916]/[0.07] flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#141916]">
            Catat Pelunasan Otomatis ke Kantong Pembayar
          </p>
          <p className="text-[11px] text-[#5A655E]">
            Jika diaktifkan, saat Anda menandai peserta &ldquo;Lunas&rdquo;,
            saldo kantong penagih otomatis bertambah.
          </p>
        </div>
        <input
          type="checkbox"
          checked={recordToWalletOnPay}
          onChange={(e) => setRecordToWalletOnPay(e.target.checked)}
          className="w-5 h-5 accent-[#0D6E52] rounded cursor-pointer"
        />
      </div>

      {/* Split Bills List */}
      {splitBills.length === 0 ? (
        <EmptyState
          icon="Receipt"
          title="Belum Ada Split Bill"
          description="Buat catatan patungan dengan kalkulator nominal otomatis untuk membagi tagihan bersama keluarga atau teman."
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-full bg-[#0D6E52] text-white px-5 py-2.5 text-xs font-semibold cursor-pointer"
            >
              + Buat Split Bill Pertama
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {splitBills.map((bill) => {
            const isSettled = bill.status === "settled";
            return (
              <BezelCard key={bill.id} innerClassName="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-[#141916]/[0.08]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          isSettled
                            ? "bg-[#E6F4EF] text-[#0D6E52]"
                            : "bg-[#C4781A]/15 text-[#C4781A]"
                        }`}
                      >
                        {isSettled ? (
                          <>
                            <CheckCircle size={13} weight="fill" />
                            <span>Semua Lunas</span>
                          </>
                        ) : (
                          <>
                            <Clock size={13} weight="fill" />
                            <span>Menunggu Pelunasan</span>
                          </>
                        )}
                      </span>
                      <span className="text-xs text-[#5A655E]">
                        {formatDateID(bill.occurred_at)} · Metode{" "}
                        {bill.method === "equal"
                          ? "Bagi Rata"
                          : bill.method === "percentage"
                          ? "Persentase"
                          : "Nominal Kustom"}
                      </span>
                    </div>

                    <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-[#141916]">
                      {bill.title}
                    </h2>
                    <p className="text-xs text-[#5A655E] mt-0.5">
                      Ditalangi oleh{" "}
                      <strong className="text-[#141916]">
                        {bill.paid_by_name}
                      </strong>
                      {bill.wallet_name ? ` (${bill.wallet_name})` : ""}
                      {bill.extra_fee > 0
                        ? ` · Termasuk pajak/biaya ${formatIDR(bill.extra_fee)}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-start">
                    <div className="text-right">
                      <span className="text-[11px] text-[#5A655E] block">
                        Total Tagihan
                      </span>
                      <span className="font-mono text-xl font-semibold text-[#141916] tabular-nums">
                        {formatIDR(bill.grand_total)}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDeleteBill(bill.id)}
                      title="Hapus Split Bill"
                      aria-label="Hapus Split Bill"
                      className="min-w-[36px] min-h-[36px] rounded-xl bg-[#F6F7F4] hover:bg-[#C83E37]/10 text-[#5A655E] hover:text-[#C83E37] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>

                {/* Participants List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bill.participants.map((p) => (
                    <div
                      key={p.id}
                      className={`rounded-2xl p-3.5 ring-1 flex items-center justify-between gap-3 transition-colors ${
                        p.is_paid
                          ? "bg-[#E6F4EF]/45 ring-[#0D6E52]/20"
                          : "bg-[#F6F7F4] ring-[#141916]/[0.07]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#141916] truncate">
                          {p.participant_name}
                        </p>
                        <p className="font-mono text-sm font-semibold text-[#141916] tabular-nums mt-0.5">
                          {formatIDR(p.share_amount)}
                        </p>
                        {p.share_percentage !== null && (
                          <span className="font-mono text-[10px] text-[#5A655E] tabular-nums">
                            Porsi {p.share_percentage}%
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleTogglePaid(p.id, p.is_paid)}
                        className={`min-h-[36px] rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                          p.is_paid
                            ? "bg-[#0D6E52] text-white"
                            : "bg-white text-[#141916] ring-1 ring-[#141916]/15 hover:bg-[#EFEFE9]"
                        }`}
                      >
                        <Check size={13} weight="bold" />
                        <span>{p.is_paid ? "Lunas" : "Tandai Lunas"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </BezelCard>
            );
          })}
        </div>
      )}

      {/* Create Split Bill Modal */}
      <ModalSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Split Bill / Patungan Baru"
        subtitle="Dilengkapi kalkulator nominal dan pembagian otomatis per peserta."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSplitBill} className="space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-[#C83E37]/10 border border-[#C83E37]/25 px-3.5 py-2.5 text-xs text-[#C83E37] flex items-center gap-2">
              <WarningCircle size={16} weight="fill" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8 flex flex-col gap-1.5">
              <label
                htmlFor="sb-title"
                className="text-xs font-medium text-[#141916]"
              >
                Judul Tagihan Patungan
              </label>
              <input
                id="sb-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Makan Malam Keluarga / Belanja Bulanan"
                className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
              />
            </div>

            <div className="sm:col-span-4 flex flex-col gap-1.5">
              <label
                htmlFor="sb-date"
                className="text-xs font-medium text-[#141916]"
              >
                Tanggal
              </label>
              <input
                id="sb-date"
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs font-mono text-[#141916] ring-1 ring-[#141916]/12"
              />
            </div>
          </div>

          {/* Built-in Calculator for Subtotal */}
          <AmountCalculator
            value={totalAmount}
            onChange={handleTotalAmountChange}
            label="Subtotal Tagihan (Rp) — Kalkulator Aktif"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sb-fee"
                className="text-xs font-medium text-[#141916]"
              >
                Pajak / Biaya Layanan (Rp)
              </label>
              <input
                id="sb-fee"
                type="number"
                min={0}
                value={extraFee || ""}
                onChange={(e) =>
                  handleExtraFeeChange(Math.max(0, Number(e.target.value) || 0))
                }
                placeholder="0"
                className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs font-mono text-[#141916] ring-1 ring-[#141916]/12 tabular-nums"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sb-payer"
                className="text-xs font-medium text-[#141916]"
              >
                Ditalangi Oleh
              </label>
              <select
                id="sb-payer"
                value={paidByUserId}
                onChange={(e) => setPaidByUserId(e.target.value)}
                className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs text-[#141916] ring-1 ring-[#141916]/12"
              >
                {session.members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sb-wallet"
                className="text-xs font-medium text-[#141916]"
              >
                Kantong Penagih
              </label>
              <select
                id="sb-wallet"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs text-[#141916] ring-1 ring-[#141916]/12"
              >
                {session.wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Method Tabs */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-[#141916]">
              Metode Pembagian ({formatIDR(grandTotal)})
            </span>
            <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#EFEFE9] p-1">
              {[
                { id: "equal", label: "Bagi Rata" },
                { id: "exact", label: "Nominal Kustom" },
                { id: "percentage", label: "Persentase (%)" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMethodChange(m.id as SplitMethod)}
                  className={`min-h-[38px] rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    method === m.id
                      ? "bg-white text-[#0D6E52] shadow-2xs"
                      : "text-[#5A655E] hover:text-[#141916]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add Participant Input */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#141916]">
                Daftar Peserta Patungan ({participants.length} orang)
              </span>
              <span
                className={`font-mono text-xs font-semibold tabular-nums ${
                  Math.abs(unallocatedDiff) <= participants.length
                    ? "text-[#0D6E52]"
                    : "text-[#C83E37]"
                }`}
              >
                {Math.abs(unallocatedDiff) <= participants.length
                  ? "Terbagi Pas 100%"
                  : `Selisih belum terbagi: ${formatIDR(unallocatedDiff)}`}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
                placeholder="Tambah peserta lain (ketik nama teman/keluarga)..."
                className="min-h-[40px] flex-1 rounded-xl bg-[#F6F7F4] px-3 py-1.5 text-xs text-[#141916] ring-1 ring-[#141916]/12"
              />
              <button
                type="button"
                onClick={handleAddExternalParticipant}
                className="min-h-[40px] rounded-xl bg-[#EFEFE9] hover:bg-[#E4E5DD] px-3.5 py-1.5 text-xs font-semibold text-[#141916] flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus size={15} weight="duotone" className="text-[#0D6E52]" />
                <span>Tambah</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {participants.map((p, idx) => (
                <div
                  key={p.key}
                  className="rounded-xl bg-[#F6F7F4] p-2.5 ring-1 ring-[#141916]/[0.06] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2 min-w-[140px] flex-1">
                    <input
                      type="text"
                      value={p.participantName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setParticipants((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, participantName: val }
                              : item
                          )
                        );
                      }}
                      className="min-h-[36px] w-full rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-[#141916] ring-1 ring-[#141916]/10"
                    />
                  </div>

                  {method === "percentage" && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={p.sharePercentage}
                        onChange={(e) => {
                          const pct = Math.max(
                            0,
                            Math.min(100, Number(e.target.value) || 0)
                          );
                          const next = participants.map((item, i) =>
                            i === idx
                              ? {
                                  ...item,
                                  sharePercentage: pct,
                                  shareAmount: Math.round(
                                    (grandTotal * pct) / 100
                                  ),
                                }
                              : item
                          );
                          setParticipants(next);
                        }}
                        className="w-16 min-h-[36px] rounded-lg bg-white px-2 py-1 text-right font-mono text-xs text-[#141916] ring-1 ring-[#141916]/10 tabular-nums"
                      />
                      <span className="text-xs font-mono text-[#5A655E]">%</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {method === "exact" ? (
                      <input
                        type="number"
                        min={0}
                        value={p.shareAmount}
                        onChange={(e) => {
                          const amt = Math.max(0, Number(e.target.value) || 0);
                          setParticipants((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, shareAmount: amt } : item
                            )
                          );
                        }}
                        className="w-28 min-h-[36px] rounded-lg bg-white px-2.5 py-1 text-right font-mono text-xs font-semibold text-[#141916] ring-1 ring-[#141916]/10 tabular-nums"
                      />
                    ) : (
                      <span className="font-mono text-xs font-semibold text-[#141916] tabular-nums min-w-[96px] text-right">
                        {formatIDR(p.shareAmount)}
                      </span>
                    )}

                    <label className="inline-flex items-center gap-1 text-[11px] text-[#5A655E] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.isPaid}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setParticipants((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, isPaid: checked } : item
                            )
                          );
                        }}
                        className="accent-[#0D6E52] rounded"
                      />
                      <span>Lunas</span>
                    </label>

                    {participants.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(p.key)}
                        className="text-[#5A655E] hover:text-[#C83E37] p-1 cursor-pointer"
                        aria-label="Hapus peserta"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !title.trim() || grandTotal <= 0}
            className="min-h-[46px] w-full rounded-full bg-[#0D6E52] hover:bg-[#095740] disabled:opacity-50 text-white px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check size={17} weight="bold" />
            <span>
              {isPending
                ? "Menyimpan..."
                : `Simpan Split Bill (${formatIDR(grandTotal)})`}
            </span>
          </button>
        </form>
      </ModalSheet>
    </div>
  );
}
