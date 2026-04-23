import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { StatsPeriod } from "@/lib/dashboard/stats-period";

const PERIODS: StatsPeriod[] = ["today", "week", "month", "year"];

const periodLabelKey = (p: StatsPeriod) =>
  p === "today"
    ? "periodToday"
    : p === "week"
      ? "periodWeek"
      : p === "month"
        ? "periodMonth"
        : "periodYear";

export async function AnalyticsPeriodTabs({ current }: { current: StatsPeriod }) {
  const t = await getTranslations("dashboard");

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {t("statsPeriodLabel")}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => {
          const active = current === p;
          return (
            <Link
              key={p}
              href={`/dashboard/analytics?period=${p}`}
              scroll={false}
              className={
                active
                  ? "rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
              }
            >
              {t(periodLabelKey(p))}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
