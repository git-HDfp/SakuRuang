"use client";

import { useMemo, useState } from "react";
import {
  CalendarBlank,
  ChartPieSlice,
  CheckCircle,
  Clock,
  DownloadSimple,
  FileCsv,
  FileXls,
  Printer,
  UserCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { ModalSheet } from "@/components/ui/modal-sheet";
import { formatIDR, getCurrentMonthKey } from "@/lib/format";
import { reportFilterSchema } from "@/lib/validators";
import {
  buildFinancialReportPayload,
  generateReportCsvContent,
  generateReportExcelContent,
  triggerBrowserFileDownload,
  triggerPrintHtmlReport,
} from "@/lib/reports/exporter";
import type {
  ReportPeriodMode,
  TransactionWithRelations,
  Wallet,
} from "@/lib/types/database";

export function ReportDownloadModal({
  open,
  onClose,
  accountName,
  accountEmail,
  spaceName,
  spaceType,
  transactions,
  wallets,
  defaultMonth,
}: {
  open: boolean;
  onClose: () => void;
  accountName?: string;
  accountEmail?: string;
  spaceName: string;
  spaceType: "personal" | "family";
  transactions: TransactionWithRelations[];
  wallets: Pick<Wallet, "id" | "name" | "balance">[];
  defaultMonth?: string;
}) {
  const latestTxDate = useMemo(() => {
    if (transactions.length === 0) {
      return new Date().toISOString().slice(0, 10);
    }
    return transactions
      .map((t) => t.occurred_at.slice(0, 10))
      .sort((a, b) => b.localeCompare(a))[0];
  }, [transactions]);

  const earliestTxDate = useMemo(() => {
    if (transactions.length === 0) {
      return new Date().toISOString().slice(0, 10);
    }
    return transactions
      .map((t) => t.occurred_at.slice(0, 10))
      .sort((a, b) => a.localeCompare(b))[0];
  }, [transactions]);

  const [mode, setMode] = useState<ReportPeriodMode>("monthly");
  const [weekAnchorDate, setWeekAnchorDate] = useState<string>(latestTxDate);
  const [month, setMonth] = useState<string>(
    defaultMonth || latestTxDate.slice(0, 7) || getCurrentMonthKey()
  );
  const [startDate, setStartDate] = useState<string>(earliestTxDate);
  const [endDate, setEndDate] = useState<string>(latestTxDate);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadedNotice, setDownloadedNotice] = useState<string | null>(null);

  const reportPayload = useMemo(() => {
    return buildFinancialReportPayload({
      accountName,
      accountEmail,
      spaceName,
      spaceType,
      filter: {
        mode,
        weekAnchorDate,
        month,
        startDate,
        endDate,
      },
      transactions,
      wallets,
    });
  }, [
    accountName,
    accountEmail,
    spaceName,
    spaceType,
    mode,
    weekAnchorDate,
    month,
    startDate,
    endDate,
    transactions,
    wallets,
  ]);

  const maxFlow = Math.max(
    1,
    reportPayload.totalIncome,
    reportPayload.totalExpense
  );
  const incomeWidthPct = Math.round(
    (reportPayload.totalIncome / maxFlow) * 100
  );
  const expenseWidthPct = Math.round(
    (reportPayload.totalExpense / maxFlow) * 100
  );

  function validateBeforeExport(): boolean {
    setErrorMessage(null);
    const parsed = reportFilterSchema.safeParse({
      mode,
      weekAnchorDate,
      month,
      startDate,
      endDate,
    });
    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Rentang tanggal laporan tidak valid"
      );
      return false;
    }
    return true;
  }

  function handleDownloadExcel() {
    if (!validateBeforeExport()) return;
    const xls = generateReportExcelContent(reportPayload);
    const slug = spaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `Laporan-SakuRuang-${slug}-${reportPayload.startDate}-sd-${reportPayload.endDate}.xls`;
    triggerBrowserFileDownload({
      filename,
      content: xls,
      mimeType: "application/vnd.ms-excel;charset=utf-8",
    });
    setDownloadedNotice(
      `Laporan Excel berformat rapi berhasil diunduh (${filename})`
    );
  }

  function handlePrintPdf() {
    if (!validateBeforeExport()) return;
    triggerPrintHtmlReport(reportPayload);
    setDownloadedNotice(
      "Membuka laporan lengkap dengan visualisasi diagram SVG & tabel mutasi siap cetak PDF..."
    );
  }

  function handleDownloadCsv() {
    if (!validateBeforeExport()) return;
    const csv = generateReportCsvContent(reportPayload);
    const slug = spaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `Mutasi-SakuRuang-${slug}-${reportPayload.startDate}-sd-${reportPayload.endDate}.csv`;
    triggerBrowserFileDownload({
      filename,
      content: csv,
      mimeType: "text/csv;charset=utf-8",
    });
    setDownloadedNotice(`File CSV berhasil diunduh (${filename})`);
  }

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={`Laporan Analisis & Mutasi · ${spaceName}`}
      subtitle="Dilengkapi visualisasi diagram di bagian atas, analisis arus kas, identitas akun, timestamp cetak, dan tabel mutasi."
    >
      <div className="space-y-4">
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl bg-[#C83E37]/10 border border-[#C83E37]/25 px-3.5 py-2.5 text-xs text-[#C83E37] flex items-center gap-2"
          >
            <WarningCircle size={16} weight="fill" className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {downloadedNotice && (
          <div
            role="status"
            className="rounded-xl bg-[#E6F4EF] border border-[#0D6E52]/25 px-3.5 py-2.5 text-xs text-[#0D6E52] flex items-center gap-2"
          >
            <CheckCircle size={16} weight="fill" className="shrink-0" />
            <span>{downloadedNotice}</span>
          </div>
        )}

        {/* Period Mode Selector */}
        <div>
          <span className="text-xs font-semibold text-[#141916] block mb-2">
            1. Pilih Rentang Periode Laporan
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "weekly", label: "Mingguan (7 Hari)" },
                { id: "monthly", label: "Bulanan" },
                { id: "custom", label: "Rentang Tanggal" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setMode(opt.id);
                  setErrorMessage(null);
                  setDownloadedNotice(null);
                }}
                className={`min-h-[42px] rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  mode === opt.id
                    ? "bg-[#0D6E52] text-white shadow-xs"
                    : "bg-[#F6F7F4] text-[#5A655E] hover:text-[#141916] ring-1 ring-[#141916]/[0.08]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date Input Controls by Mode */}
        {mode === "weekly" && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="report-week-end"
              className="text-xs font-medium text-[#141916]"
            >
              Tanggal Akhir Minggu (7 Hari ke Belakang)
            </label>
            <input
              id="report-week-end"
              type="date"
              value={weekAnchorDate}
              onChange={(e) => setWeekAnchorDate(e.target.value)}
              className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-xs font-mono text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            />
          </div>
        )}

        {mode === "monthly" && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="report-month-picker"
              className="text-xs font-medium text-[#141916]"
            >
              Pilih Bulan Laporan
            </label>
            <input
              id="report-month-picker"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-xs font-mono text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
            />
          </div>
        )}

        {mode === "custom" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="report-start-date"
                className="text-xs font-medium text-[#141916]"
              >
                Dari Tanggal
              </label>
              <input
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-xs font-mono text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="report-end-date"
                className="text-xs font-medium text-[#141916]"
              >
                Sampai Tanggal
              </label>
              <input
                id="report-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="min-h-[42px] w-full rounded-xl bg-[#F6F7F4] px-3.5 py-2 text-xs font-mono text-[#141916] ring-1 ring-[#141916]/12 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D6E52]"
              />
            </div>
          </div>
        )}

        {/* Executive Masthead & Visual Diagram Preview */}
        <div className="rounded-2xl bg-[#F6F7F4] p-4 ring-1 ring-[#141916]/[0.08] space-y-3.5">
          {/* Account & Timestamp Header */}
          <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-[#141916]/[0.08] text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-semibold text-[#141916]">
                <UserCircle
                  size={15}
                  weight="duotone"
                  className="text-[#0D6E52]"
                />
                <span>
                  Akun: {reportPayload.accountName} ({reportPayload.accountEmail})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#5A655E]">
                <CalendarBlank size={13} />
                <span>
                  {reportPayload.periodLabel} · {reportPayload.totalDays} Hari
                </span>
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <span className="font-mono text-[11px] font-semibold text-[#0D6E52] block">
                Ref: {reportPayload.reportId}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[#5A655E]">
                <Clock size={12} />
                {reportPayload.generatedTimestamp}
              </span>
            </div>
          </div>

          {/* Visual Bar Comparison (Masuk vs Keluar) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#141916] flex items-center gap-1.5">
                <ChartPieSlice
                  size={15}
                  weight="duotone"
                  className="text-[#0D6E52]"
                />
                Visualisasi Arus Kas & Analisis
              </span>
              <span className="rounded-full bg-[#E6F4EF] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#0D6E52] tabular-nums">
                {reportPayload.healthStatus.label} · Tabungan{" "}
                {reportPayload.savingsRate}%
              </span>
            </div>

            <div className="rounded-xl bg-white p-3 ring-1 ring-[#141916]/[0.06] space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#5A655E]">
                    Uang Masuk (Kredit)
                  </span>
                  <span className="font-mono font-bold text-[#0D6E52] tabular-nums">
                    +{formatIDR(reportPayload.totalIncome)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#EFEFE9] overflow-hidden">
                  <div
                    style={{ width: `${incomeWidthPct}%` }}
                    className="h-full rounded-full bg-[#0D6E52]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#5A655E]">
                    Uang Keluar (Debit) · Rata-rata{" "}
                    <span className="font-mono tabular-nums">
                      {formatIDR(reportPayload.avgDailyExpense)}/hr
                    </span>
                  </span>
                  <span className="font-mono font-bold text-[#C83E37] tabular-nums">
                    -{formatIDR(reportPayload.totalExpense)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#EFEFE9] overflow-hidden">
                  <div
                    style={{ width: `${expenseWidthPct}%` }}
                    className="h-full rounded-full bg-[#C83E37]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#141916]/[0.06] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#141916]">
                  Selisih Arus Kas Bersih ({reportPayload.transactionCount}{" "}
                  mutasi)
                </span>
                <span className="font-mono font-bold text-[#141916] tabular-nums">
                  {formatIDR(reportPayload.netCashflow)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Export Format Buttons */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#141916] block">
            2. Unduh Laporan Berformat Rapi (Diagram + Analisis + Mutasi)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="min-h-[48px] rounded-2xl bg-[#0D6E52] hover:bg-[#095740] active:scale-[0.98] text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Printer size={18} weight="duotone" />
                <span>Cetak / Simpan PDF Visual</span>
              </span>
              <DownloadSimple size={16} weight="bold" />
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              className="min-h-[48px] rounded-2xl bg-[#0A4D3C] hover:bg-[#083B2E] active:scale-[0.98] text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileXls size={18} weight="duotone" />
                <span>Unduh Excel Rapi (.XLS)</span>
              </span>
              <DownloadSimple size={16} weight="bold" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="min-h-[42px] w-full rounded-xl bg-[#EFEFE9] hover:bg-[#E4E5DD] active:scale-[0.98] text-[#141916] px-3.5 py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <FileCsv size={17} weight="duotone" className="text-[#0D6E52]" />
            <span>Unduh File CSV Mentah (.CSV)</span>
          </button>
        </div>
      </div>
    </ModalSheet>
  );
}
