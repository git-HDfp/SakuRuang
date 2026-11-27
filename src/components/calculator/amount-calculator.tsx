"use client";

import { useState } from "react";
import { Backspace, Calculator, Check, Equals } from "@phosphor-icons/react";
import {
  evaluateMathExpression,
  formatDisplayExpression,
} from "@/lib/calculator/evaluator";
import { formatIDR } from "@/lib/format";

export function AmountCalculator({
  value,
  onChange,
  label = "Nominal (Rp)",
  defaultOpenKeypad = true,
}: {
  value: number;
  onChange: (newAmount: number) => void;
  label?: string;
  defaultOpenKeypad?: boolean;
}) {
  const [expression, setExpression] = useState<string>(
    value > 0 ? String(value) : ""
  );
  const [showKeypad, setShowKeypad] = useState<boolean>(defaultOpenKeypad);

  const evaluated = evaluateMathExpression(expression);

  function syncExpression(nextExpr: string) {
    // Prevent consecutive operators
    const cleaned = nextExpr
      .replace(/^[*/+]+/, "")
      .replace(/([+\-*/])[+\-*/]+/g, "$1");

    setExpression(cleaned);
    const res = evaluateMathExpression(cleaned);
    if (res.valid) {
      onChange(res.value);
    }
  }

  function handleKeyPress(token: string) {
    if (token === "C") {
      setExpression("");
      onChange(0);
      return;
    }

    if (token === "BACK") {
      const next = expression.slice(0, -1);
      syncExpression(next);
      return;
    }

    if (token === "=") {
      if (evaluated.valid) {
        const locked = evaluated.value > 0 ? String(evaluated.value) : "";
        setExpression(locked);
        onChange(evaluated.value);
      }
      return;
    }

    syncExpression(expression + token);
  }

  function handleQuickChip(delta: number) {
    const base = evaluated.valid ? evaluated.value : value;
    const nextVal = Math.max(0, base + delta);
    setExpression(String(nextVal));
    onChange(nextVal);
  }

  return (
    <div className="rounded-[20px] bg-[#EFEFE9]/90 p-1.5 ring-1 ring-[#141916]/[0.08]">
      <div className="rounded-[15px] bg-white p-3.5">
        {/* Display Screen */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-medium text-[#5A655E]">{label}</span>
          <button
            type="button"
            onClick={() => setShowKeypad((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F7F4] hover:bg-[#EFEFE9] px-2.5 py-1 text-[11px] font-medium text-[#0D6E52] transition-colors cursor-pointer"
          >
            <Calculator size={13} weight="duotone" />
            <span>{showKeypad ? "Sembunyikan Keypad" : "Buka Kalkulator"}</span>
          </button>
        </div>

        <div className="rounded-xl bg-[#F6F7F4] px-3.5 py-2.5 ring-1 ring-[#141916]/[0.06]">
          <div className="min-h-[18px] flex items-center justify-between text-xs font-mono text-[#5A655E] tabular-nums">
            <span className="truncate">
              {expression
                ? formatDisplayExpression(expression)
                : "Ketik nominal atau operasi hitung"}
            </span>
            {evaluated.hasOperator && evaluated.valid && (
              <span className="text-[11px] text-[#0D6E52] font-medium ml-2 shrink-0">
                Hitung Otomatis
              </span>
            )}
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl md:text-3xl font-semibold tracking-tight text-[#141916] tabular-nums">
              {formatIDR(evaluated.valid ? evaluated.value : value)}
            </span>
            <input
              type="text"
              inputMode="text"
              aria-label={label}
              value={expression}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9+\-*/xX÷:().,]/g, "");
                syncExpression(raw);
              }}
              placeholder="0"
              className="w-28 text-right font-mono text-xs text-[#5A655E] bg-white rounded-lg px-2 py-1 ring-1 ring-[#141916]/10 focus:outline-none focus:ring-2 focus:ring-[#0D6E52] tabular-nums"
            />
          </div>
        </div>

        {/* Quick Preset Chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {[
            { label: "+10 rb", amount: 10000 },
            { label: "+25 rb", amount: 25000 },
            { label: "+50 rb", amount: 50000 },
            { label: "+100 rb", amount: 100000 },
            { label: "+500 rb", amount: 500000 },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleQuickChip(chip.amount)}
              className="rounded-lg bg-[#F6F7F4] hover:bg-[#E6F4EF] hover:text-[#0D6E52] px-2.5 py-1 text-xs font-mono font-medium text-[#5A655E] ring-1 ring-[#141916]/[0.06] active:scale-[0.97] transition-all cursor-pointer tabular-nums"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Built-in Thumb-Friendly Keypad */}
        {showKeypad && (
          <div className="mt-3 pt-3 border-t border-[#141916]/[0.07] grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => handleKeyPress("C")}
              className="min-h-[44px] rounded-xl bg-[#C83E37]/10 hover:bg-[#C83E37]/15 text-[#C83E37] font-mono text-sm font-semibold active:scale-[0.96] transition-all cursor-pointer"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress("/")}
              className="min-h-[44px] rounded-xl bg-[#EFEFE9] hover:bg-[#E4E5DD] text-[#141916] font-mono text-base font-semibold active:scale-[0.96] transition-all cursor-pointer"
            >
              ÷
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress("*")}
              className="min-h-[44px] rounded-xl bg-[#EFEFE9] hover:bg-[#E4E5DD] text-[#141916] font-mono text-base font-semibold active:scale-[0.96] transition-all cursor-pointer"
            >
              ×
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress("BACK")}
              aria-label="Hapus digit terakhir"
              className="min-h-[44px] rounded-xl bg-[#EFEFE9] hover:bg-[#E4E5DD] text-[#141916] flex items-center justify-center active:scale-[0.96] transition-all cursor-pointer"
            >
              <Backspace size={18} weight="regular" />
            </button>

            {["7", "8", "9"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleKeyPress(d)}
                className="min-h-[44px] rounded-xl bg-[#F6F7F4] hover:bg-[#EFEFE9] text-[#141916] font-mono text-base font-semibold ring-1 ring-[#141916]/[0.06] active:scale-[0.96] transition-all cursor-pointer tabular-nums"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeyPress("-")}
              className="min-h-[44px] rounded-xl bg-[#EFEFE9] hover:bg-[#E4E5DD] text-[#141916] font-mono text-base font-semibold active:scale-[0.96] transition-all cursor-pointer"
            >
              −
            </button>

            {["4", "5", "6"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleKeyPress(d)}
                className="min-h-[44px] rounded-xl bg-[#F6F7F4] hover:bg-[#EFEFE9] text-[#141916] font-mono text-base font-semibold ring-1 ring-[#141916]/[0.06] active:scale-[0.96] transition-all cursor-pointer tabular-nums"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeyPress("+")}
              className="min-h-[44px] rounded-xl bg-[#EFEFE9] hover:bg-[#E4E5DD] text-[#141916] font-mono text-base font-semibold active:scale-[0.96] transition-all cursor-pointer"
            >
              +
            </button>

            {["1", "2", "3"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleKeyPress(d)}
                className="min-h-[44px] rounded-xl bg-[#F6F7F4] hover:bg-[#EFEFE9] text-[#141916] font-mono text-base font-semibold ring-1 ring-[#141916]/[0.06] active:scale-[0.96] transition-all cursor-pointer tabular-nums"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeyPress("=")}
              aria-label="Hitung hasil"
              className="row-span-2 min-h-[92px] rounded-xl bg-[#0D6E52] hover:bg-[#095740] text-white font-mono text-base font-semibold flex flex-col items-center justify-center gap-1 active:scale-[0.96] transition-all cursor-pointer"
            >
              {evaluated.hasOperator ? (
                <>
                  <Equals size={18} weight="bold" />
                  <span className="text-[11px]">Hitung</span>
                </>
              ) : (
                <>
                  <Check size={18} weight="bold" />
                  <span className="text-[11px]">OK</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleKeyPress("0")}
              className="col-span-2 min-h-[44px] rounded-xl bg-[#F6F7F4] hover:bg-[#EFEFE9] text-[#141916] font-mono text-base font-semibold ring-1 ring-[#141916]/[0.06] active:scale-[0.96] transition-all cursor-pointer tabular-nums"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress("000")}
              className="min-h-[44px] rounded-xl bg-[#F6F7F4] hover:bg-[#EFEFE9] text-[#0D6E52] font-mono text-sm font-semibold ring-1 ring-[#141916]/[0.06] active:scale-[0.96] transition-all cursor-pointer tabular-nums"
            >
              .000
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
