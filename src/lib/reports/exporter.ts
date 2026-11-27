import {
  formatDateID,
  formatIDR,
  formatMonthLabel,
} from "@/lib/format";
import type {
  FinancialReportPayload,
  ReportCategorySummaryItem,
  ReportDailyTrendItem,
  ReportFilterInput,
  ReportMutationRow,
  ReportWalletSummaryItem,
  TransactionWithRelations,
  Wallet,
} from "@/lib/types/database";

const CHART_PALETTE = [
  "#0D6E52",
  "#179C75",
  "#2B5B84",
  "#C4781A",
  "#C83E37",
  "#5D7A68",
  "#38A387",
];

function shiftDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + deltaDays));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getLastDayOfMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m, 0));
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${monthKey}-${dd}`;
}

function countDaysInclusive(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const startUtc = Date.UTC(sy, (sm || 1) - 1, sd || 1);
  const endUtc = Date.UTC(ey, (em || 1) - 1, ed || 1);
  const diff = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

function formatFullTimestampWIB(now: Date = new Date()): string {
  const isoDate = now.toISOString().slice(0, 10);
  const datePart = formatDateID(isoDate);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${datePart}, ${hh}:${mm}:${ss} WIB`;
}

function buildTextProgressBar(percentage: number, width = 14): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * width);
  const empty = Math.max(0, width - filled);
  return `${"█".repeat(filled)}${"░".repeat(empty)}`;
}

export function resolveReportDateBounds(filter: ReportFilterInput): {
  startDate: string;
  endDate: string;
  periodLabel: string;
} {
  const todayIso = new Date().toISOString().slice(0, 10);

  if (filter.mode === "weekly") {
    const endDate = filter.weekAnchorDate || todayIso;
    const startDate = shiftDays(endDate, -6);
    return {
      startDate,
      endDate,
      periodLabel: `Mingguan (${formatDateID(startDate)} - ${formatDateID(endDate)})`,
    };
  }

  if (filter.mode === "monthly") {
    const monthKey = filter.month || todayIso.slice(0, 7);
    const startDate = `${monthKey}-01`;
    const endDate = getLastDayOfMonth(monthKey);
    return {
      startDate,
      endDate,
      periodLabel: `Bulanan (${formatMonthLabel(monthKey)})`,
    };
  }

  const startDate = filter.startDate || shiftDays(todayIso, -29);
  const endDate = filter.endDate || todayIso;
  return {
    startDate,
    endDate,
    periodLabel: `Rentang Tanggal (${formatDateID(startDate)} - ${formatDateID(endDate)})`,
  };
}

