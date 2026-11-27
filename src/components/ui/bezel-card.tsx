import { cn } from "@/lib/format";

export function BezelCard({
  children,
  className,
  innerClassName,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  variant?: "default" | "teal-hero" | "teal-tinted";
}) {
  if (variant === "teal-hero") {
    return (
      <div
        className={cn(
          "rounded-[26px] p-1.5 bg-gradient-to-br from-[#0D6E52]/35 via-[#0E7C7B]/30 to-[#139A7E]/35 ring-1 ring-[#0D6E52]/25 shadow-[0_14px_34px_-12px_rgba(13,110,82,0.28)]",
          className
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden h-full rounded-[20px] bg-teal-animated text-white p-5 md:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]",
            innerClassName
          )}
        >
          {/* Animated Ambient Aurora Orbs */}
          <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#38D39F]/20 blur-3xl orb-float-1" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 w-60 h-60 rounded-full bg-[#22B8CF]/20 blur-3xl orb-float-2" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            {children}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "teal-tinted") {
    return (
      <div
        className={cn(
          "rounded-[24px] bg-gradient-to-br from-[#D7EDE6] via-[#E3F2EE] to-[#D4ECE8] p-1.5 ring-1 ring-[#0D6E52]/15",
          className
        )}
      >
        <div
          className={cn(
            "h-full rounded-[18px] bg-teal-soft-animated p-5 md:p-6 shadow-[0_2px_8px_rgba(13,110,82,0.06)]",
            innerClassName
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[24px] bg-[#E6EFEA]/85 p-1.5 ring-1 ring-[#0D6E52]/[0.09] transition-all duration-300",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-[18px] bg-white p-5 md:p-6 shadow-[0_2px_10px_rgba(13,110,82,0.04)]",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
