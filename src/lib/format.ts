import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatIDR(amount: number): string {
  return idrFormatter.format(Math.round(amount));
}

export function formatNumberID(amount: number): string {
  return numberFormatter.format(Math.round(amount));
}

export function formatCompactIDR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${Math.round(abs / 1_000)} rb`;
  }
  return formatIDR(amount);
}

const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const INDONESIAN_SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function formatDateID(isoDate: string): string {
  const parts = isoDate.slice(0, 10).split("-");
  if (parts.length !== 3) return isoDate;
  const year = Number(parts[0]);
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const monthName = INDONESIAN_SHORT_MONTHS[monthIdx] ?? parts[1];
  return `${day} ${monthName} ${year}`;
}

export function formatRelativeDateHeading(isoDate: string): string {
  const today = getTodayISO();
  if (isoDate.slice(0, 10) === today) {
    return `Hari Ini · ${formatDateID(isoDate)}`;
  }
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayISO = yesterdayDate.toISOString().slice(0, 10);
  if (isoDate.slice(0, 10) === yesterdayISO) {
    return `Kemarin · ${formatDateID(isoDate)}`;
  }
  return formatDateID(isoDate);
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const idx = Number(month) - 1;
  if (idx < 0 || idx > 11) return monthKey;
  return `${INDONESIAN_MONTHS[idx]} ${year}`;
}

export function formatShortMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const idx = Number(month) - 1;
  if (idx < 0 || idx > 11) return monthKey;
  return `${INDONESIAN_SHORT_MONTHS[idx]} '${year.slice(2)}`;
}

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthKey(): string {
  return getTodayISO().slice(0, 7);
}

export function getDaysRemainingInMonth(monthKey: string): number {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return 1;

  const totalDays = new Date(year, month, 0).getDate();
  const currentMonth = getCurrentMonthKey();

  if (monthKey === currentMonth) {
    const today = new Date().getDate();
    return Math.max(1, totalDays - today + 1);
  }
  return totalDays;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "SR";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
