"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signInSchema, signUpSchema } from "@/lib/validators";
import {
  COOKIE_ACTIVE_SPACE,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/database";

export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Konfigurasi Supabase belum lengkap di Environment Variables.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const friendly = error.message
      .toLowerCase()
      .includes("invalid login credentials")
      ? "Email atau kata sandi belum sesuai. Jika belum punya akun, klik tab Daftar Baru di atas."
      : error.message;
    return { ok: false, error: friendly };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { redirectTo: "/dashboard" } };
}

export async function signUpAction(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input pendaftaran tidak valid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Konfigurasi Supabase belum lengkap di Environment Variables.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    const friendly = error.message
      .toLowerCase()
      .includes("user already registered")
      ? "Email ini sudah terdaftar. Silakan pindah ke tab Masuk."
      : error.message;
    return { ok: false, error: friendly };
  }

  if (!data.session) {
    return {
      ok: false,
      error:
        "Akun berhasil dibuat. Silakan cek email Anda untuk verifikasi sebelum masuk.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { redirectTo: "/dashboard" } };
}

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
