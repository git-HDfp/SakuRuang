"use server";

import { revalidatePath } from "next/cache";
import {
  createSplitBillSchema,
  toggleSplitParticipantPaidSchema,
} from "@/lib/validators";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/data/repository";
import type { ActionResult, SplitMethod } from "@/lib/types/database";

export async function createSplitBillAction(input: {
  spaceId: string;
  title: string;
  totalAmount: number;
  extraFee: number;
  method: SplitMethod;
  paidByUserId: string;
  walletId?: string | null;
  occurredAt: string;
  participants: Array<{
    userId?: string | null;
    participantName: string;
    shareAmount: number;
    sharePercentage?: number | null;
    isPaid: boolean;
  }>;
}): Promise<ActionResult<{ splitBillId: string }>> {
  const parsed = createSplitBillSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data split bill tidak valid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const allPaid = parsed.data.participants.every((p) => p.isPaid);
  const status = allPaid ? "settled" : "open";
  const now = new Date().toISOString();

  const supabase = await createSupabaseServerClient();
  const { data: bill, error: billErr } = await supabase
    .from("split_bills")
    .insert({
      space_id: parsed.data.spaceId,
      title: parsed.data.title,
      total_amount: parsed.data.totalAmount,
      extra_fee: parsed.data.extraFee,
      method: parsed.data.method,
      paid_by_user_id: parsed.data.paidByUserId,
      wallet_id: parsed.data.walletId || null,
      status,
      occurred_at: parsed.data.occurredAt,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (billErr || !bill) {
    return {
      ok: false,
      error: billErr?.message ?? "Gagal menyimpan split bill",
    };
  }

  const rows = parsed.data.participants.map((p) => ({
    split_bill_id: bill.id,
    user_id: p.userId || null,
    participant_name: p.participantName,
    share_amount: p.shareAmount,
    share_percentage: p.sharePercentage ?? null,
    is_paid: p.isPaid,
    paid_at: p.isPaid ? now : null,
  }));

  const { error: partErr } = await supabase
    .from("split_bill_participants")
    .insert(rows);

  if (partErr) {
    return { ok: false, error: partErr.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { splitBillId: bill.id } };
}

export async function toggleSplitParticipantPaidAction(input: {
  participantId: string;
  isPaid: boolean;
  recordSettlementTransaction?: boolean;
}): Promise<ActionResult> {
  const parsed = toggleSplitParticipantPaidSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const now = new Date().toISOString();
  const supabase = await createSupabaseServerClient();

  const { data: part, error: partErr } = await supabase
    .from("split_bill_participants")
    .update({
      is_paid: parsed.data.isPaid,
      paid_at: parsed.data.isPaid ? now : null,
    })
    .eq("id", parsed.data.participantId)
    .select("split_bill_id, participant_name, share_amount")
    .single();

  if (partErr || !part) {
    return {
      ok: false,
      error: partErr?.message ?? "Peserta tidak ditemukan",
    };
  }

  const { data: siblings } = await supabase
    .from("split_bill_participants")
    .select("is_paid")
    .eq("split_bill_id", part.split_bill_id);

  const allSettled = (siblings ?? []).every((s) => s.is_paid);

  await supabase
    .from("split_bills")
    .update({ status: allSettled ? "settled" : "open" })
    .eq("id", part.split_bill_id);

  if (
    parsed.data.isPaid &&
    parsed.data.recordSettlementTransaction &&
    Number(part.share_amount) > 0
  ) {
    const { data: bill } = await supabase
      .from("split_bills")
      .select("space_id, title, wallet_id")
      .eq("id", part.split_bill_id)
      .single();

    if (bill?.wallet_id) {
      const { data: incomeCat } = await supabase
        .from("categories")
        .select("id")
        .eq("space_id", bill.space_id)
        .eq("type", "income")
        .limit(1)
        .maybeSingle();

      await supabase.rpc("create_transaction_atomic", {
        p_space_id: bill.space_id,
        p_wallet_id: bill.wallet_id,
        p_destination_wallet_id: null,
        p_category_id: incomeCat?.id ?? null,
        p_type: "income",
        p_amount: Number(part.share_amount),
        p_note: `Pelunasan Split Bill (${bill.title}) dari ${part.participant_name}`,
        p_occurred_at: now.slice(0, 10),
      });
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function deleteSplitBillAction(
  splitBillId: string
): Promise<ActionResult> {
  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("split_bills")
    .delete()
    .eq("id", splitBillId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
