import { StatCard } from "@/components/dashboard/stat-card";
import { requireBusinessContext, canManageInvoices } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceRow, InvoiceStatus } from "@/types/invoice";
import Link from "next/link";

const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const statusStyle: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  unpaid: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  partial: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

function sumMoney(rows: { total_amount: unknown; paid_amount?: unknown }[], pred: (r: InvoiceRow) => boolean) {
  let s = 0;
  for (const r of rows) {
    const inv = r as InvoiceRow;
    if (pred(inv)) {
      s += Number(inv.total_amount);
    }
  }
  return Math.round(s * 100) / 100;
}

function outstandingPk(rows: { total_amount: unknown; paid_amount: unknown }[]) {
  let s = 0;
  for (const r of rows) {
    const inv = r as InvoiceRow;
    if (inv.status === "unpaid" || inv.status === "partial") {
      s += Number(inv.total_amount) - Number(inv.paid_amount);
    }
  }
  return Math.round(s * 100) / 100;
}

export default async function DashboardPage() {
  const ctx = await requireBusinessContext();
  const canEdit = canManageInvoices(ctx.role);
  const supabase = await createClient();
  const bid = ctx.businessId;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    productsCountRes,
    customersCountRes,
    draftsCountRes,
    receivableRows,
    monthRows,
    todayRows,
    recentRows,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("business_id", bid)
      .eq("is_active", true),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", bid)
      .eq("is_active", true),
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", bid)
      .eq("status", "draft"),
    supabase
      .from("invoices")
      .select("total_amount, paid_amount, status")
      .eq("business_id", bid)
      .in("status", ["unpaid", "partial"]),
    supabase
      .from("invoices")
      .select("total_amount, status, created_at")
      .eq("business_id", bid)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("invoices")
      .select("total_amount, status, created_at")
      .eq("business_id", bid)
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        created_at,
        status,
        total_amount,
        customers ( name )
      `,
      )
      .eq("business_id", bid)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const productsCount = productsCountRes.count ?? 0;
  const customersCount = customersCountRes.count ?? 0;
  const draftsCount = draftsCountRes.count ?? 0;

  const receivableData = receivableRows.data ?? [];
  const monthData = (monthRows.data ?? []) as InvoiceRow[];
  const todayData = (todayRows.data ?? []) as InvoiceRow[];

  const outstanding = outstandingPk(receivableData as { total_amount: unknown; paid_amount: unknown }[]);

  const monthSales = sumMoney(monthData as { total_amount: unknown }[], (inv) => inv.status !== "draft" && inv.status !== "cancelled");

  const todaySales = sumMoney(todayData as { total_amount: unknown }[], (inv) => inv.status !== "draft" && inv.status !== "cancelled");

  type RecentRow = {
    id: string;
    invoice_number: string;
    created_at: string;
    status: InvoiceStatus;
    total_amount: number;
    customers: { name: string } | { name: string }[] | null;
  };
  const rawRecent = (recentRows.data ?? []) as RecentRow[];
  const recent = rawRecent.map((r) => ({
    ...r,
    customers: Array.isArray(r.customers) ? r.customers[0] ?? null : r.customers,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Snapshot of your shop — sales, receivables, and shortcuts.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Link
              href="/dashboard/invoices/new"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              New invoice
            </Link>
            <Link
              href="/dashboard/invoices"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              All invoices
            </Link>
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today (sales)"
          value={pkr.format(todaySales)}
          hint="Finalized invoices created today"
        />
        <StatCard
          label="This month"
          value={pkr.format(monthSales)}
          hint="Excludes drafts & cancelled"
        />
        <StatCard label="Outstanding" value={pkr.format(outstanding)} hint="Unpaid + partial balance" />
        <StatCard label="Draft invoices" value={String(draftsCount)} hint="Not finalized yet" href="/dashboard/invoices" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard label="Products" value={String(productsCount)} hint="Active catalog items" href="/dashboard/products" />
        <StatCard label="Customers" value={String(customersCount)} hint="Active customers" href="/dashboard/customers" />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Recent invoices
          </h2>
          <Link
            href="/dashboard/invoices"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            View all
          </Link>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No invoices yet.
              {canEdit ? (
                <>
                  {" "}
                  <Link href="/dashboard/invoices/new" className="font-medium text-zinc-900 underline dark:text-zinc-100">
                    Create your first invoice
                  </Link>
                </>
              ) : null}
            </p>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {recent.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {inv.invoice_number}
                      </Link>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(inv.created_at).toLocaleDateString("en-PK", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {inv.customers?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[inv.status] ?? statusStyle.draft}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                      {pkr.format(Number(inv.total_amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
