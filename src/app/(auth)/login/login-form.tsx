"use client";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export function LoginForm({
  nextPath,
  initialError,
}: {
  nextPath: string;
  initialError?: string | null;
}) {
  return (
    <div className="space-y-4">
      <GoogleSignInButton
        nextPath={nextPath}
        label="Lanjutkan dengan Akun Google"
        initialError={initialError}
      />
      <p className="text-xs text-[#5A655E] leading-relaxed">
        Saat pertama kali masuk, sistem otomatis menyiapkan{" "}
        <strong className="text-[#141916] font-medium">Ruang Pribadi</strong>,{" "}
        <strong className="text-[#141916] font-medium">Dompet Utama</strong>,
        dan 10 kategori transaksi dasar untuk akun Google Anda.
      </p>
    </div>
  );
}
