"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "@phosphor-icons/react";

export function ModalSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#141916]/45 backdrop-blur-xs"
          />

          {/* Sheet / Modal Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className={`relative z-10 w-full ${maxWidth} max-h-[92dvh] flex flex-col rounded-t-[26px] md:rounded-[24px] bg-[#EFEFE9] p-1.5 ring-1 ring-[#141916]/10 shadow-2xl`}
          >
            <div className="flex flex-col max-h-[89dvh] rounded-t-[20px] md:rounded-[18px] bg-white overflow-hidden">
              {/* Mobile Drag Handle */}
              <div className="md:hidden pt-2.5 flex justify-center">
                <span className="w-10 h-1 rounded-full bg-[#141916]/15" />
              </div>

              {/* Header */}
              <div className="px-5 pt-4 pb-3.5 border-b border-[#141916]/[0.08] flex items-start justify-between gap-4 shrink-0">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[#141916]">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-xs text-[#5A655E] mt-0.5">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Tutup"
                  className="min-w-[38px] min-h-[38px] rounded-full bg-[#F6F7F4] hover:bg-[#EFEFE9] text-[#5A655E] hover:text-[#141916] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 overflow-y-auto">{children}</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
