"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CaretUpDown,
  Check,
  Plus,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import { switchActiveSpaceAction } from "@/actions/spaces";
import type { SpaceWithRole } from "@/lib/types/database";

export function SpaceSwitcher({
  spaces,
  activeSpace,
}: {
  spaces: SpaceWithRole[];
  activeSpace: SpaceWithRole;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSelect(spaceId: string) {
    setOpen(false);
    if (spaceId === activeSpace.id) return;

    startTransition(async () => {
      await switchActiveSpaceAction(spaceId);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={isPending}
        className="w-full min-h-[44px] rounded-2xl bg-white hover:bg-[#EFEFE9]/60 px-3 py-2 ring-1 ring-[#141916]/[0.08] shadow-2xs flex items-center justify-between gap-2.5 transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              activeSpace.type === "family"
                ? "bg-[#E6F4EF] text-[#0D6E52]"
                : "bg-[#EFEFE9] text-[#141916]"
            }`}
          >
            {activeSpace.type === "family" ? (
              <UsersThree size={17} weight="duotone" />
            ) : (
              <User size={17} weight="duotone" />
            )}
          </div>
          <div className="text-left min-w-0">
            <p className="text-xs font-semibold text-[#141916] truncate">
              {activeSpace.name}
            </p>
            <p className="text-[11px] text-[#5A655E] truncate">
              {activeSpace.type === "family"
                ? `Ruang Keluarga · ${activeSpace.member_count} anggota`
                : "Ruang Pribadi"}
            </p>
          </div>
        </div>
        <CaretUpDown size={15} className="text-[#5A655E] shrink-0" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 mt-1.5 z-40 min-w-[240px] rounded-2xl bg-[#EFEFE9] p-1.5 ring-1 ring-[#141916]/12 shadow-xl">
            <div className="rounded-xl bg-white p-1.5 space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#5A655E]">
                Pilih Ruang Aktif
              </div>
              {spaces.map((sp) => {
                const isSelected = sp.id === activeSpace.id;
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => handleSelect(sp.id)}
                    className={`w-full min-h-[42px] rounded-xl px-2.5 py-2 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#E6F4EF] text-[#0D6E52]"
                        : "hover:bg-[#F6F7F4] text-[#141916]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {sp.type === "family" ? (
                        <UsersThree size={16} weight="duotone" className="shrink-0" />
                      ) : (
                        <User size={16} weight="duotone" className="shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {sp.name}
                        </p>
                        <p className="text-[10px] text-[#5A655E]">
                          {sp.type === "family"
                            ? `Shared · ${sp.member_count} anggota`
                            : "Akun Pribadi"}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check size={14} weight="bold" />}
                  </button>
                );
              })}

              <div className="pt-1 mt-1 border-t border-[#141916]/[0.07]">
                <Link
                  href="/family"
                  onClick={() => setOpen(false)}
                  className="w-full min-h-[38px] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#0D6E52] hover:bg-[#E6F4EF]/60 flex items-center gap-2 transition-colors"
                >
                  <Plus size={14} weight="bold" />
                  <span>Kelola / Undang Ruang Keluarga</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
