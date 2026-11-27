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
        const friendly = error.message
          .toLowerCase()
          .includes("provider is not enabled")
          ? "Login Google belum diaktifkan di Supabase Dashboard (Authentication → Providers → Google)."
          : error.message;
        setErrorMessage(friendly);
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
        className="group min-h-[48px] w-full rounded-xl bg-[#141916] hover:bg-[#0D6E52] active:scale-[0.99] disabled:opacity-60 text-white px-5 py-3 text-sm font-semibold flex items-center justify-between gap-3 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <GoogleLogo size={18} weight="bold" />
          <span>{isLoading ? "Menghubungkan ke Google..." : label}</span>
        </span>
        <ArrowRight
          size={16}
          weight="bold"
          className="group-hover:translate-x-0.5 transition-transform"
        />
      </button>
    </div>
  );
}
