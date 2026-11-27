"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  COOKIE_ACTIVE_SPACE,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  cookieStore.delete(COOKIE_ACTIVE_SPACE);
  revalidatePath("/", "layout");
  redirect("/login");
}
