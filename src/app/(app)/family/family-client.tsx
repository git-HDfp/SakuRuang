"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Key,
  LinkSimple,
  Plus,
  Prohibit,
  User,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { BezelCard } from "@/components/ui/bezel-card";
import { ModalSheet } from "@/components/ui/modal-sheet";
import {
  acceptSpaceInviteAction,
  createFamilySpaceAction,
  createSpaceInviteAction,
  revokeSpaceInviteAction,
  switchActiveSpaceAction,
} from "@/actions/spaces";
import { formatDateID, getInitials } from "@/lib/format";
import type { AppSessionContext, SpaceInvite } from "@/lib/types/database";

export function FamilyClient({
  session,
  invites,
}: {
  session: AppSessionContext;
  invites: SpaceInvite[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleCopyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function handleCreateFamilySpace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await createFamilySpaceAction({ name: newSpaceName });
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      setCreateSpaceOpen(false);
      setNewSpaceName("");
      setSuccessMsg(
        `Ruang Keluarga berhasil dibuat! Kode undangan: ${res.data.inviteCode}`
      );
      router.refresh();
    });
  }

  function handleGenerateInvite() {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await createSpaceInviteAction({
        spaceId: session.activeSpace.id,
        expiresInDays: 14,
        maxUses: 10,
      });

      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      setSuccessMsg(`Kode undangan baru dibuat: ${res.data.code}`);
      router.refresh();
    });
  }

  function handleRevokeInvite(inviteId: string) {
    startTransition(async () => {
      await revokeSpaceInviteAction(inviteId);
      router.refresh();
    });
  }

  function handleJoinByCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await acceptSpaceInviteAction(joinCode);
      if (!res.ok) {
        setErrorMsg(res.error);
        return;
      }

      setJoinCode("");
      setSuccessMsg(`Berhasil menautkan akun ke ${res.data.spaceName}!`);
      router.refresh();
    });
  }

  function handleSwitchSpace(spaceId: string) {
    startTransition(async () => {
      await switchActiveSpaceAction(spaceId);
      router.refresh();
    });
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#141916]">
            Ruang Keluarga & Tautan Akun
          </h1>
          <p className="text-xs text-[#5A655E] mt-1">
            Tautkan akun pribadi Anda dengan akun keluarga lewat kode atau
            tautan undangan agar kantong, transaksi, dan anggaran bersama selalu
            sinkron.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setCreateSpaceOpen(true);
          }}
          className="min-h-[44px] rounded-full bg-[#0D6E52] hover:bg-[#095740] active:scale-[0.98] text-white px-5 py-2.5 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} weight="bold" />
          <span>Buat Ruang Keluarga Baru</span>
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-2xl bg-[#C83E37]/10 border border-[#C83E37]/25 px-4 py-3 text-xs text-[#C83E37] flex items-center gap-2"
        >
          <WarningCircle size={17} weight="fill" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="rounded-2xl bg-[#E6F4EF] border border-[#0D6E52]/25 px-4 py-3 text-xs font-medium text-[#0D6E52] flex items-center gap-2"
        >
          <Check size={17} weight="bold" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Linked Spaces Overview + Join via Invite Code */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 7: Linked Spaces List */}
        <BezelCard className="lg:col-span-7" innerClassName="space-y-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[#141916]">
              Ruang yang Tertaut ke Akun Anda ({session.spaces.length})
            </h2>
            <p className="text-xs text-[#5A655E]">
              Klik salah satu ruang untuk menjadikannya ruang kerja aktif
            </p>
          </div>

          <div className="space-y-2.5">
            {session.spaces.map((sp) => {
              const isActive = sp.id === session.activeSpace.id;
              return (
                <div
                  key={sp.id}
                  className={`rounded-2xl p-4 ring-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                    isActive
                      ? "bg-[#E6F4EF]/65 ring-[#0D6E52]"
                      : "bg-[#F6F7F4] ring-[#141916]/[0.07]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        sp.type === "family"
                          ? "bg-[#0D6E52] text-white"
                          : "bg-white text-[#141916] ring-1 ring-[#141916]/10"
                      }`}
                    >
                      {sp.type === "family" ? (
                        <UsersThree size={20} weight="duotone" />
                      ) : (
                        <User size={20} weight="duotone" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#141916]">
                          {sp.name}
                        </h3>
                        {isActive && (
                          <span className="rounded-full bg-[#0D6E52] text-white px-2 py-0.5 text-[10px] font-semibold">
                            Sedang Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5A655E] mt-0.5">
                        {sp.type === "family"
                          ? `Ruang Keluarga Bersama · ${sp.member_count} anggota`
                          : "Ruang Pribadi (Privat)"}{" "}
                        · Peran Anda: <strong className="capitalize">{sp.role}</strong>
                      </p>
                    </div>
                  </div>

                  {!isActive && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSwitchSpace(sp.id)}
                      className="min-h-[38px] rounded-full bg-white hover:bg-[#EFEFE9] px-4 py-1.5 text-xs font-semibold text-[#141916] ring-1 ring-[#141916]/12 transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      Buka Ruang Ini
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </BezelCard>

        {/* Col 5: Join an Existing Family Space with Invite Code */}
        <BezelCard className="lg:col-span-5" innerClassName="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-[#E6F4EF] text-[#0D6E52] flex items-center justify-center">
                <Key size={18} weight="duotone" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[#141916]">
                  Gabung Pakai Kode Undangan
                </h2>
                <p className="text-xs text-[#5A655E]">
                  Masukkan kode 8 karakter dari pasangan/keluarga
                </p>
              </div>
            </div>

            <form onSubmit={handleJoinByCode} className="mt-4 space-y-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="join-code-input"
                  className="text-xs font-medium text-[#141916]"
                >
                  Kode Undangan Ruang Keluarga
                </label>
                <input
                  id="join-code-input"
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: KELUARGA"
                  className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 font-mono text-sm uppercase tracking-wider text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || joinCode.trim().length < 6}
                className="min-h-[44px] w-full rounded-full bg-[#0D6E52] hover:bg-[#095740] disabled:opacity-50 text-white px-5 py-2 text-xs font-semibold transition-all cursor-pointer"
              >
                {isPending ? "Memverifikasi Kode..." : "Tautkan ke Ruang Keluarga"}
              </button>
            </form>
          </div>

          <div className="mt-5 pt-3.5 border-t border-[#141916]/[0.07] text-[11px] text-[#5A655E] leading-relaxed">
            Saat tertaut ke Ruang Keluarga, Ruang Pribadi Anda tetap aman dan
            terpisah. Anda bisa berpindah ruang kapan saja lewat tombol di kiri
            atas.
          </div>
        </BezelCard>
      </div>

      {/* Active Space Members & Invite Link Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Col 5: Members of Active Space */}
        <BezelCard className="lg:col-span-5" innerClassName="space-y-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[#141916]">
              Anggota di {session.activeSpace.name} ({session.members.length})
            </h2>
            <p className="text-xs text-[#5A655E]">
              Daftar akun yang memiliki akses ke kantong & transaksi ruang ini
            </p>
          </div>

          <div className="divide-y divide-[#141916]/[0.07]">
            {session.members.map((m) => (
              <div
                key={m.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    style={{ backgroundColor: m.profile.avatar_color }}
                    className="w-9 h-9 rounded-xl text-white text-xs font-semibold flex items-center justify-center shrink-0"
                  >
                    {getInitials(m.profile.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#141916] truncate">
                      {m.profile.full_name}{" "}
                      {m.user_id === session.user.id ? "(Anda)" : ""}
                    </p>
                    <p className="text-[11px] text-[#5A655E] truncate">
                      {m.profile.email}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-[#EFEFE9] px-2.5 py-0.5 text-[11px] font-medium capitalize text-[#141916]">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </BezelCard>

        {/* Col 7: Invite Link & Code Generator */}
        <BezelCard className="lg:col-span-7" innerClassName="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#141916]">
                Kode & Tautan Undangan ({session.activeSpace.name})
              </h2>
              <p className="text-xs text-[#5A655E]">
                Bagikan tautan atau kode ini untuk mengundang anggota keluarga
              </p>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleGenerateInvite}
              className="min-h-[38px] rounded-full bg-[#0D6E52] hover:bg-[#095740] text-white px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus size={14} weight="bold" />
              <span>Buat Kode Undangan Baru</span>
            </button>
          </div>

          {invites.length === 0 ? (
            <div className="rounded-2xl bg-[#F6F7F4] p-6 text-center space-y-2">
              <p className="text-xs text-[#5A655E]">
                Belum ada kode undangan untuk ruang{" "}
                <strong>{session.activeSpace.name}</strong>.
              </p>
              <button
                type="button"
                onClick={handleGenerateInvite}
                className="rounded-full bg-[#0D6E52] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                + Buat Kode & Link Undangan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((inv) => {
                const isRevoked = Boolean(inv.revoked_at);
                const isExpired =
                  new Date(inv.expires_at).getTime() < Date.now();
                const isActive =
                  !isRevoked && !isExpired && inv.used_count < inv.max_uses;
                const fullUrl = `${origin}/invite/${inv.code}`;

                return (
                  <div
                    key={inv.id}
                    className={`rounded-2xl p-4 ring-1 space-y-3 ${
                      isActive
                        ? "bg-[#F6F7F4] ring-[#141916]/[0.08]"
                        : "bg-[#EFEFE9]/50 ring-[#141916]/[0.05] opacity-70"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-base font-bold tracking-wider text-[#0D6E52] bg-[#E6F4EF] px-3 py-1 rounded-xl">
                          {inv.code}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            isActive
                              ? "bg-[#E6F4EF] text-[#0D6E52]"
                              : "bg-[#C83E37]/12 text-[#C83E37]"
                          }`}
                        >
                          {isActive
                            ? "Aktif"
                            : isRevoked
                            ? "Dicabut"
                            : "Kedaluwarsa"}
                        </span>
                      </div>

                      <span className="text-[11px] font-mono text-[#5A655E] tabular-nums">
                        Dipakai {inv.used_count}/{inv.max_uses} · Berlaku s/d{" "}
                        {formatDateID(inv.expires_at)}
                      </span>
                    </div>

                    {isActive && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(inv.code, `code-${inv.id}`)
                          }
                          className="min-h-[36px] rounded-xl bg-white hover:bg-[#EFEFE9] px-3 py-1.5 text-xs font-semibold text-[#141916] ring-1 ring-[#141916]/12 flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedCode === `code-${inv.id}` ? (
                            <>
                              <Check
                                size={14}
                                weight="bold"
                                className="text-[#0D6E52]"
                              />
                              <span>Kode Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Salin Kode</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(fullUrl, `link-${inv.id}`)
                          }
                          className="min-h-[36px] rounded-xl bg-white hover:bg-[#EFEFE9] px-3 py-1.5 text-xs font-semibold text-[#0D6E52] ring-1 ring-[#0D6E52]/25 flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedCode === `link-${inv.id}` ? (
                            <>
                              <Check size={14} weight="bold" />
                              <span>Link Undangan Tersalin</span>
                            </>
                          ) : (
                            <>
                              <LinkSimple size={14} weight="bold" />
                              <span>Salin Link Undangan</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="min-h-[36px] rounded-xl bg-white hover:bg-[#C83E37]/10 px-3 py-1.5 text-xs font-medium text-[#C83E37] ring-1 ring-[#C83E37]/20 flex items-center gap-1 cursor-pointer ml-auto"
                        >
                          <Prohibit size={14} />
                          <span>Cabut</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </BezelCard>
      </div>

      {/* Create Family Space Modal */}
      <ModalSheet
        open={createSpaceOpen}
        onClose={() => setCreateSpaceOpen(false)}
        title="Buat Ruang Keluarga / Bersama"
        subtitle="Otomatis membuat kantong Kas Keluarga Utama, 10 kategori bersama, dan kode undangan."
      >
        <form onSubmit={handleCreateFamilySpace} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="family-space-name"
              className="text-xs font-medium text-[#141916]"
            >
              Nama Ruang Keluarga
            </label>
            <input
              id="family-space-name"
              type="text"
              required
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              placeholder="Contoh: Keluarga Pratama / Kas Rumah Tangga"
              className="min-h-[44px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-sm text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || newSpaceName.trim().length < 2}
            className="min-h-[46px] w-full rounded-full bg-[#0D6E52] hover:bg-[#095740] disabled:opacity-50 text-white px-5 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check size={17} weight="bold" />
            <span>
              {isPending ? "Menyiapkan Ruang..." : "Buat Ruang & Kode Undangan"}
            </span>
          </button>
        </form>
      </ModalSheet>
    </div>
  );
}
