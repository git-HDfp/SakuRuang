"use server";

import { revalidatePath } from "next/cache";
import { upsertBudgetSchema } from "@/lib/validators";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/data/repository";
import type { ActionResult } from "@/lib/types/database";

export async function upsertBudgetAction(input: {
  spaceId: string;
  categoryId: string;
  month: string;
  amountLimit: number;
}): Promise<ActionResult<{ budgetId: string }>> {
  const parsed = upsertBudgetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data anggaran tidak valid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        space_id: parsed.data.spaceId,
        category_id: parsed.data.categoryId,
        month: parsed.data.month,
        amount_limit: parsed.data.amountLimit,
        created_by: profile.id,
      },
      { onConflict: "space_id,category_id,month" }
    )
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Gagal menyimpan anggaran" };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { budgetId: data.id } };
}

export async function deleteBudgetAction(
  budgetId: string
): Promise<ActionResult> {
  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("budgets").delete().eq("id", budgetId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
