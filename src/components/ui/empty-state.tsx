import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { CategoryIcon } from "./category-icon";
import { cn } from "@/lib/format";

export function EmptyState({
  icon = "Wallet",
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] bg-[#EFEFE9]/65 p-1.5 ring-1 ring-[#141916]/[0.06]",
        className
      )}
    >
      <div className="rounded-[16px] bg-white px-6 py-10 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#E6F4EF] text-[#0D6E52] flex items-center justify-center mb-3.5">
          <CategoryIcon name={icon} size={24} weight="duotone" />
        </div>
        <h3 className="text-base font-semibold tracking-tight text-[#141916]">
          {title}
        </h3>
        <p className="mt-1 text-xs text-[#5A655E] max-w-[44ch] leading-relaxed">
          {description}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl bg-[#C83E37]/10 border border-[#C83E37]/25 p-4 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 text-xs text-[#C83E37]">
        <WarningCircle size={18} weight="fill" className="shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-[#C83E37] text-white px-3.5 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-[#E5E7E0]",
        className
      )}
    />
  );
}
