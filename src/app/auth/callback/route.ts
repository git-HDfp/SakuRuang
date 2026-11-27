import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const errorDescription =
    searchParams.get("error_description") || searchParams.get("error");

  const nextPath =
    nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (errorDescription) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${nextPath}`);
    }

    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(loginUrl);
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set(
    "error",
    "Kode autentikasi Google tidak ditemukan. Silakan coba masuk kembali."
  );
  return NextResponse.redirect(loginUrl);
}
