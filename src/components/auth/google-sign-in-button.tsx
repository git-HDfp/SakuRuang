"use client";

import { useState } from "react";
import {
  ArrowRight,
  GoogleLogo,
  WarningCircle,
} from "@phosphor-icons/react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function GoogleSignInButton({
  nextPath = "/dashboard",
  label = "Masuk dengan Google",
  initialError = null,
}: {
  nextPath?: string;
  label?: string;
  initialError?: string | null;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  async function handleGoogleLogin() {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const settingsRes = await fetch(`${supabaseUrl}/auth/v1/settings`, {
          headers: { apikey: supabaseKey },
        });
        if (settingsRes.ok) {
          const settings = (await settingsRes.json()) as {
            external?: { google?: boolean };
          };
          if (settings.external && settings.external.google === false) {
            setErrorMessage(
              "Provider Google belum diaktifkan di Supabase Dashboard (Authentication → Providers → Google). Anda bisa langsung daftar/masuk dengan Email di bawah tanpa perlu Google Cloud Console."
            );
            setIsLoading(false);
            return;
          }
        }
      }

      const supabase = createSupabaseBrowserClient();
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      if (nextPath && nextPath.startsWith("/") && nextPath !== "/dashboard") {
        callbackUrl.searchParams.set("next", nextPath);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Gagal menghubungkan ke Google OAuth."
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl bg-[#C83E37]/10 border border-[#C83E37]/25 px-3.5 py-3 text-xs text-[#C83E37] flex items-start gap-2.5 text-left"
        >
          <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="button"
        disabled={isLoading}
        onClick={handleGoogleLogin}
        className="group min-h-[46px] w-full rounded-xl bg-white hover:bg-[#F6F7F4] active:scale-[0.99] disabled:opacity-60 text-[#141916] border border-[#141916]/[0.14] px-4 py-2.5 text-sm font-semibold flex items-center justify-between gap-3 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <GoogleLogo size={18} weight="bold" className="text-[#0D6E52]" />
          <span>{isLoading ? "Menghubungkan ke Google..." : label}</span>
        </span>
        <ArrowRight
          size={15}
          weight="bold"
          className="text-[#5A655E] group-hover:translate-x-0.5 transition-transform"
        />
      </button>
    </div>
  );
}
