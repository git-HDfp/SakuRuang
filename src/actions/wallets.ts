"use server";

import { revalidatePath } from "next/cache";
import {
  createWalletSchema,
  transferWalletSchema,
  updateWalletSchema,
} from "@/lib/validators";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/data/repository";
import type { ActionResult, WalletType } from "@/lib/types/database";

export async function createWalletAction(input: {
  spaceId: string;
  name: string;
  type: WalletType;
  initialBalance: number;
  color: string;
  icon: string;
}): Promise<ActionResult<{ walletId: string }>> {
  const parsed = createWalletSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data kantong tidak valid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wallets")
    .insert({
      space_id: parsed.data.spaceId,
      name: parsed.data.name,
      type: parsed.data.type,
      balance: parsed.data.initialBalance,
      color: parsed.data.color,
      icon: parsed.data.icon,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Gagal membuat kantong" };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { walletId: data.id } };
}

export async function updateWalletAction(input: {
  id: string;
  name: string;
  type: WalletType;
  color: string;
  icon: string;
}): Promise<ActionResult> {
  const parsed = updateWalletSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data kantong tidak valid",
    };
  }

  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("wallets")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      color: parsed.data.color,
      icon: parsed.data.icon,
    })
    .eq("id", parsed.data.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function archiveWalletAction(
  walletId: string
): Promise<ActionResult> {
  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("wallets")
    .update({ is_archived: true })
    .eq("id", walletId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function transferBetweenWalletsAction(input: {
  spaceId: string;
  sourceWalletId: string;
  destinationWalletId: string;
  amount: number;
  occurredAt: string;
  note?: string;
}): Promise<ActionResult<{ transactionId: string }>> {
  const parsed = transferWalletSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input transfer tidak valid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_transaction_atomic", {
    p_space_id: parsed.data.spaceId,
    p_wallet_id: parsed.data.sourceWalletId,
    p_destination_wallet_id: parsed.data.destinationWalletId,
    p_category_id: null,
    p_type: "transfer",
    p_amount: parsed.data.amount,
    p_note: parsed.data.note || "Transfer antar kantong",
    p_occurred_at: parsed.data.occurredAt,
  });

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Gagal memproses transfer" };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { transactionId: String(data) } };
}
