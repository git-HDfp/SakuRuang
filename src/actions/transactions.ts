"use server";

import { revalidatePath } from "next/cache";
import { createTransactionSchema } from "@/lib/validators";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/data/repository";
import type { ActionResult, TransactionType } from "@/lib/types/database";

export async function createTransactionAction(input: {
  spaceId: string;
  type: TransactionType;
  walletId: string;
  destinationWalletId?: string | null;
  categoryId?: string | null;
  amount: number;
  occurredAt: string;
  note?: string;
}): Promise<ActionResult<{ transactionId: string }>> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data transaksi tidak valid",
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
    p_wallet_id: parsed.data.walletId,
    p_destination_wallet_id:
      parsed.data.type === "transfer"
        ? parsed.data.destinationWalletId ?? null
        : null,
    p_category_id:
      parsed.data.type === "transfer" ? null : parsed.data.categoryId ?? null,
    p_type: parsed.data.type,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note || null,
    p_occurred_at: parsed.data.occurredAt,
  });

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Gagal menyimpan transaksi",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { transactionId: String(data) } };
}

export async function deleteTransactionAction(
  transactionId: string
): Promise<ActionResult> {
  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("delete_transaction_atomic", {
    p_transaction_id: transactionId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
