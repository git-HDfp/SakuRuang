"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  acceptSpaceInviteSchema,
  createFamilySpaceSchema,
  createSpaceInviteSchema,
} from "@/lib/validators";
import { COOKIE_ACTIVE_SPACE } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/data/repository";
import type { ActionResult } from "@/lib/types/database";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
}

export async function switchActiveSpaceAction(
  spaceId: string
): Promise<ActionResult<{ spaceId: string }>> {
  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: membership } = await supabase
    .from("space_members")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", profile.id)
    .single();

  if (!membership) {
    return { ok: false, error: "Anda bukan anggota ruang ini" };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ACTIVE_SPACE, spaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
  return { ok: true, data: { spaceId } };
}

export async function createFamilySpaceAction(input: {
  name: string;
}): Promise<ActionResult<{ spaceId: string; inviteCode: string }>> {
  const parsed = createFamilySpaceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Nama ruang tidak valid",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  const supabase = await createSupabaseServerClient();
  const { data: space, error: spErr } = await supabase
    .from("spaces")
    .insert({
      name: parsed.data.name,
      type: "family",
      created_by: profile.id,
    })
    .select("*")
    .single();

  if (spErr || !space) {
    return {
      ok: false,
      error: spErr?.message ?? "Gagal membuat ruang keluarga",
    };
  }

  await supabase.from("space_members").insert({
    space_id: space.id,
    user_id: profile.id,
    role: "owner",
  });

  await supabase.rpc("seed_default_categories", {
    target_space_id: space.id,
  });

  await supabase.from("wallets").insert({
    space_id: space.id,
    name: "Kas Keluarga Utama",
    type: "bank",
    balance: 0,
    color: "#0D6E52",
    icon: "UsersThree",
    created_by: profile.id,
  });

  await supabase.from("space_invites").insert({
    space_id: space.id,
    code: inviteCode,
    created_by: profile.id,
    expires_at: expiresAt.toISOString(),
    max_uses: 10,
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ACTIVE_SPACE, space.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
  return { ok: true, data: { spaceId: space.id, inviteCode } };
}

export async function createSpaceInviteAction(input: {
  spaceId: string;
  expiresInDays?: number;
  maxUses?: number;
}): Promise<ActionResult<{ code: string; expiresAt: string }>> {
  const parsed = createSpaceInviteSchema.safeParse({
    spaceId: input.spaceId,
    expiresInDays: input.expiresInDays ?? 7,
    maxUses: input.maxUses ?? 5,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Parameter undangan tidak valid",
    };
  }

  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const code = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parsed.data.expiresInDays);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("space_invites").insert({
    space_id: parsed.data.spaceId,
    code,
    created_by: profile.id,
    expires_at: expiresAt.toISOString(),
    max_uses: parsed.data.maxUses,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/family");
  return { ok: true, data: { code, expiresAt: expiresAt.toISOString() } };
}

export async function revokeSpaceInviteAction(
  inviteId: string
): Promise<ActionResult> {
  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("space_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/family");
  return { ok: true, data: undefined };
}

export async function acceptSpaceInviteAction(
  code: string
): Promise<ActionResult<{ spaceId: string; spaceName: string }>> {
  const parsed = acceptSpaceInviteSchema.safeParse({ code });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Kode undangan tidak valid",
    };
  }

  const { profile } = await getCurrentUserProfile();
  if (!profile) {
    return { ok: false, error: "Silakan masuk terlebih dahulu" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: spaceId, error } = await supabase.rpc("accept_space_invite", {
    p_code: parsed.data.code,
  });

  if (error || !spaceId) {
    return {
      ok: false,
      error: error?.message ?? "Gagal bergabung dengan kode undangan",
    };
  }

  const { data: sp } = await supabase
    .from("spaces")
    .select("name")
    .eq("id", spaceId)
    .single();

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ACTIVE_SPACE, String(spaceId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/", "layout");
  return {
    ok: true,
    data: {
      spaceId: String(spaceId),
      spaceName: sp?.name ?? "Ruang Keluarga",
    },
  };
}
