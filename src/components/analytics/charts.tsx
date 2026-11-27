"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowCounterClockwise, Sparkle } from "@phosphor-icons/react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { formatCompactIDR, formatIDR } from "@/lib/format";
import type {
  CategorySpendPoint,
  DailySpendPoint,
  MonthlyCashflowPoint,
  Wallet,
} from "@/lib/types/database";

// ============================================================================
// 1. CASHFLOW TREND CHART (Click month to spotlight & blur others)
// ============================================================================
export function CashflowTrendChart({
  data,
}: {
  data: MonthlyCashflowPoint[];
}) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const focusedItem = useMemo(
    () => data.find((d) => d.month === selectedMonth) ?? null,
    [data, selectedMonth]
  );

  function toggleMonth(monthKey: string) {
    setSelectedMonth((prev) => (prev === monthKey ? null : monthKey));
  }

  return (
    <div className="space-y-3">
      {/* Interactive Month Pills & Spotlight Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {data.map((m) => {
            const isSelected = selectedMonth === m.month;
            const isDimmed = selectedMonth !== null && !isSelected;
            return (
              <button
                key={m.month}
                type="button"
                onClick={() => toggleMonth(m.month)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "bg-teal-pill-animated text-white shadow-md -translate-y-0.5 scale-105"
                    : isDimmed
                    ? "bg-[#E6EFEA]/60 text-[#52635D] opacity-40 blur-[0.8px] hover:opacity-80 hover:blur-none"
                    : "bg-[#E6EFEA]/80 hover:bg-[#D5E9E1] text-[#101A17]"
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {selectedMonth && (
          <button
            type="button"
            onClick={() => setSelectedMonth(null)}
            className="inline-flex items-center gap-1 rounded-full bg-[#E2F4EE] px-2.5 py-1 text-[11px] font-semibold text-[#0D6E52] hover:bg-[#D0EDE3] transition-colors cursor-pointer"
          >
            <ArrowCounterClockwise size={12} weight="bold" />
            <span>Reset Fokus</span>
          </button>
        )}
      </div>

      {/* Elevated Spotlight Card when a Month is Clicked */}
      <AnimatePresence mode="popLayout">
        {focusedItem && (
          <motion.div
            key={focusedItem.month}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="rounded-2xl bg-teal-animated text-white p-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center">
                <Sparkle size={15} weight="duotone" />
              </span>
              <div>
                <p className="text-[11px] text-white/75">
                  Sorotan Bulan Terpilih
                </p>
                <p className="text-sm font-semibold">{focusedItem.label}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
              <div>
                <span className="text-white/70 block text-[10px] font-sans">
                  Pemasukan
                </span>
                <span className="font-semibold text-[#8CF2D0]">
                  +{formatIDR(focusedItem.income)}
                </span>
              </div>
              <div>
                <span className="text-white/70 block text-[10px] font-sans">
                  Pengeluaran
                </span>
                <span className="font-semibold text-[#FFB4AE]">
                  -{formatIDR(focusedItem.expense)}
                </span>
              </div>
              <div>
                <span className="text-white/70 block text-[10px] font-sans">
                  Selisih Bersih
                </span>
                <span className="font-semibold text-white">
                  {formatIDR(focusedItem.net)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-[245px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
            barGap={6}
            onClick={(state) => {
              if (state && state.activePayload && state.activePayload[0]) {
                const payload = state.activePayload[0]
                  .payload as MonthlyCashflowPoint;
                if (payload?.month) {
                  toggleMonth(payload.month);
                }
              }
            }}
          >
            <defs>
              <linearGradient id="tealIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#139A7E" />
                <stop offset="50%" stopColor="#0E7C7B" />
                <stop offset="100%" stopColor="#0D6E52" />
              </linearGradient>
              <linearGradient id="coralExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E0564E" />
                <stop offset="100%" stopColor="#B8332C" />
              </linearGradient>
              <filter id="barBlurFilter">
                <feGaussianBlur stdDeviation="1.6" />
              </filter>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(13, 110, 82, 0.09)"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#52635D", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#52635D", fontSize: 11 }}
              tickFormatter={(v) =>
                formatCompactIDR(Number(v)).replace("Rp ", "")
              }
            />
            <Tooltip
              cursor={{ fill: "rgba(14, 124, 123, 0.07)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const inc = Number(
                  payload.find((p) => p.dataKey === "income")?.value ?? 0
                );
                const exp = Number(
                  payload.find((p) => p.dataKey === "expense")?.value ?? 0
                );
                return (
                  <div className="rounded-2xl bg-white/95 backdrop-blur-md p-3.5 ring-1 ring-[#0D6E52]/20 shadow-xl text-xs space-y-1.5">
                    <p className="font-semibold text-[#101A17]">
                      {label} (Klik untuk fokus)
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#52635D]">Pemasukan:</span>
                      <span className="font-mono font-semibold text-[#0D6E52] tabular-nums">
                        {formatIDR(inc)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#52635D]">Pengeluaran:</span>
                      <span className="font-mono font-semibold text-[#C83E37] tabular-nums">
                        {formatIDR(exp)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="income"
              name="Pemasukan"
              radius={[7, 7, 0, 0]}
              maxBarSize={28}
              className="cursor-pointer"
            >
              {data.map((entry) => {
                const isSelected = selectedMonth === entry.month;
                const isDimmed = selectedMonth !== null && !isSelected;
                return (
                  <Cell
                    key={`inc-${entry.month}`}
                    fill="url(#tealIncomeGrad)"
                    fillOpacity={isDimmed ? 0.24 : 1}
                    filter={isDimmed ? "url(#barBlurFilter)" : undefined}
                  />
                );
              })}
            </Bar>
            <Bar
              dataKey="expense"
              name="Pengeluaran"
              radius={[7, 7, 0, 0]}
              maxBarSize={28}
              className="cursor-pointer"
            >
              {data.map((entry) => {
                const isSelected = selectedMonth === entry.month;
                const isDimmed = selectedMonth !== null && !isSelected;
                return (
                  <Cell
                    key={`exp-${entry.month}`}
                    fill="url(#coralExpenseGrad)"
                    fillOpacity={isDimmed ? 0.24 : 1}
                    filter={isDimmed ? "url(#barBlurFilter)" : undefined}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================================
// 2. CATEGORY DONUT CHART (Click category -> elevates to top & blurs others!)
// ============================================================================
interface ActiveSectorProps {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
}

function renderActiveDonutShape(props: unknown) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props as ActiveSectorProps;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 9}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 15}
        fill={fill}
      />
    </g>
  );
}

export function CategoryDonutChart({
  data,
  totalExpense,
  selectedCategoryId: controlledCategoryId,
  onSelectCategory,
}: {
  data: CategorySpendPoint[];
  totalExpense: number;
  selectedCategoryId?: string | null;
  onSelectCategory?: (categoryId: string | null) => void;
}) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null
  );

  const activeCategoryId =
    controlledCategoryId !== undefined
      ? controlledCategoryId
      : internalSelectedId;

  function handleToggleCategory(catId: string) {
    const next = activeCategoryId === catId ? null : catId;
    if (onSelectCategory) {
      onSelectCategory(next);
    } else {
      setInternalSelectedId(next);
    }
  }

  // Reorder list: when a category is clicked, it floats up to the #1 top spot!
  const orderedCategories = useMemo(() => {
    const base = data.slice(0, 6);
    if (!activeCategoryId) return base;
    const selected = data.find((c) => c.category_id === activeCategoryId);
    if (!selected) return base;
    const others = base.filter((c) => c.category_id !== activeCategoryId);
    return [selected, ...others];
  }, [data, activeCategoryId]);

  const activeIndex = useMemo(() => {
    if (!activeCategoryId) return -1;
    return data.findIndex((c) => c.category_id === activeCategoryId);
  }, [data, activeCategoryId]);

  const focusedCategory = useMemo(
    () => data.find((c) => c.category_id === activeCategoryId) ?? null,
    [data, activeCategoryId]
  );

  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-xs text-[#52635D]">
        Belum ada pengeluaran pada bulan ini.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#0D6E52] bg-[#E2F4EE] px-2.5 py-0.5 rounded-full">
          Klik bagian diagram atau kategori untuk mengangkat ke atas
        </span>
        {activeCategoryId && (
          <button
            type="button"
            onClick={() => handleToggleCategory(activeCategoryId)}
            className="inline-flex items-center gap-1 rounded-full bg-[#0D6E52] text-white px-2.5 py-0.5 text-[11px] font-semibold cursor-pointer"
          >
            <ArrowCounterClockwise size={11} weight="bold" />
            <span>Tampilkan Semua</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        {/* Donut Visual with Active Pop-out & Blurred Unselected Slices */}
        <div className="sm:col-span-5 h-[215px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <filter id="pieSliceBlur">
                  <feGaussianBlur stdDeviation="2.2" />
                </filter>
              </defs>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="name"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={3}
                stroke="none"
                activeIndex={activeIndex >= 0 ? activeIndex : undefined}
                activeShape={renderActiveDonutShape}
                onClick={(_, idx) => {
                  const item = data[idx];
                  if (item) handleToggleCategory(item.category_id);
                }}
                className="cursor-pointer"
              >
                {data.map((entry) => {
                  const isSelected = activeCategoryId === entry.category_id;
                  const isDimmed =
                    activeCategoryId !== null && !isSelected;
                  return (
                    <Cell
                      key={entry.category_id}
                      fill={entry.color}
                      fillOpacity={isDimmed ? 0.25 : 1}
                      filter={isDimmed ? "url(#pieSliceBlur)" : undefined}
                    />
                  );
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Dynamic Readout */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            {focusedCategory ? (
              <motion.div
                key={focusedCategory.category_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <span className="text-[10px] font-semibold text-[#0D6E52] truncate max-w-[90px]">
                  {focusedCategory.name}
                </span>
                <span className="font-mono text-xs font-bold text-[#101A17] tabular-nums">
                  {focusedCategory.percentage}%
                </span>
                <span className="font-mono text-[10px] text-[#52635D] tabular-nums">
                  {formatCompactIDR(focusedCategory.amount)}
                </span>
              </motion.div>
            ) : (
              <>
                <span className="text-[10px] text-[#52635D]">Total Keluar</span>
                <span className="font-mono text-xs font-semibold text-[#101A17] tabular-nums">
                  {formatCompactIDR(totalExpense)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Animated Reordering Category Stack: Selected rises to #1, others blur! */}
        <div className="sm:col-span-7">
          <LayoutGroup id="donut-category-list">
            <div className="space-y-2">
              {orderedCategories.map((cat) => {
                const isSelected = activeCategoryId === cat.category_id;
                const isBlurred = activeCategoryId !== null && !isSelected;

                return (
                  <motion.button
                    layout
                    key={cat.category_id}
                    type="button"
                    onClick={() => handleToggleCategory(cat.category_id)}
                    transition={{
                      layout: { type: "spring", stiffness: 380, damping: 28 },
                    }}
                    className={`w-full rounded-2xl px-3 py-2.5 text-left flex items-center justify-between gap-2 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-teal-animated text-white shadow-[0_10px_25px_-6px_rgba(13,110,82,0.45)] -translate-y-1 scale-[1.03] ring-2 ring-[#139A7E] z-10"
                        : isBlurred
                        ? "bg-[#F3F7F5] text-[#52635D] opacity-35 blur-[1.6px] scale-[0.97] hover:opacity-75 hover:blur-[0.5px]"
                        : "bg-[#F3F7F5] hover:bg-[#E2F4EE]/70 text-[#101A17] ring-1 ring-[#0D6E52]/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(255,255,255,0.18)"
                            : `${cat.color}20`,
                          color: isSelected ? "#FFFFFF" : cat.color,
                        }}
                        className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                      >
                        <CategoryIcon
                          name={cat.icon}
                          size={15}
                          weight="duotone"
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {cat.name}
                        </p>
                        {isSelected && (
                          <p className="text-[10px] text-white/80">
                            {cat.transaction_count} transaksi · Klik lagi untuk
                            kembali
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 font-mono tabular-nums text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-white text-[#0D6E52]"
                        }`}
                      >
                        {cat.percentage}%
                      </span>
                      <span className="font-semibold">
                        {formatIDR(cat.amount)}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. DAILY SPEND AREA CHART (Animated Teal Gradient Area)
// ============================================================================
export function DailySpendAreaChart({ data }: { data: DailySpendPoint[] }) {
  const peakDay = useMemo(() => {
    return data.reduce<DailySpendPoint | null>((best, cur) => {
      if (cur.expense <= 0) return best;
      if (!best || cur.expense > best.expense) return cur;
      return best;
    }, null);
  }, [data]);

  return (
    <div className="space-y-3">
      {peakDay && (
        <div className="rounded-xl bg-teal-soft-animated px-3.5 py-2 ring-1 ring-[#0D6E52]/15 flex items-center justify-between text-xs">
          <span className="text-[#52635D]">
            Puncak pengeluaran harian: <strong>Tanggal {peakDay.date}</strong>
          </span>
          <span className="font-mono font-semibold text-[#0D6E52] tabular-nums">
            {formatIDR(peakDay.expense)}
          </span>
        </div>
      )}

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="spendTealFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0E7C7B" stopOpacity={0.38} />
                <stop offset="55%" stopColor="#139A7E" stopOpacity={0.16} />
                <stop offset="95%" stopColor="#0D6E52" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(13, 110, 82, 0.08)"
            />
            <XAxis
              dataKey="dayLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#52635D", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#52635D", fontSize: 11 }}
              tickFormatter={(v) =>
                formatCompactIDR(Number(v)).replace("Rp ", "")
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload[0]) return null;
                const point = payload[0].payload as DailySpendPoint;
                return (
                  <div className="rounded-2xl bg-teal-animated text-white p-3 shadow-xl text-xs">
                    <p className="font-medium text-white/80">
                      Tanggal {point.date}
                    </p>
                    <p className="font-mono font-semibold text-white tabular-nums mt-0.5">
                      Keluar: {formatIDR(point.expense)}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#0E7C7B"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#spendTealFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ============================================================================
// 4. WALLET DISTRIBUTION INTERACTIVE BARS (Click wallet -> elevate & blur rest)
// ============================================================================
export function WalletDistributionBarChart({
  wallets,
}: {
  wallets: Wallet[];
}) {
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  const totalBalance = useMemo(
    () => wallets.reduce((acc, w) => acc + Math.max(0, w.balance), 0),
    [wallets]
  );

  const orderedWallets = useMemo(() => {
    if (!selectedWalletId) return wallets;
    const selected = wallets.find((w) => w.id === selectedWalletId);
    if (!selected) return wallets;
    const others = wallets.filter((w) => w.id !== selectedWalletId);
    return [selected, ...others];
  }, [wallets, selectedWalletId]);

  function toggleWallet(id: string) {
    setSelectedWalletId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#0D6E52] bg-[#E2F4EE] px-2.5 py-0.5 rounded-full">
          Klik kantong untuk fokus & mengangkat ke urutan teratas
        </span>
        {selectedWalletId && (
          <button
            type="button"
            onClick={() => setSelectedWalletId(null)}
            className="inline-flex items-center gap-1 rounded-full bg-[#0D6E52] text-white px-2.5 py-0.5 text-[11px] font-semibold cursor-pointer"
          >
            <ArrowCounterClockwise size={11} weight="bold" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <LayoutGroup id="wallet-dist-bars">
        <div className="space-y-2.5">
          {orderedWallets.map((w) => {
            const isSelected = selectedWalletId === w.id;
            const isBlurred = selectedWalletId !== null && !isSelected;
            const ratio =
              totalBalance > 0
                ? Math.max(0, Math.round((w.balance / totalBalance) * 100))
                : 0;

            return (
              <motion.button
                layout
                key={w.id}
                type="button"
                onClick={() => toggleWallet(w.id)}
                transition={{
                  layout: { type: "spring", stiffness: 360, damping: 28 },
                }}
                className={`w-full rounded-2xl p-3.5 text-left transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? "bg-teal-animated text-white shadow-[0_12px_28px_-8px_rgba(13,110,82,0.45)] -translate-y-1 scale-[1.02] ring-2 ring-[#139A7E]"
                    : isBlurred
                    ? "bg-[#F3F7F5] text-[#52635D] opacity-35 blur-[1.6px] scale-[0.97] hover:opacity-75 hover:blur-[0.5px]"
                    : "bg-[#F3F7F5] hover:bg-[#E2F4EE]/70 text-[#101A17] ring-1 ring-[#0D6E52]/[0.08]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      style={{
                        backgroundColor: isSelected
                          ? "rgba(255,255,255,0.18)"
                          : `${w.color}20`,
                        color: isSelected ? "#FFFFFF" : w.color,
                      }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    >
                      <CategoryIcon name={w.icon} size={17} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{w.name}</p>
                      <p
                        className={`text-[10px] capitalize ${
                          isSelected ? "text-white/75" : "text-[#52635D]"
                        }`}
                      >
                        {w.type} · Porsi {ratio}% dari seluruh kantong
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-sm font-semibold tabular-nums shrink-0">
                    {formatIDR(w.balance)}
                  </span>
                </div>

                <div
                  className={`mt-2.5 h-2 w-full rounded-full overflow-hidden ${
                    isSelected ? "bg-white/20" : "bg-[#E2ECE8]"
                  }`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ratio)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{
                      backgroundColor: isSelected ? "#7AF0CB" : w.color,
                    }}
                    className="h-full rounded-full"
                  />
                </div>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}
