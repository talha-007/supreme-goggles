import { AnalyticsPeriodTabs } from "@/components/dashboard/analytics-period-tabs";
import { SalesAnalyticsCharts } from "@/components/dashboard/sales-analytics-charts";
import { getSalesSnapshot } from "@/lib/analytics/sales-snapshot";
import { requireBusinessContext, guardOwnerPage } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { getStatsPeriodRange, parseStatsPeriod } from "@/lib/dashboard/stats-period";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const statsPeriod = parseStatsPeriod(sp.period);
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  const supabase = await createClient();
  const bid = ctx.businessId;
  const locale = await getLocale();
  const intlTag = intlLocaleTag(locale);
  const t = await getTranslations("analytics");

  const { data: businessRow } = await supabase
    .from("businesses")
    .select("type")
    .eq("id", bid)
    .maybeSingle();
  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", null);
  if (caps.type === "restaurant" && ctx.restaurantStaffRole) {
    if (ctx.restaurantStaffRole === "waiter") redirect("/dashboard/restaurant/waiter-board");
    if (ctx.restaurantStaffRole === "chef") redirect("/dashboard/restaurant/kitchen");
    if (ctx.restaurantStaffRole === "counter") redirect("/dashboard/restaurant/counter");
  }

  const now = new Date();
  const { start: periodStart, end: periodEnd } = getStatsPeriodRange(statsPeriod, now);

  let snapshot;
  try {
    snapshot = await getSalesSnapshot(bid, periodStart, periodEnd, intlTag);
  } catch (e) {
    throw e;
  }

  const pkr = new Intl.NumberFormat(intlTag, {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const formatMoney = (n: number) => pkr.format(n);

  return (
    <div className="pb-10">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("description")}</p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-emerald-700 underline dark:text-emerald-400"
        >
          {t("backToDashboard")}
        </Link>
      </div>

      <AnalyticsPeriodTabs current={statsPeriod} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("totalSales")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(snapshot.totalRevenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("orders")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {String(snapshot.orderCount)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("avgOrder")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {formatMoney(snapshot.averageOrder)}
          </p>
        </div>
      </div>

      <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">{t("excludingDrafts")}</p>

      <SalesAnalyticsCharts
        snapshot={snapshot}
        intlLocale={intlTag}
        labels={{
          dailyTitle: t("dailySales"),
          dailySubtitle: t("dailySalesHint"),
          topProductsTitle: t("topProducts"),
          topProductsSubtitle: t("topProductsHint"),
          revenue: t("revenue"),
          qty: t("qty"),
          otherSlice: t("otherSlice"),
        }}
      />
    </div>
  );
}
