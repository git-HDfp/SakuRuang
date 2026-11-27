"use server";

import { revalidatePath } from "next/cache";
import { createCategorySchema } from "@/lib/validators";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/data/repository";
import type { ActionResult, CategoryType } from "@/lib/types/database";

export async function createCategoryAction(input: {
  spaceId: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}): Promise<ActionResult<{ categoryId: string }>> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Kategori tidak valid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({
      space_id: parsed.data.spaceId,
      name: parsed.data.name,
      type: parsed.data.type,
      icon: parsed.data.icon,
      color: parsed.data.color,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Gagal membuat kategori" };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { categoryId: data.id } };
}
