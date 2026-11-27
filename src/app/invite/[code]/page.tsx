import Link from "next/link";
import { UsersThree, Vault, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import {
  getCurrentUserProfile,
  getInvitePreviewByCode,
} from "@/lib/data/repository";
import { formatDateID } from "@/lib/format";
import { AcceptInviteClient } from "./accept-invite-client";

export default async function InviteCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [{ profile }, invitePreview] = await Promise.all([
    getCurrentUserProfile(),
    getInvitePreviewByCode(code),
  ]);

  const isExpired =
    invitePreview && new Date(invitePreview.expires_at).getTime() < Date.now();
  const isRevoked = Boolean(invitePreview?.revoked_at);
  const isFull =
    invitePreview && invitePreview.used_count >= invitePreview.max_uses;
  const isValid = Boolean(
    invitePreview && !isExpired && !isRevoked && !isFull
  );

  return (
    <main className="min-h-[100dvh] bg-[#F6F7F4] text-[#141916] flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#0D6E52] text-white flex items-center justify-center shadow-sm">
            <Vault size={22} weight="duotone" />
          </div>
          <div>
            <span className="text-lg font-semibold tracking-tight block leading-none">
              SakuRuang
            </span>
            <span className="text-xs text-[#5A655E] mt-1 block">
              Undangan Ruang Keluarga
            </span>
          </div>
        </div>

        <div className="rounded-[24px] bg-[#EFEFE9]/80 p-1.5 ring-1 ring-[#141916]/[0.06]">
          <div className="rounded-[18px] bg-white p-6 md:p-8 shadow-[0_1px_2px_rgba(20,25,22,0.04)] text-center space-y-5">
            {!invitePreview || !isValid ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#C83E37]/12 text-[#C83E37] flex items-center justify-center mx-auto">
                  <WarningCircle size={26} weight="duotone" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-[#141916]">
                    Kode Undangan Tidak Berlaku
                  </h1>
                  <p className="text-xs text-[#5A655E] mt-1.5 leading-relaxed">
                    Kode <span className="font-mono font-bold">{code}</span>{" "}
                    tidak ditemukan, sudah dicabut, atau telah melewati batas
                    waktu pemakaian.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#0D6E52] text-white px-6 py-2.5 text-xs font-semibold"
                >
                  Kembali ke Beranda
                </Link>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-[#E6F4EF] text-[#0D6E52] flex items-center justify-center mx-auto">
                  <UsersThree size={26} weight="duotone" />
                </div>

                <div>
                  <span className="rounded-full bg-[#E6F4EF] text-[#0D6E52] px-3 py-1 text-xs font-mono font-semibold">
                    Kode: {invitePreview.code}
                  </span>
                  <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#141916]">
                    {invitePreview.space_name}
                  </h1>
                  <p className="text-xs text-[#5A655E] mt-1">
                    Diundang oleh{" "}
                    <strong className="text-[#141916]">
                      {invitePreview.inviter_name}
                    </strong>{" "}
                    · Berlaku hingga {formatDateID(invitePreview.expires_at)}
                  </p>
                </div>

                {profile ? (
                  <AcceptInviteClient
                    code={invitePreview.code}
                    userName={profile.full_name}
                  />
                ) : (
                  <div className="space-y-3 pt-2">
                    <p className="text-xs text-[#5A655E]">
                      Silakan masuk dengan akun Google Anda terlebih dahulu
                      untuk bergabung ke ruang keluarga ini.
                    </p>
                    <Link
                      href={`/login?next=${encodeURIComponent(
                        `/invite/${invitePreview.code}`
                      )}`}
                      className="min-h-[44px] w-full rounded-xl bg-[#141916] hover:bg-[#0D6E52] text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-center transition-colors"
                    >
                      Masuk dengan Google
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
