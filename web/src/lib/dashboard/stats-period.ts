export type StatsPeriod = "today" | "week" | "month" | "year";

export function parseStatsPeriod(raw: string | undefined): StatsPeriod {
  if (raw === "today" || raw === "week" || raw === "month" || raw === "year") {
    return raw;
  }
  return "month";
}

/** Inclusive start (local midnight) and end (now) for invoice `created_at` filters. */
export function getStatsPeriodRange(period: StatsPeriod, now: Date): { start: Date; end: Date } {
  const end = new Date(now);
  let start: Date;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week": {
      const d = new Date(now);
      const day = d.getDay();
      const fromMonday = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + fromMonday);
      d.setHours(0, 0, 0, 0);
      start = d;
      break;
    }
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case "month":
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}
