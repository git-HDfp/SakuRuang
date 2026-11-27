"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, WarningCircle } from "@phosphor-icons/react";
import { signInAction, signUpAction } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function LoginForm({
  nextPath,
  initialError,
}: {
  nextPath: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ?? null
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      const res =
        mode === "signin"
          ? await signInAction({ email, password })
          : await signUpAction({ fullName, email, password });

      if (!res.ok) {
        setErrorMessage(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        return;
      }

      router.push(nextPath || res.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Tab Switcher: Masuk vs Daftar Baru */}
      <div className="grid grid-cols-2 rounded-xl bg-[#F6F7F4] p-1 border border-[#141916]/[0.08]">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setErrorMessage(null);
            setFieldErrors({});
          }}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            mode === "signin"
              ? "bg-white text-[#141916] shadow-2xs"
              : "text-[#5A655E] hover:text-[#141916]"
          }`}
        >
          Masuk Akun
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setErrorMessage(null);
            setFieldErrors({});
          }}
          className={`min-h-[38px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            mode === "signup"
              ? "bg-white text-[#141916] shadow-2xs"
              : "text-[#5A655E] hover:text-[#141916]"
          }`}
        >
          Daftar Baru
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl bg-[#C83E37]/10 border border-[#C83E37]/25 px-3.5 py-3 text-xs text-[#C83E37] flex items-start gap-2.5"
        >
          <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        {mode === "signup" && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="auth-fullname"
              className="text-xs font-medium text-[#141916]"
            >
              Nama Lengkap
            </label>
            <input
              id="auth-fullname"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama Anda"
              className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2.5 text-sm text-[#141916] placeholder:text-[#5A655E]/60 border border-[#141916]/[0.12] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52] transition-all"
            />
            {fieldErrors.fullName?.[0] && (
              <p className="text-xs text-[#C83E37]">{fieldErrors.fullName[0]}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="auth-email"
            className="text-xs font-medium text-[#141916]"
          >
            Alamat Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2.5 text-sm text-[#141916] placeholder:text-[#5A655E]/60 border border-[#141916]/[0.12] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52] transition-all"
          />
          {fieldErrors.email?.[0] && (
            <p className="text-xs text-[#C83E37]">{fieldErrors.email[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="auth-password"
            className="text-xs font-medium text-[#141916]"
          >
            Kata Sandi
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              mode === "signin" ? "Kata sandi Anda" : "Minimal 8 karakter"
            }
            className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2.5 text-sm text-[#141916] placeholder:text-[#5A655E]/60 border border-[#141916]/[0.12] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52] transition-all"
          />
          {fieldErrors.password?.[0] && (
            <p className="text-xs text-[#C83E37]">{fieldErrors.password[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="group min-h-[46px] w-full rounded-xl bg-[#0D6E52] hover:bg-[#095740] active:scale-[0.99] disabled:opacity-60 text-white px-5 py-2.5 text-sm font-semibold flex items-center justify-between transition-all cursor-pointer"
        >
          <span>
            {isPending
              ? "Memproses..."
              : mode === "signin"
              ? "Masuk ke Dashboard"
              : "Daftar & Buka Ruang Pribadi"}
          </span>
          <ArrowRight
            size={16}
            weight="bold"
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </button>
      </form>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#141916]/[0.08]" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-mono text-[#5A655E]">
          <span className="bg-white px-2.5">atau</span>
        </div>
      </div>

      <GoogleSignInButton
        nextPath={nextPath}
        label="Lanjutkan dengan Akun Google"
      />
    </div>
  );
}
