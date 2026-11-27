"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, WarningCircle } from "@phosphor-icons/react";
import { acceptSpaceInviteAction } from "@/actions/spaces";

export function AcceptInviteClient({
  code,
  userName,
}: {
  code: string;
  userName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleAccept() {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await acceptSpaceInviteAction(code);
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 pt-2">
      {errorMsg && (
        <div className="rounded-xl bg-[#C83E37]/10 border border-[#C83E37]/25 px-3 py-2 text-xs text-[#C83E37] flex items-center justify-center gap-1.5">
          <WarningCircle size={15} weight="fill" />
          <span>{errorMsg}</span>
        </div>
      )}

      <p className="text-xs text-[#5A655E]">
        Masuk sebagai <strong className="text-[#141916]">{userName}</strong>.
        Ruang Pribadi Anda tetap terpisah dan aman.
      </p>

      <button
        type="button"
        disabled={isPending}
        onClick={handleAccept}
        className="min-h-[46px] w-full rounded-full bg-[#0D6E52] hover:bg-[#095740] active:scale-[0.98] disabled:opacity-50 text-white px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        <Check size={17} weight="bold" />
        <span>
          {isPending ? "Menautkan Ruang..." : "Gabung ke Ruang Keluarga"}
        </span>
      </button>
    </div>
  );
}
