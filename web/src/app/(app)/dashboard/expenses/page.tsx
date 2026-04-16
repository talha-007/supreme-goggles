import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { getStatsPeriodRange, parseStatsPeriod, type StatsPeriod } from "@/lib/dashboard/stats-period";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

type ExpenseRow = {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string | null;
  vendor_name: string | null;
};

const PERIODS: StatsPeriod[] = ["today", "week", "month", "year"];

const periodLabelKey = (p: StatsPeriod) =>
  p === "today" ? "periodToday" : p === "week" ? "periodWeek" : p === "month" ? "periodMonth" : "periodYear";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const statsPeriod = parseStatsPeriod(sp.period);
  const ctx = await requireBusinessContext();
  const canEdit = canManageProducts(ctx.role);

  const t = await getTranslations("expenses");
  const tc = await getTranslations("common");
  const tDashboard = await getTranslations("dashboard");
  const locale = await getLocale();
  const pkr = new Intl.NumberFormat(intlLocaleTag(locale), {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const now = new Date();
  const { start: periodStart, end: periodEnd } = getStatsPeriodRange(statsPeriod, now);
  const periodStartDate = periodStart.toISOString().slice(0, 10);
  const periodEndDate = periodEnd.toISOString().slice(0, 10);

  const supabase = await createClient();
  const [{ data: rows, error }, { data: salesRows, error: salesError }] = await Promise.all([
    supabase
      .from("business_expenses")
      .select("id, expense_date, category, description, amount, payment_method, vendor_name")
      .eq("business_id", ctx.businessId)
      .gte("expense_date", periodStartDate)
      .lte("expense_date", periodEndDate)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("invoices")
      .select("total_amount, status, created_at")
      .eq("business_id", ctx.businessId)
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString())
      .in("status", ["unpaid", "partial", "paid"]),
  ]);

  const expenses = (rows ?? []) as ExpenseRow[];
  const periodExpenseTotal = Math.round(expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0) * 100) / 100;
  const periodSalesTotal =
    Math.round(
      ((salesRows ?? []) as { total_amount: unknown }[]).reduce(
        (sum, row) => sum + Number(row.total_amount || 0),
        0,
      ) * 100,
    ) / 100;
  const periodNet = Math.round((periodSalesTotal - periodExpenseTotal) * 100) / 100;
  const margin = periodSalesTotal > 0 ? (periodNet / periodSalesTotal) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("subtitle")}</p>
        </div>
        {canEdit ? (
          <Link
            href="/dashboard/expenses/new"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {t("addExpense")}
          </Link>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {t("statsPeriodLabel")}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => {
            const active = statsPeriod === p;
            return (
              <Link
                key={p}
                href={`/dashboard/expenses?period=${p}`}
                scroll={false}
                className={
                  active
                    ? "rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                }
              >
                {tDashboard(periodLabelKey(p))}
              </Link>
            );
          })}
        </div>
      </div>

      {error || salesError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error?.message ?? salesError?.message}</p>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("statSales")}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{pkr.format(periodSalesTotal)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("statExpenses")}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{pkr.format(periodExpenseTotal)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t("statNet")}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{pkr.format(periodNet)}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t("statNetHint", { margin: margin.toFixed(1) })}</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {expenses.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("empty")}{" "}
            {canEdit ? (
              <Link href="/dashboard/expenses/new" className="font-medium text-zinc-900 underline dark:text-zinc-100">
                {t("addOne")}
              </Link>
            ) : null}
          </p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">{t("colDate")}</th>
                <th className="px-4 py-3">{t("colCategory")}</th>
                <th className="px-4 py-3">{t("colDescription")}</th>
                <th className="px-4 py-3">{t("colVendor")}</th>
                <th className="px-4 py-3">{t("colPayment")}</th>
                <th className="px-4 py-3 text-right">{tc("total")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {expenses.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{row.expense_date}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{row.category}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{row.description}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{row.vendor_name ?? tc("dash")}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{row.payment_method ?? tc("dash")}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {pkr.format(Number(row.amount || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