export function buildFinancialReportPayload(params: {
  accountName?: string;
  accountEmail?: string;
  spaceName: string;
  spaceType: "personal" | "family";
  filter: ReportFilterInput;
  transactions: TransactionWithRelations[];
  wallets: Pick<Wallet, "id" | "name" | "balance">[];
}): FinancialReportPayload {
  const now = new Date();
  const { startDate, endDate, periodLabel } = resolveReportDateBounds(
    params.filter
  );
  const totalDays = countDaysInclusive(startDate, endDate);

  // Filter transactions within [startDate, endDate]
  const filteredDesc = params.transactions
    .filter((tx) => {
      const txDate = tx.occurred_at.slice(0, 10);
      return txDate >= startDate && txDate <= endDate;
    })
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  // Chronological order (oldest -> newest) for running balance mutation ledger
  const chronological = [...filteredDesc].reverse();

  let totalIncome = 0;
  let totalExpense = 0;
  let totalTransfer = 0;
  let expenseTxCount = 0;

  const categoryMap = new Map<
    string,
    {
      categoryName: string;
      color: string;
      type: "income" | "expense";
      totalAmount: number;
      transactionCount: number;
    }
  >();

  const walletFlowMap = new Map<string, { inflow: number; outflow: number }>();
  const dailyMap = new Map<string, { income: number; expense: number }>();

  let runningNet = 0;
  const mutationRows: ReportMutationRow[] = [];

  for (let i = 0; i < chronological.length; i++) {
    const tx = chronological[i];
    const dateKey = tx.occurred_at.slice(0, 10);
    const dayBucket = dailyMap.get(dateKey) ?? { income: 0, expense: 0 };

    let creditIncome = 0;
    let debitExpense = 0;
    let transferAmount = 0;

    if (tx.type === "income") {
      totalIncome += tx.amount;
      creditIncome = tx.amount;
      runningNet += tx.amount;
      dayBucket.income += tx.amount;

      const flow = walletFlowMap.get(tx.wallet_id) ?? { inflow: 0, outflow: 0 };
      flow.inflow += tx.amount;
      walletFlowMap.set(tx.wallet_id, flow);
    } else if (tx.type === "expense") {
      totalExpense += tx.amount;
      debitExpense = tx.amount;
      runningNet -= tx.amount;
      expenseTxCount += 1;
      dayBucket.expense += tx.amount;

      const flow = walletFlowMap.get(tx.wallet_id) ?? { inflow: 0, outflow: 0 };
      flow.outflow += tx.amount;
      walletFlowMap.set(tx.wallet_id, flow);
    } else if (tx.type === "transfer") {
      totalTransfer += tx.amount;
      transferAmount = tx.amount;

      const srcFlow = walletFlowMap.get(tx.wallet_id) ?? {
        inflow: 0,
        outflow: 0,
      };
      srcFlow.outflow += tx.amount;
      walletFlowMap.set(tx.wallet_id, srcFlow);

      if (tx.destination_wallet_id) {
        const dstFlow = walletFlowMap.get(tx.destination_wallet_id) ?? {
          inflow: 0,
          outflow: 0,
        };
        dstFlow.inflow += tx.amount;
        walletFlowMap.set(tx.destination_wallet_id, dstFlow);
      }
    }

    dailyMap.set(dateKey, dayBucket);

    if (tx.type === "income" || tx.type === "expense") {
      const key = `${tx.type}:${tx.category_name ?? "Lainnya"}`;
      const existing = categoryMap.get(key) ?? {
        categoryName: tx.category_name ?? "Lainnya",
        color:
          tx.category_color ||
          CHART_PALETTE[categoryMap.size % CHART_PALETTE.length],
        type: tx.type,
        totalAmount: 0,
        transactionCount: 0,
      };
      existing.totalAmount += tx.amount;
      existing.transactionCount += 1;
      categoryMap.set(key, existing);
    }

    const shortCode = `TRX-${dateKey.replace(/-/g, "").slice(2)}-${String(
      i + 1
    ).padStart(3, "0")}`;

    mutationRows.push({
      rowNumber: i + 1,
      date: dateKey,
      txCode: shortCode,
      description: tx.note || tx.category_name || "Mutasi Antar Kantong",
      categoryName:
        tx.type === "transfer"
          ? "Transfer Antar Kantong"
          : tx.category_name ?? "Umum",
      walletInfo: tx.destination_wallet_name
        ? `${tx.wallet_name} -> ${tx.destination_wallet_name}`
        : tx.wallet_name,
      recordedBy: tx.creator_name,
      type: tx.type,
      creditIncome,
      debitExpense,
      transferAmount,
      runningNet,
    });
  }

  const categoryBreakdown: ReportCategorySummaryItem[] = Array.from(
    categoryMap.values()
  )
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .map((item, idx) => {
      const base = item.type === "expense" ? totalExpense : totalIncome;
      const percentage =
        base > 0 ? Math.round((item.totalAmount / base) * 100) : 0;
      return {
        ...item,
        color: item.color || CHART_PALETTE[idx % CHART_PALETTE.length],
        averageAmount: Math.round(
          item.totalAmount / Math.max(1, item.transactionCount)
        ),
        percentage,
      };
    });

  const totalWalletBalance = params.wallets.reduce(
    (acc, w) => acc + Math.max(0, w.balance),
    0
  );

  const walletBreakdown: ReportWalletSummaryItem[] = params.wallets.map((w) => {
    const flow = walletFlowMap.get(w.id) ?? { inflow: 0, outflow: 0 };
    const estimatedOpeningBalance =
      w.balance - flow.inflow + flow.outflow;
    const sharePercentage =
      totalWalletBalance > 0
        ? Math.round((Math.max(0, w.balance) / totalWalletBalance) * 100)
        : 0;
    return {
      walletName: w.name,
      estimatedOpeningBalance,
      currentBalance: w.balance,
      periodInflow: flow.inflow,
      periodOutflow: flow.outflow,
      sharePercentage,
    };
  });

  // Build daily trend points (sorted by date)
  const dailyTrend: ReportDailyTrendItem[] = Array.from(dailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, vals]) => ({
      date,
      label: formatDateID(date).replace(/ \d{4}$/, ""),
      income: vals.income,
      expense: vals.expense,
      net: vals.income - vals.expense,
    }));

  const netCashflow = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
      : 0;
  const avgDailyExpense = Math.round(totalExpense / totalDays);
  const avgTransactionExpense =
    expenseTxCount > 0 ? Math.round(totalExpense / expenseTxCount) : 0;

  const expenseCategories = categoryBreakdown.filter(
    (c) => c.type === "expense"
  );
  const topExpenseCat = expenseCategories[0] ?? null;

  const largestExpenseTx =
    filteredDesc
      .filter((t) => t.type === "expense")
      .sort((a, b) => b.amount - a.amount)[0] ?? null;

  let healthStatus: FinancialReportPayload["healthStatus"] = {
    label: "Surplus Sehat",
    summary:
      "Arus kas berada di zona positif dengan porsi tabungan yang terjaga baik.",
    tone: "safe",
  };

  if (totalIncome === 0 && totalExpense > 0) {
    healthStatus = {
      label: "Periode Pengeluaran Aktif",
      summary:
        "Tidak ada pemasukan yang dicatat pada rentang ini, fokus pada pengendalian pengeluaran harian.",
      tone: "warning",
    };
  } else if (netCashflow < 0) {
    healthStatus = {
      label: "Defisit Arus Kas",
      summary:
        "Total pengeluaran melampaui pemasukan pada periode ini. Evaluasi kategori dengan serapan tertinggi.",
      tone: "danger",
    };
  } else if (savingsRate < 15) {
    healthStatus = {
      label: "Surplus Tipis (Waspada)",
      summary:
        "Arus kas masih positif namun rasio tabungan di bawah 15%. Perhatikan batas aman harian.",
      tone: "warning",
    };
  }

  const insights: string[] = [
    `Rata-rata pengeluaran harian selama ${totalDays} hari pada periode ini adalah ${formatIDR(
      avgDailyExpense
    )}/hari (${expenseTxCount} transaksi pengeluaran).`,
    topExpenseCat
      ? `Serapan pengeluaran terbesar berada pada kategori "${topExpenseCat.categoryName}" sebesar ${formatIDR(
          topExpenseCat.totalAmount
        )} (${topExpenseCat.percentage}% dari total keluar).`
      : "Belum ada pengeluaran per kategori yang tercatat pada periode ini.",
    largestExpenseTx
      ? `Transaksi pengeluaran tunggal tertinggi adalah "${
          largestExpenseTx.note || largestExpenseTx.category_name
        }" senilai ${formatIDR(largestExpenseTx.amount)} pada ${formatDateID(
          largestExpenseTx.occurred_at
        )}.`
      : "Tidak ada transaksi pengeluaran tunggal pada rentang tanggal ini.",
    `Total dana aktif di seluruh kantong saat ini berjumlah ${formatIDR(
      totalWalletBalance
    )} yang tersebar di ${params.wallets.length} kantong.`,
  ];

  const dateStampCode = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStampCode = `${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  return {
    reportId: `SR-${dateStampCode}-${timeStampCode}`,
    accountName: params.accountName || "Raka Pratama",
    accountEmail: params.accountEmail || "raka@sakuruang.id",
    spaceName: params.spaceName,
    spaceTypeLabel:
      params.spaceType === "family" ? "Ruang Keluarga" : "Ruang Pribadi",
    periodMode: params.filter.mode,
    periodLabel,
    startDate,
    endDate,
    totalDays,
    generatedAtLabel: formatDateID(now.toISOString().slice(0, 10)),
    generatedTimestamp: formatFullTimestampWIB(now),
    totalIncome,
    totalExpense,
    totalTransfer,
    netCashflow,
    savingsRate,
    avgDailyExpense,
    avgTransactionExpense,
    transactionCount: filteredDesc.length,
    healthStatus,
    insights,
    dailyTrend,
    categoryBreakdown,
    walletBreakdown,
    mutationRows,
    transactions: filteredDesc,
  };
}

function escapeHtml(raw: string | number): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSvgDonutChart(
  expenseCategories: ReportCategorySummaryItem[],
  totalExpense: number
): string {
  if (expenseCategories.length === 0 || totalExpense <= 0) {
    return `<div style="height:180px;display:flex;align-items:center;justify-content:center;color:#5A655E;font-size:12px;background:#F6F7F4;border-radius:14px;">Belum ada data pengeluaran pada periode ini</div>`;
  }

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  const segments = expenseCategories.slice(0, 6).map((cat, idx) => {
    const pct = Math.max(1, cat.percentage);
    const dashLength = (pct / 100) * circumference;
    const dashOffset = -((cumulativePercent / 100) * circumference);
    cumulativePercent += pct;
    const color = cat.color || CHART_PALETTE[idx % CHART_PALETTE.length];

    return `<circle
      cx="80"
      cy="80"
      r="${radius}"
      fill="transparent"
      stroke="${color}"
      stroke-width="22"
      stroke-dasharray="${dashLength.toFixed(2)} ${circumference.toFixed(2)}"
      stroke-dashoffset="${dashOffset.toFixed(2)}"
      transform="rotate(-90 80 80)"
    />`;
  });

  const legendItems = expenseCategories
    .slice(0, 5)
    .map((cat, idx) => {
      const color = cat.color || CHART_PALETTE[idx % CHART_PALETTE.length];
      return `<div style="display:flex;align-items:center;justify-content:space-between;font-size:11.5px;padding:4px 0;border-bottom:1px dashed rgba(20,25,22,0.08);">
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${color};"></span>
          <span style="font-weight:600;color:#141916;">${escapeHtml(
            cat.categoryName
          )}</span>
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#5A655E;">
          <strong style="color:#141916;">${cat.percentage}%</strong> (${formatIDR(
        cat.totalAmount
      )})
        </div>
      </div>`;
    })
    .join("");

  return `<div style="display:flex;align-items:center;gap:18px;">
    <svg width="160" height="160" viewBox="0 0 160 160" style="flex-shrink:0;">
      <circle cx="80" cy="80" r="${radius}" fill="transparent" stroke="#EFEFE9" stroke-width="22" />
      ${segments.join("")}
      <text x="80" y="76" text-anchor="middle" style="font-size:10px;fill:#5A655E;font-weight:600;">TOTAL KELUAR</text>
      <text x="80" y="92" text-anchor="middle" style="font-size:11px;fill:#141916;font-family:monospace;font-weight:700;">${escapeHtml(
        formatIDR(totalExpense)
      )}</text>
    </svg>
    <div style="flex:1;min-width:0;">
      ${legendItems}
    </div>
  </div>`;
}

function buildSvgCashflowComparisonAndTrend(
  report: FinancialReportPayload
): string {
  const maxMacro = Math.max(1, report.totalIncome, report.totalExpense);
  const incomePct = Math.round((report.totalIncome / maxMacro) * 100);
  const expensePct = Math.round((report.totalExpense / maxMacro) * 100);

  const trendPoints = report.dailyTrend.slice(-10);
  const maxDaily = Math.max(
    1,
    ...trendPoints.map((d) => Math.max(d.income, d.expense))
  );

  const barsSvg =
    trendPoints.length === 0
      ? `<text x="180" y="65" text-anchor="middle" style="font-size:11px;fill:#5A655E;">Tidak ada aktivitas harian</text>`
      : trendPoints
          .map((pt, idx) => {
            const slotWidth = 340 / Math.max(1, trendPoints.length);
            const xBase = 16 + idx * slotWidth;
            const incH = Math.max(
              2,
              Math.round((pt.income / maxDaily) * 72)
            );
            const expH = Math.max(
              2,
              Math.round((pt.expense / maxDaily) * 72)
            );
            return `<g>
              <rect x="${(xBase + 2).toFixed(1)}" y="${92 - incH}" width="${Math.min(
              11,
              slotWidth * 0.36
            ).toFixed(1)}" height="${incH}" rx="2" fill="#0D6E52" />
              <rect x="${(xBase + 4 + Math.min(11, slotWidth * 0.36)).toFixed(
                1
              )}" y="${92 - expH}" width="${Math.min(
              11,
              slotWidth * 0.36
            ).toFixed(1)}" height="${expH}" rx="2" fill="#C83E37" />
              <text x="${(xBase + slotWidth * 0.38).toFixed(
                1
              )}" y="108" text-anchor="middle" style="font-size:8.5px;fill:#5A655E;font-family:monospace;">${escapeHtml(
              pt.label
            )}</text>
            </g>`;
          })
          .join("");

  return `<div style="display:flex;flex-direction:column;gap:14px;">
    <div style="space-y:8px;">
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px;">
          <span style="font-weight:600;color:#0D6E52;">Uang Masuk (Kredit)</span>
          <span style="font-family:monospace;font-weight:700;color:#0D6E52;">${formatIDR(
            report.totalIncome
          )}</span>
        </div>
        <div style="height:10px;background:#EFEFE9;border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:${incomePct}%;background:#0D6E52;border-radius:999px;"></div>
        </div>
      </div>

      <div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px;">
          <span style="font-weight:600;color:#C83E37;">Uang Keluar (Debit)</span>
          <span style="font-family:monospace;font-weight:700;color:#C83E37;">${formatIDR(
            report.totalExpense
          )}</span>
        </div>
        <div style="height:10px;background:#EFEFE9;border-radius:999px;overflow:hidden;">
          <div style="height:100%;width:${expensePct}%;background:#C83E37;border-radius:999px;"></div>
        </div>
      </div>
    </div>

    <div style="background:#F6F7F4;border-radius:12px;padding:10px 12px;border:1px solid rgba(20,25,22,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:#5A655E;margin-bottom:4px;">
        <span style="font-weight:700;color:#141916;">DIAGRAM AKTIVITAS HARIAN PERIODE</span>
        <span><strong style="color:#0D6E52;">&#9632;</strong> Masuk &nbsp; <strong style="color:#C83E37;">&#9632;</strong> Keluar</span>
      </div>
      <svg width="100%" height="114" viewBox="0 0 368 114">
        <line x1="10" y1="92" x2="358" y2="92" stroke="rgba(20,25,22,0.14)" stroke-width="1" />
        ${barsSvg}
      </svg>
    </div>
  </div>`;
}

export function generateReportHtmlDocument(
  report: FinancialReportPayload
): string {
  const expenseCategories = report.categoryBreakdown.filter(
    (c) => c.type === "expense"
  );

  const donutSvgHtml = buildSvgDonutChart(
    expenseCategories,
    report.totalExpense
  );
  const cashflowChartHtml = buildSvgCashflowComparisonAndTrend(report);

  const toneBadgeBg =
    report.healthStatus.tone === "safe"
      ? "#E6F4EF"
      : report.healthStatus.tone === "warning"
      ? "#FEF3C7"
      : "#FEE2E2";
  const toneBadgeColor =
    report.healthStatus.tone === "safe"
      ? "#0D6E52"
      : report.healthStatus.tone === "warning"
      ? "#B45309"
      : "#C83E37";

  const insightsHtml = report.insights
    .map(
      (text) =>
        `<li style="margin-bottom:5px;font-size:12px;color:#141916;">${escapeHtml(
          text
        )}</li>`
    )
    .join("");

  const categoryRowsHtml =
    report.categoryBreakdown.length === 0
      ? `<tr><td colspan="6" style="text-align:center;padding:16px;color:#5A655E;">Belum ada transaksi kategori pada periode ini.</td></tr>`
      : report.categoryBreakdown
          .map(
            (cat) => `<tr>
              <td style="font-weight:600;">
                <span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${
                  cat.color
                };margin-right:6px;"></span>
                ${escapeHtml(cat.categoryName)}
              </td>
              <td>
                <span style="font-size:11px;padding:2px 8px;border-radius:99px;background:${
                  cat.type === "income" ? "#E6F4EF" : "#FEE2E2"
                };color:${
              cat.type === "income" ? "#0D6E52" : "#C83E37"
            };font-weight:600;">
                  ${cat.type === "income" ? "Pemasukan" : "Pengeluaran"}
                </span>
              </td>
              <td style="text-align:center;font-family:monospace;">${
                cat.transactionCount
              }x</td>
              <td style="text-align:right;font-family:monospace;">${formatIDR(
                cat.averageAmount
              )}</td>
              <td style="width:150px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="flex:1;height:7px;background:#EFEFE9;border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${Math.min(
                      100,
                      cat.percentage
                    )}%;background:${cat.color};border-radius:99px;"></div>
                  </div>
                  <span style="font-family:monospace;font-size:11px;width:32px;text-align:right;">${
                    cat.percentage
                  }%</span>
                </div>
              </td>
              <td style="text-align:right;font-family:monospace;font-weight:700;">${formatIDR(
                cat.totalAmount
              )}</td>
            </tr>`
          )
          .join("");

  const walletRowsHtml = report.walletBreakdown
    .map(
      (w) => `<tr>
        <td style="font-weight:600;">${escapeHtml(w.walletName)}</td>
        <td style="text-align:right;font-family:monospace;color:#5A655E;">${formatIDR(
          w.estimatedOpeningBalance
        )}</td>
        <td style="text-align:right;font-family:monospace;color:#0D6E52;font-weight:600;">+${formatIDR(
          w.periodInflow
        )}</td>
        <td style="text-align:right;font-family:monospace;color:#C83E37;font-weight:600;">-${formatIDR(
          w.periodOutflow
        )}</td>
        <td style="width:140px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="flex:1;height:7px;background:#EFEFE9;border-radius:99px;overflow:hidden;">
              <div style="height:100%;width:${Math.min(
                100,
                w.sharePercentage
              )}%;background:#0D6E52;border-radius:99px;"></div>
            </div>
            <span style="font-family:monospace;font-size:11px;width:32px;text-align:right;">${
              w.sharePercentage
            }%</span>
          </div>
        </td>
        <td style="text-align:right;font-family:monospace;font-weight:700;">${formatIDR(
          w.currentBalance
        )}</td>
      </tr>`
    )
    .join("");

  const mutationRowsHtml =
    report.mutationRows.length === 0
      ? `<tr><td colspan="9" style="text-align:center;padding:24px;color:#5A655E;">Tidak ada mutasi transaksi pada rentang waktu ini.</td></tr>`
      : report.mutationRows
          .map(
            (row) => `<tr>
              <td style="text-align:center;font-family:monospace;color:#5A655E;">${
                row.rowNumber
              }</td>
              <td style="font-family:monospace;white-space:nowrap;">${
                row.date
              }</td>
              <td style="font-family:monospace;font-size:11px;color:#5A655E;">${
                row.txCode
              }</td>
              <td style="font-weight:600;">${escapeHtml(row.description)}</td>
              <td>${escapeHtml(row.categoryName)}</td>
              <td>${escapeHtml(row.walletInfo)}</td>
              <td>${escapeHtml(row.recordedBy)}</td>
              <td style="text-align:right;font-family:monospace;font-weight:700;color:#0D6E52;">
                ${row.creditIncome > 0 ? `+${formatIDR(row.creditIncome)}` : "-"}
              </td>
              <td style="text-align:right;font-family:monospace;font-weight:700;color:#C83E37;">
                ${
                  row.debitExpense > 0
                    ? `-${formatIDR(row.debitExpense)}`
                    : row.transferAmount > 0
                    ? `Mutasi ${formatIDR(row.transferAmount)}`
                    : "-"
                }
              </td>
              <td style="text-align:right;font-family:monospace;font-weight:700;color:${
                row.runningNet >= 0 ? "#141916" : "#C83E37"
              };">
                ${formatIDR(row.runningNet)}
              </td>
            </tr>`
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Laporan Keuangan SakuRuang - ${escapeHtml(
    report.spaceName
  )} (${escapeHtml(report.periodLabel)})</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px 20px;
      background: #F6F7F4;
      color: #141916;
      font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", sans-serif;
      line-height: 1.48;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      max-width: 1060px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 22px;
      padding: 34px 36px;
      border: 1px solid rgba(20, 25, 22, 0.1);
      box-shadow: 0 12px 36px rgba(20, 25, 22, 0.05);
    }
    .masthead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      border-bottom: 2.5px solid #0D6E52;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .brand-badge {
      display: inline-block;
      background: #0D6E52;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    .doc-title {
      font-size: 22px;
      font-weight: 800;
      color: #141916;
      margin: 8px 0 2px 0;
      letter-spacing: -0.02em;
    }
    .doc-sub {
      font-size: 13px;
      color: #5A655E;
    }
    .meta-table {
      width: auto;
      border-collapse: collapse;
      font-size: 11.5px;
      margin: 0;
    }
    .meta-table td {
      padding: 3px 8px;
      border: none;
    }
    .meta-label {
      color: #5A655E;
      text-align: right;
      font-weight: 500;
    }
    .meta-val {
      color: #141916;
      font-weight: 700;
      font-family: "JetBrains Mono", monospace;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #F6F7F4;
      border-radius: 14px;
      padding: 14px 16px;
      border: 1px solid rgba(20, 25, 22, 0.08);
    }
    .kpi-label {
      font-size: 10.5px;
      font-weight: 700;
      color: #5A655E;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .kpi-val {
      font-family: "JetBrains Mono", monospace;
      font-size: 18px;
      font-weight: 800;
      margin-top: 5px;
    }
    .kpi-foot {
      font-size: 11px;
      color: #5A655E;
      margin-top: 3px;
    }
    .viz-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }
    .panel {
      background: #FFFFFF;
      border: 1px solid rgba(20, 25, 22, 0.1);
      border-radius: 16px;
      padding: 16px 18px;
    }
    .panel-title {
      font-size: 13px;
      font-weight: 800;
      color: #141916;
      margin: 0 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .panel-sub {
      font-size: 11.5px;
      color: #5A655E;
      margin: 0 0 12px 0;
    }
    .analysis-box {
      background: #F6F7F4;
      border-left: 4px solid #0D6E52;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 26px 0 10px 0;
      padding-bottom: 6px;
      border-bottom: 1.5px solid rgba(20, 25, 22, 0.12);
    }
    .section-head h2 {
      font-size: 14px;
      font-weight: 800;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0D6E52;
    }
    .section-head span {
      font-size: 11.5px;
      color: #5A655E;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      margin-bottom: 18px;
    }
    table.data-table th {
      background: #0A4D3C;
      color: #FFFFFF;
      text-align: left;
      padding: 9px 10px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.03em;
    }
    table.data-table td {
      padding: 8px 10px;
      border-bottom: 1px solid rgba(20, 25, 22, 0.08);
      vertical-align: middle;
    }
    table.data-table tr:nth-child(even) td {
      background: #FAFBF9;
    }
    table.data-table tfoot td {
      background: #EFEFE9 !important;
      font-weight: 800;
      border-top: 2px solid #0D6E52;
      padding: 10px;
    }
    .footer-sign {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px dashed rgba(20, 25, 22, 0.16);
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #5A655E;
    }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .sheet { border: none; box-shadow: none; padding: 12px; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- KOP LAPORAN / MASTHEAD -->
    <div class="masthead">
      <div>
        <span class="brand-badge">SAKURUANG · LAPORAN EKSEKUTIF & MUTASI</span>
        <h1 class="doc-title">${escapeHtml(report.spaceName)} (${escapeHtml(
    report.spaceTypeLabel
  )})</h1>
        <div class="doc-sub">Periode Laporan: <strong>${escapeHtml(
          report.periodLabel
        )}</strong> (${report.totalDays} Hari Kalender)</div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-label">No. Referensi:</td>
          <td class="meta-val">${escapeHtml(report.reportId)}</td>
        </tr>
        <tr>
          <td class="meta-label">Nama Akun:</td>
          <td class="meta-val">${escapeHtml(report.accountName)} (${escapeHtml(
    report.accountEmail
  )})</td>
        </tr>
        <tr>
          <td class="meta-label">Rentang Tanggal:</td>
          <td class="meta-val">${report.startDate} s/d ${report.endDate}</td>
        </tr>
        <tr>
          <td class="meta-label">Dicetak Pada:</td>
          <td class="meta-val">${escapeHtml(report.generatedTimestamp)}</td>
        </tr>
      </table>
    </div>

    <!-- 4 KARTU INDIKATOR UTAMA -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Total Uang Masuk (Kredit)</div>
        <div class="kpi-val" style="color:#0D6E52;">+${formatIDR(
          report.totalIncome
        )}</div>
        <div class="kpi-foot">Pemasukan periode berjalan</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Uang Keluar (Debit)</div>
        <div class="kpi-val" style="color:#C83E37;">-${formatIDR(
          report.totalExpense
        )}</div>
        <div class="kpi-foot">Rata-rata ${formatIDR(
          report.avgDailyExpense
        )} / hari</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Arus Kas Bersih (Net)</div>
        <div class="kpi-val" style="color:${
          report.netCashflow >= 0 ? "#141916" : "#C83E37"
        };">${formatIDR(report.netCashflow)}</div>
        <div class="kpi-foot">Mutasi transfer: ${formatIDR(
          report.totalTransfer
        )}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Rasio Tabungan & Status</div>
        <div class="kpi-val" style="color:#0D6E52;">${report.savingsRate}%</div>
        <div class="kpi-foot">
          <span style="background:${toneBadgeBg};color:${toneBadgeColor};padding:1px 7px;border-radius:99px;font-weight:700;font-size:10.5px;">
            ${escapeHtml(report.healthStatus.label)}
          </span>
        </div>
      </div>
    </div>

    <!-- BAGIAN ATAS: VISUALISASI DIAGRAM (2 PANEL GRAFIK SVG) -->
    <div class="viz-grid">
      <div class="panel">
        <h3 class="panel-title">Visualisasi Arus Kas & Tren Harian</h3>
        <p class="panel-sub">Perbandingan kredit vs debit serta grafik ritme transaksi harian</p>
        ${cashflowChartHtml}
      </div>

      <div class="panel">
        <h3 class="panel-title">Diagram Komposisi Pengeluaran Kategori</h3>
        <p class="panel-sub">Proporsi serapan pengeluaran terbesar beserta persentase</p>
        ${donutSvgHtml}
      </div>
    </div>

    <!-- KOTAK ANALISIS EKSEKUTIF LENGKAP -->
    <div class="analysis-box">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <strong style="font-size:12.5px;color:#0D6E52;text-transform:uppercase;letter-spacing:0.04em;">
          Ringkasan Analisis Keuangan (${escapeHtml(report.healthStatus.label)})
        </strong>
        <span style="font-size:11px;color:#5A655E;">Rata-rata per transaksi keluar: <strong>${formatIDR(
          report.avgTransactionExpense
        )}</strong></span>
      </div>
      <p style="margin:0 0 8px 0;font-size:12px;color:#5A655E;">${escapeHtml(
        report.healthStatus.summary
      )}</p>
      <ul style="margin:0;padding-left:18px;">
        ${insightsHtml}
      </ul>
    </div>

    <!-- BAGIAN 1: TABEL ANALISIS KATEGORI & VISUAL BAR -->
    <div class="section-head">
      <h2>1. Analisis Rincian Kategori & Proporsi Visual</h2>
      <span>Diurutkan dari nominal terbesar pada periode laporan</span>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Nama Kategori</th>
          <th>Jenis Arus</th>
          <th style="text-align:center;">Frekuensi</th>
          <th style="text-align:right;">Rata-Rata / Transaksi</th>
          <th>Diagram Proporsi</th>
          <th style="text-align:right;">Total Nominal</th>
        </tr>
      </thead>
      <tbody>${categoryRowsHtml}</tbody>
    </table>

    <!-- BAGIAN 2: TABEL POSISI SALDO & MUTASI KANTONG -->
    <div class="section-head">
      <h2>2. Posisi Saldo & Mutasi per Kantong / Dompet</h2>
      <span>Perbandingan estimasi saldo awal, mutasi masuk/keluar, dan saldo akhir aktual</span>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Nama Kantong / Dompet</th>
          <th style="text-align:right;">Estimasi Saldo Awal</th>
          <th style="text-align:right;">Total Masuk (+)</th>
          <th style="text-align:right;">Total Keluar (-)</th>
          <th>Porsi Dana Aktif</th>
          <th style="text-align:right;">Saldo Akhir Aktual</th>
        </tr>
      </thead>
      <tbody>${walletRowsHtml}</tbody>
    </table>

    <!-- BAGIAN 3: TABEL MUTASI UANG MASUK & KELUAR LENGKAP -->
    <div class="section-head">
      <h2>3. Rincian Mutasi Uang Masuk & Keluar (${
        report.mutationRows.length
      } Transaksi)</h2>
      <span>Urutan kronologis lengkap dengan kolom Kredit (Masuk), Debit (Keluar), dan Akumulasi Kas</span>
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="text-align:center;width:36px;">No</th>
          <th style="width:88px;">Tanggal</th>
          <th style="width:108px;">Kode Mutasi</th>
          <th>Uraian / Catatan Transaksi</th>
          <th>Kategori</th>
          <th>Kantong / Dompet</th>
          <th>Dicatat Oleh</th>
          <th style="text-align:right;">Uang Masuk (Kredit)</th>
          <th style="text-align:right;">Uang Keluar (Debit)</th>
          <th style="text-align:right;">Akumulasi Kas</th>
        </tr>
      </thead>
      <tbody>${mutationRowsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="7" style="text-align:right;">TOTAL MUTASI PERIODE (${
            report.startDate
          } s/d ${report.endDate})</td>
          <td style="text-align:right;font-family:monospace;color:#0D6E52;">+${formatIDR(
            report.totalIncome
          )}</td>
          <td style="text-align:right;font-family:monospace;color:#C83E37;">-${formatIDR(
            report.totalExpense
          )}</td>
          <td style="text-align:right;font-family:monospace;color:${
            report.netCashflow >= 0 ? "#0D6E52" : "#C83E37"
          };">${formatIDR(report.netCashflow)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="footer-sign">
      <div>Dokumen dihasilkan otomatis oleh sistem <strong>SakuRuang</strong> · Akun: ${escapeHtml(
        report.accountName
      )}</div>
      <div>No. Ref: ${escapeHtml(report.reportId)} · Dicetak: ${escapeHtml(
    report.generatedTimestamp
  )}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates a formatted Microsoft Excel (.xls) workbook with visual bars,
 * styled headers, account metadata, timestamp, executive analysis, and credit/debit mutation table.
 */
export function generateReportExcelContent(
  report: FinancialReportPayload
): string {
  const mutationRows =
    report.mutationRows.length === 0
      ? `<tr><td colspan="10" style="border:1px solid #D0D5DD;padding:12px;text-align:center;">Tidak ada mutasi pada periode ini</td></tr>`
      : report.mutationRows
          .map(
            (row) => `<tr>
              <td style="border:1px solid #D0D5DD;padding:6px;text-align:center;">${
                row.rowNumber
              }</td>
              <td style="border:1px solid #D0D5DD;padding:6px;">${row.date}</td>
              <td style="border:1px solid #D0D5DD;padding:6px;font-family:Consolas,monospace;">${
                row.txCode
              }</td>
              <td style="border:1px solid #D0D5DD;padding:6px;font-weight:bold;">${escapeHtml(
                row.description
              )}</td>
              <td style="border:1px solid #D0D5DD;padding:6px;">${escapeHtml(
                row.categoryName
              )}</td>
              <td style="border:1px solid #D0D5DD;padding:6px;">${escapeHtml(
                row.walletInfo
              )}</td>
              <td style="border:1px solid #D0D5DD;padding:6px;">${escapeHtml(
                row.recordedBy
              )}</td>
              <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;color:#0D6E52;font-weight:bold;mso-number-format:'\\#\\,\\#\\#0';">${
                row.creditIncome
              }</td>
              <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;color:#C83E37;font-weight:bold;mso-number-format:'\\#\\,\\#\\#0';">${
                row.debitExpense
              }</td>
              <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;font-weight:bold;mso-number-format:'\\#\\,\\#\\#0';">${
                row.runningNet
              }</td>
            </tr>`
          )
          .join("");

  const maxMacro = Math.max(1, report.totalIncome, report.totalExpense);
  const incBar = buildTextProgressBar(
    Math.round((report.totalIncome / maxMacro) * 100),
    18
  );
  const expBar = buildTextProgressBar(
    Math.round((report.totalExpense / maxMacro) * 100),
    18
  );

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Laporan SakuRuang</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
</head>
<body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#141916;">
  <table style="border-collapse:collapse;width:100%;">
    <tr>
      <td colspan="10" style="background:#0A4D3C;color:#FFFFFF;font-size:15pt;font-weight:bold;padding:12px;">
        SAKURUANG - LAPORAN ANALISIS &amp; MUTASI KEUANGAN LENGKAP
      </td>
    </tr>
    <tr>
      <td colspan="2" style="background:#EFEFE9;font-weight:bold;padding:6px;border:1px solid #D0D5DD;">Nama Akun</td>
      <td colspan="3" style="padding:6px;border:1px solid #D0D5DD;font-weight:bold;">${escapeHtml(
        report.accountName
      )} (${escapeHtml(report.accountEmail)})</td>
      <td colspan="2" style="background:#EFEFE9;font-weight:bold;padding:6px;border:1px solid #D0D5DD;">No. Referensi</td>
      <td colspan="3" style="padding:6px;border:1px solid #D0D5DD;font-family:Consolas,monospace;">${escapeHtml(
        report.reportId
      )}</td>
    </tr>
    <tr>
      <td colspan="2" style="background:#EFEFE9;font-weight:bold;padding:6px;border:1px solid #D0D5DD;">Ruang Keuangan</td>
      <td colspan="3" style="padding:6px;border:1px solid #D0D5DD;">${escapeHtml(
        report.spaceName
      )} (${escapeHtml(report.spaceTypeLabel)})</td>
      <td colspan="2" style="background:#EFEFE9;font-weight:bold;padding:6px;border:1px solid #D0D5DD;">Dicetak Pada</td>
      <td colspan="3" style="padding:6px;border:1px solid #D0D5DD;font-weight:bold;">${escapeHtml(
        report.generatedTimestamp
      )}</td>
    </tr>
    <tr>
      <td colspan="2" style="background:#EFEFE9;font-weight:bold;padding:6px;border:1px solid #D0D5DD;">Periode Laporan</td>
      <td colspan="3" style="padding:6px;border:1px solid #D0D5DD;">${escapeHtml(
        report.periodLabel
      )}</td>
      <td colspan="2" style="background:#EFEFE9;font-weight:bold;padding:6px;border:1px solid #D0D5DD;">Rentang Tanggal</td>
      <td colspan="3" style="padding:6px;border:1px solid #D0D5DD;">${
        report.startDate
      } s/d ${report.endDate} (${report.totalDays} Hari)</td>
    </tr>
    <tr><td colspan="10"></td></tr>

    <!-- BAGIAN 1: RINGKASAN VISUAL & ANALISIS EKSEKUTIF -->
    <tr>
      <td colspan="10" style="background:#0D6E52;color:#FFFFFF;font-weight:bold;padding:8px;">
        1. VISUALISASI ARUS KAS &amp; ANALISIS EKSEKUTIF
      </td>
    </tr>
    <tr style="background:#EFEFE9;font-weight:bold;">
      <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;">Komponen Arus Kas</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;text-align:right;">Nominal (Rp)</td>
      <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;">Visualisasi Proporsi</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;">Keterangan Analisis</td>
    </tr>
    <tr>
      <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;font-weight:bold;color:#0D6E52;">Total Uang Masuk (Kredit)</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;text-align:right;font-weight:bold;color:#0D6E52;mso-number-format:'\\#\\,\\#\\#0';">${
        report.totalIncome
      }</td>
      <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;font-family:Consolas,monospace;color:#0D6E52;">${incBar}</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;">Rasio Tabungan: <strong>${
        report.savingsRate
      }%</strong></td>
    </tr>
    <tr>
      <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;font-weight:bold;color:#C83E37;">Total Uang Keluar (Debit)</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;text-align:right;font-weight:bold;color:#C83E37;mso-number-format:'\\#\\,\\#\\#0';">${
        report.totalExpense
      }</td>
      <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;font-family:Consolas,monospace;color:#C83E37;">${expBar}</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;">Rata-rata: <strong>${formatIDR(
        report.avgDailyExpense
      )}/hari</strong></td>
    </tr>
    <tr>
      <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;font-weight:bold;">Arus Kas Bersih (Net Cashflow)</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;text-align:right;font-weight:bold;mso-number-format:'\\#\\,\\#\\#0';">${
        report.netCashflow
      }</td>
      <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;font-weight:bold;color:#0D6E52;">Status: ${escapeHtml(
        report.healthStatus.label
      )}</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;">Mutasi Transfer: ${formatIDR(
        report.totalTransfer
      )}</td>
    </tr>
    ${report.insights
      .map(
        (ins, i) => `<tr>
          <td colspan="2" style="border:1px solid #D0D5DD;padding:5px;background:#F6F7F4;font-weight:bold;">Catatan Analisis #${
            i + 1
          }</td>
          <td colspan="8" style="border:1px solid #D0D5DD;padding:5px;">${escapeHtml(
            ins
          )}</td>
        </tr>`
      )
      .join("")}
    <tr><td colspan="10"></td></tr>

    <!-- BAGIAN 2: DIAGRAM & RINCIAN KATEGORI -->
    <tr>
      <td colspan="10" style="background:#0D6E52;color:#FFFFFF;font-weight:bold;padding:8px;">
        2. DIAGRAM PROPORSI &amp; RINCIAN KATEGORI
      </td>
    </tr>
    <tr style="background:#EFEFE9;font-weight:bold;">
      <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;">Nama Kategori</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;">Jenis Arus</td>
      <td style="border:1px solid #D0D5DD;padding:6px;text-align:center;">Frekuensi</td>
      <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;">Rata-Rata (Rp)</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;">Visual Proporsi</td>
      <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;">Total Nominal (Rp)</td>
    </tr>
    ${
      report.categoryBreakdown.length === 0
        ? `<tr><td colspan="10" style="border:1px solid #D0D5DD;padding:8px;text-align:center;">Belum ada data kategori</td></tr>`
        : report.categoryBreakdown
            .map(
              (cat) => `<tr>
                <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;font-weight:bold;">${escapeHtml(
                  cat.categoryName
                )}</td>
                <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;">${
                  cat.type === "income" ? "Uang Masuk" : "Uang Keluar"
                }</td>
                <td style="border:1px solid #D0D5DD;padding:6px;text-align:center;">${
                  cat.transactionCount
                }</td>
                <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;mso-number-format:'\\#\\,\\#\\#0';">${
                  cat.averageAmount
                }</td>
                <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;font-family:Consolas,monospace;color:#0D6E52;">${buildTextProgressBar(
                  cat.percentage,
                  14
                )} ${cat.percentage}%</td>
                <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;font-weight:bold;mso-number-format:'\\#\\,\\#\\#0';">${
                  cat.totalAmount
                }</td>
              </tr>`
            )
            .join("")
    }
    <tr><td colspan="10"></td></tr>

    <!-- BAGIAN 3: POSISI KANTONG / DOMPET -->
    <tr>
      <td colspan="10" style="background:#0D6E52;color:#FFFFFF;font-weight:bold;padding:8px;">
        3. POSISI SALDO &amp; MUTASI PER KANTONG / DOMPET
      </td>
    </tr>
    <tr style="background:#EFEFE9;font-weight:bold;">
      <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;">Nama Kantong / Dompet</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;text-align:right;">Estimasi Saldo Awal (Rp)</td>
      <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;">Mutasi Masuk (Rp)</td>
      <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;">Mutasi Keluar (Rp)</td>
      <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;">Porsi Dana Aktif</td>
      <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;">Saldo Akhir Aktual (Rp)</td>
    </tr>
    ${report.walletBreakdown
      .map(
        (w) => `<tr>
          <td colspan="3" style="border:1px solid #D0D5DD;padding:6px;font-weight:bold;">${escapeHtml(
            w.walletName
          )}</td>
          <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;text-align:right;mso-number-format:'\\#\\,\\#\\#0';">${
            w.estimatedOpeningBalance
          }</td>
          <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;color:#0D6E52;mso-number-format:'\\#\\,\\#\\#0';">${
            w.periodInflow
          }</td>
          <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;color:#C83E37;mso-number-format:'\\#\\,\\#\\#0';">${
            w.periodOutflow
          }</td>
          <td colspan="2" style="border:1px solid #D0D5DD;padding:6px;font-family:Consolas,monospace;color:#0D6E52;">${buildTextProgressBar(
            w.sharePercentage,
            14
          )} ${w.sharePercentage}%</td>
          <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;font-weight:bold;mso-number-format:'\\#\\,\\#\\#0';">${
            w.currentBalance
          }</td>
        </tr>`
      )
      .join("")}
    <tr><td colspan="10"></td></tr>

    <!-- BAGIAN 4: TABEL MUTASI UANG MASUK & KELUAR -->
    <tr>
      <td colspan="10" style="background:#0A4D3C;color:#FFFFFF;font-weight:bold;padding:8px;">
        4. TABEL MUTASI UANG MASUK &amp; KELUAR LENGKAP (${
          report.mutationRows.length
        } TRANSAKSI)
      </td>
    </tr>
    <tr style="background:#EFEFE9;font-weight:bold;">
      <td style="border:1px solid #D0D5DD;padding:6px;text-align:center;">No</td>
      <td style="border:1px solid #D0D5DD;padding:6px;">Tanggal</td>
      <td style="border:1px solid #D0D5DD;padding:6px;">Kode Mutasi</td>
      <td style="border:1px solid #D0D5DD;padding:6px;">Uraian / Catatan Transaksi</td>
      <td style="border:1px solid #D0D5DD;padding:6px;">Kategori</td>
      <td style="border:1px solid #D0D5DD;padding:6px;">Kantong / Dompet</td>
      <td style="border:1px solid #D0D5DD;padding:6px;">Dicatat Oleh</td>
      <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;">Uang Masuk / Kredit (Rp)</td>
      <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;">Uang Keluar / Debit (Rp)</td>
      <td style="border:1px solid #D0D5DD;padding:6px;text-align:right;">Akumulasi Kas (Rp)</td>
    </tr>
    ${mutationRows}
    <tr style="background:#E6F4EF;font-weight:bold;">
      <td colspan="7" style="border:1px solid #0D6E52;padding:8px;text-align:right;">TOTAL MUTASI PERIODE (${
        report.startDate
      } s/d ${report.endDate})</td>
      <td style="border:1px solid #0D6E52;padding:8px;text-align:right;color:#0D6E52;mso-number-format:'\\#\\,\\#\\#0';">${
        report.totalIncome
      }</td>
      <td style="border:1px solid #0D6E52;padding:8px;text-align:right;color:#C83E37;mso-number-format:'\\#\\,\\#\\#0';">${
        report.totalExpense
      }</td>
      <td style="border:1px solid #0D6E52;padding:8px;text-align:right;mso-number-format:'\\#\\,\\#\\#0';">${
        report.netCashflow
      }</td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateReportCsvContent(
  report: FinancialReportPayload
): string {
  const lines: string[] = [];

  lines.push(
    [
      "SAKURUANG - LAPORAN ANALISIS & MUTASI KEUANGAN",
      `${report.spaceName} (${report.spaceTypeLabel})`,
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  lines.push(
    ["No. Referensi Laporan", report.reportId].map(escapeCsvCell).join(",")
  );
  lines.push(
    [
      "Nama Akun",
      `${report.accountName} (${report.accountEmail})`,
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  lines.push(
    ["Dicetak Pada (Timestamp)", report.generatedTimestamp]
      .map(escapeCsvCell)
      .join(",")
  );
  lines.push(
    ["Periode Laporan", report.periodLabel].map(escapeCsvCell).join(",")
  );
  lines.push(
    [
      "Rentang Tanggal",
      `${report.startDate} s/d ${report.endDate} (${report.totalDays} Hari)`,
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  lines.push("");

  lines.push("1. RINGKASAN ARUS KAS & ANALISIS EKSEKUTIF");
  lines.push(
    ["Indikator", "Nominal (Rp)", "Format Rupiah", "Visualisasi / Keterangan"].join(
      ","
    )
  );
  lines.push(
    [
      "Total Uang Masuk (Kredit)",
      report.totalIncome,
      formatIDR(report.totalIncome),
      `Rasio Tabungan: ${report.savingsRate}%`,
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  lines.push(
    [
      "Total Uang Keluar (Debit)",
      report.totalExpense,
      formatIDR(report.totalExpense),
      `Rata-rata Harian: ${formatIDR(report.avgDailyExpense)}/hari`,
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  lines.push(
    [
      "Arus Kas Bersih (Net)",
      report.netCashflow,
      formatIDR(report.netCashflow),
      `Status: ${report.healthStatus.label}`,
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  for (let i = 0; i < report.insights.length; i++) {
    lines.push(
      [`Analisis #${i + 1}`, "", "", report.insights[i]]
        .map(escapeCsvCell)
        .join(",")
    );
  }
  lines.push("");

  lines.push("2. DIAGRAM PROPORSI & RINCIAN PER KATEGORI");
  lines.push(
    [
      "Nama Kategori",
      "Jenis Arus",
      "Frekuensi",
      "Rata-Rata per Transaksi (Rp)",
      "Total Nominal (Rp)",
      "Porsi (%)",
      "Visual Proporsi",
    ].join(",")
  );
  for (const cat of report.categoryBreakdown) {
    lines.push(
      [
        cat.categoryName,
        cat.type === "expense" ? "Uang Keluar" : "Uang Masuk",
        cat.transactionCount,
        cat.averageAmount,
        cat.totalAmount,
        `${cat.percentage}%`,
        `${buildTextProgressBar(cat.percentage, 12)} ${cat.percentage}%`,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }
  lines.push("");

  lines.push("3. POSISI SALDO & MUTASI PER KANTONG");
  lines.push(
    [
      "Nama Kantong",
      "Estimasi Saldo Awal (Rp)",
      "Mutasi Masuk (Rp)",
      "Mutasi Keluar (Rp)",
      "Saldo Akhir Aktual (Rp)",
      "Porsi Dana (%)",
    ].join(",")
  );
  for (const w of report.walletBreakdown) {
    lines.push(
      [
        w.walletName,
        w.estimatedOpeningBalance,
        w.periodInflow,
        w.periodOutflow,
        w.currentBalance,
        `${w.sharePercentage}%`,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }
  lines.push("");

  lines.push("4. TABEL MUTASI UANG MASUK & KELUAR LENGKAP");
  lines.push(
    [
      "No",
      "Tanggal",
      "Kode Mutasi",
      "Uraian / Catatan Transaksi",
      "Kategori",
      "Kantong / Dompet",
      "Dicatat Oleh",
      "Uang Masuk / Kredit (Rp)",
      "Uang Keluar / Debit (Rp)",
      "Mutasi Transfer (Rp)",
      "Akumulasi Kas (Rp)",
    ].join(",")
  );

  for (const row of report.mutationRows) {
    lines.push(
      [
        row.rowNumber,
        row.date,
        row.txCode,
        row.description,
        row.categoryName,
        row.walletInfo,
        row.recordedBy,
        row.creditIncome,
        row.debitExpense,
        row.transferAmount,
        row.runningNet,
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }

  lines.push(
    [
      "",
      "",
      "",
      "TOTAL MUTASI PERIODE",
      "",
      "",
      "",
      report.totalIncome,
      report.totalExpense,
      report.totalTransfer,
      report.netCashflow,
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  return `\uFEFF${lines.join("\r\n")}`;
}

export function triggerBrowserFileDownload(params: {
  filename: string;
  content: string;
  mimeType: string;
}): void {
  const blob = new Blob([params.content], { type: params.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = params.filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function triggerPrintHtmlReport(report: FinancialReportPayload): void {
  const html = generateReportHtmlDocument(report);
  const win = window.open("", "_blank", "width=1100,height=820");
  if (!win) {
    triggerBrowserFileDownload({
      filename: `Laporan-PDF-SakuRuang-${report.startDate}-sd-${report.endDate}.html`,
      content: html,
      mimeType: "text/html;charset=utf-8",
    });
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 280);
}
