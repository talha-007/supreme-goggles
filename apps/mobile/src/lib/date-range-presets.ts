/** Invoices list: optional created_at window. Home stats: sales in window (no `all`). */
export type DateRangePreset = "all" | "today" | "week" | "month" | "30d";

export type StatsDatePreset = Exclude<DateRangePreset, "all">;

export const INVOICE_DATE_FILTER_OPTIONS: { key: DateRangePreset; label: string }[] = [
  { key: "all", label: "All dates" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "30d", label: "30 days" },
];

export const STATS_PERIOD_OPTIONS: { key: StatsDatePreset; label: string; short: string }[] = [
  { key: "today", label: "Today", short: "Today" },
  { key: "week", label: "This week", short: "Week" },
  { key: "month", label: "This month", short: "Month" },
  { key: "30d", label: "Last 30 days", short: "30d" },
];

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Monday as first day of week (local). */
export function startOfLocalWeek(d: Date): Date {
  const x = startOfLocalDay(d);
  const dow = x.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + offset);
  return x;
}

export function getRangeStartForPreset(now: Date, preset: DateRangePreset): Date | null {
  if (preset === "all") return null;
  if (preset === "today") return startOfLocalDay(now);
  if (preset === "week") return startOfLocalWeek(now);
  if (preset === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (preset === "30d") {
    const t = startOfLocalDay(now);
    t.setDate(t.getDate() - 29);
    return t;
  }
  return null;
}

export function isInvoiceCreatedInPreset(createdAtIso: string, preset: DateRangePreset, now = new Date()): boolean {
  const start = getRangeStartForPreset(now, preset);
  if (start === null) return true;
  const t = new Date(createdAtIso).getTime();
  if (Number.isNaN(t)) return true;
  return t >= start.getTime();
}
