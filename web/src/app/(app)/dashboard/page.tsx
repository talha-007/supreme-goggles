import { DashboardStatsPeriodTabs } from "@/components/dashboard/dashboard-stats-period-tabs";
import { LowStockPanel } from "@/components/dashboard/low-stock-panel";
import { OpenPosPanel } from "@/components/dashboard/open-pos-panel";
import { StatCard } from "@/components/dashboard/stat-card";
import { PosSaleClient } from "@/components/dashboard/pos-sale-client";
import { resolveInventoryCost } from "@/lib/dashboard/inventory-cost";
import { getStatsPeriodRange, parseStatsPeriod } from "@/lib/dashboard/stats-period";
import { getNewInvoiceEditorData, getPosCatalogProducts } from "@/lib/invoices/new-invoice-data";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import {
  requireBusinessContext,
  canManageInvoices,
  canManageProducts,
} from "@/lib/auth/business-context";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceRow, InvoiceStatus } from "@/types/invoice";
import type { ProductRow } from "@/types/product";
import type { PurchaseOrderStatus } from "@/types/purchase-order";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const statsPeriod = parseStatsPeriod(sp.period);
  const ctx = await requireBusinessContext();
  const canEdit = canManageInvoices(ctx.role);
  const canProducts = canManageProducts(ctx.role);
  const supabase = await createClient();
  const bid = ctx.businessId;
  const locale = await getLocale();
  const intlTag = intlLocaleTag(locale);
  const pkr = new Intl.NumberFormat(intlTag, {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const tInv = await getTranslations("invoiceStatus");
  const [{ data: businessRow }, { data: settingsRow }] = await Promise.all([
    supabase.from("businesses").select("type").eq("id", bid).maybeSingle(),
    supabase
      .from("business_settings")
      .select(
        "enable_table_service, enable_batch_expiry, enable_prescription_flow, enable_kot_printing, enable_quick_service_mode, default_tax_mode, rounding_rule",
      )
      .eq("business_id", bid)
      .maybeSingle(),
  ]);
  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  const isRestaurant = caps.type === "restaurant";
  if (isRestaurant && ctx.restaurantStaffRole) {
    if (ctx.restaurantStaffRole === "waiter") redirect("/dashboard/restaurant/waiter-board");
    if (ctx.restaurantStaffRole === "chef") redirect("/dashboard/restaurant/kitchen");
    if (ctx.restaurantStaffRole === "counter") redirect("/dashboard/restaurant/counter");
  }

  const now = new Date();
  const { start: periodStart, end: periodEnd } = getStatsPeriodRange(statsPeriod, now);

  const [
    productsCountRes,
    customersCountRes,
    draftsCountRes,
    receivableRows,
    periodRows,
    inventoryCostRes,
    recentRows,
    reorderCandidatesRes,
    openPoCountRes,
    openPoRowsRes,
    openRestaurantTablesRes,
    invoiceEditorData,
    posCatalogProducts,
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
      .gte("created_at", periodStart.toISOString())
      .lte("created_at", periodEnd.toISOString()),
    supabase.rpc("business_inventory_cost", { p_business_id: bid }),
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
    supabase
      .from("products")
      .select("id, name, current_stock, reorder_level, unit, sku, sale_price")
      .eq("business_id", bid)
      .eq("is_active", true)
      .gt("reorder_level", 0)
      .order("current_stock", { ascending: true })
      .limit(200),
    supabase
      .from("purchase_orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", bid)
      .in("status", ["draft", "ordered", "partial"]),
    supabase
      .from("purchase_orders")
      .select("id, po_number, status, total_amount, created_at")
      .eq("business_id", bid)
      .in("status", ["draft", "ordered", "partial"])
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("invoices")
      .select("id, invoice_number, restaurant_order_status, restaurant_tables ( name )")
      .eq("business_id", bid)
      .in("restaurant_order_status", ["new", "preparing"])
      .order("updated_at", { ascending: false })
      .limit(8),
    canEdit ? getNewInvoiceEditorData() : Promise.resolve(null),
    canEdit ? getPosCatalogProducts() : Promise.resolve([]),
  ]);

  const productsCount = productsCountRes.count ?? 0;
  const customersCount = customersCountRes.count ?? 0;
  const draftsCount = draftsCountRes.count ?? 0;

  const reorderCandidates = (reorderCandidatesRes.data ?? []) as Pick<
    ProductRow,
    "id" | "name" | "current_stock" | "reorder_level" | "unit" | "sku" | "sale_price"
  >[];
  const lowStockLines = reorderCandidates.filter(
    (p) => p.current_stock <= p.reorder_level,
  );
  const lowStockCount = lowStockLines.length;
  const lowStockPreview = lowStockLines.slice(0, 8);

  const openPoCount = openPoCountRes.count ?? 0;
  type OpenPoRow = {
    id: string;
    po_number: string;
    status: PurchaseOrderStatus;
    total_amount: number;
    created_at: string;
  };
  const openPosList = (openPoRowsRes.data ?? []) as OpenPoRow[];
  const openTables = (openRestaurantTablesRes.data ?? []) as Array<{
    id: string;
    invoice_number: string;
    restaurant_order_status: string;
    restaurant_tables: { name: string } | { name: string }[] | null;
  }>;

  const receivableData = receivableRows.data ?? [];
  const periodData = (periodRows.data ?? []) as InvoiceRow[];

  const outstanding = outstandingPk(receivableData as { total_amount: unknown; paid_amount: unknown }[]);

  const periodSales = sumMoney(periodData as { total_amount: unknown }[], (inv) => inv.status !== "draft" && inv.status !== "cancelled");
  const periodInvoiceCount = periodData.filter(
    (inv) => inv.status !== "draft" && inv.status !== "cancelled",
  ).length;

  const inventoryCost = await resolveInventoryCost(supabase, bid, inventoryCostRes);

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

  const catalogRows = (posCatalogProducts ?? []) as ProductRow[];

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("subtitle")}</p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Link
              href="#dashboard-new-invoice"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {t("newInvoice")}
            </Link>
            <Link
              href="/dashboard/invoices"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              {t("allInvoices")}
            </Link>
          </div>
        ) : null}
      </div> */}

      {canEdit && invoiceEditorData ? (
        <section id="dashboard-new-invoice" className="mt-2 scroll-mt-24">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {t("invoiceSection")}
              </h2>
              {/* <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("invoiceSectionDesc")}</p> */}
            </div>
            <Link
              href="/dashboard/invoices/new"
              className="shrink-0 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
            >
              {t("fullPageInvoice")}
            </Link>
          </div>
          <div className="mt-4">
            <PosSaleClient
              initialCatalogProducts={catalogRows}
              customers={invoiceEditorData.customers}
              restaurantTables={invoiceEditorData.restaurantTables}
              restaurantWaiters={invoiceEditorData.restaurantWaiters}
              forceRestaurantMode={isRestaurant}
              invoiceDefaults={invoiceEditorData.invoiceDefaults}
              cancelHref="/dashboard"
              firstDraftSaveBehavior="refresh-only"
              fullPageInvoiceHref="/dashboard/invoices/new"
            />
          </div>
        </section>
      ) : null}

      <div className="mt-8">
        <DashboardStatsPeriodTabs current={statsPeriod} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("statPeriodSales")}
            value={pkr.format(periodSales)}
            hint={t("statPeriodSalesHint", { count: periodInvoiceCount })}
          />
          <StatCard label={t("statOutstanding")} value={pkr.format(outstanding)} hint={t("statOutstandingHint")} />
          <StatCard label={t("statDrafts")} value={String(draftsCount)} hint={t("statDraftsHint")} href="/dashboard/invoices" />
          <StatCard
            label={t("statInventoryCost")}
            value={pkr.format(inventoryCost)}
            hint={t("statInventoryCostHint")}
            href="/dashboard/products"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("statProducts")} value={String(productsCount)} hint={t("statProductsHint")} href="/dashboard/products" />
        <StatCard label={t("statCustomers")} value={String(customersCount)} hint={t("statCustomersHint")} href="/dashboard/customers" />
        <StatCard
          label={t("statLowStock")}
          value={String(lowStockCount)}
          hint={t("statLowStockHint")}
          href="/dashboard/products?stock=low"
        />
        <StatCard
          label={t("statOpenPos")}
          value={String(openPoCount)}
          hint={t("statOpenPosHint")}
          href="/dashboard/purchase-orders"
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <LowStockPanel
          items={lowStockPreview}
          totalCount={lowStockCount}
          canEdit={canProducts}
        />
        <OpenPosPanel items={openPosList} />
      </div>
      {isRestaurant ? (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Open tables</h3>
            <Link href="/dashboard/invoices" className="text-xs font-medium text-zinc-700 underline dark:text-zinc-300">
              {tCommon("viewAll")}
            </Link>
          </div>
          {openTables.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No open dine-in orders.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {openTables.map((row) => {
                const tableName = Array.isArray(row.restaurant_tables)
                  ? (row.restaurant_tables[0]?.name ?? "—")
                  : (row.restaurant_tables?.name ?? "—");
                return (
                  <li key={row.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{tableName}</span>
                    <span className="text-zinc-600 dark:text-zinc-300">{row.invoice_number}</span>
                    <span className="capitalize text-zinc-500 dark:text-zinc-400">{row.restaurant_order_status}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <div className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {t("recentInvoices")}
          </h2>
          <Link
            href="/dashboard/invoices"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            {tCommon("viewAll")}
          </Link>
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          {recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {t("noInvoices")}
              {canEdit ? (
                <>
                  {" "}
                  <Link
                    href="#dashboard-new-invoice"
                    className="font-medium text-zinc-900 underline dark:text-zinc-100"
                  >
                    {t("createFirstInvoice")}
                  </Link>
                </>
              ) : null}
            </p>
          ) : (
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">{t("colInvoice")}</th>
                  <th className="px-4 py-3">{t("colCustomer")}</th>
                  <th className="px-4 py-3">{t("colStatus")}</th>
                  <th className="px-4 py-3 text-right">{t("colTotal")}</th>
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
                        {new Date(inv.created_at).toLocaleDateString(intlTag, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {inv.customers?.name ?? tCommon("dash")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[inv.status] ?? statusStyle.draft}`}
                      >
                        {tInv(inv.status as "draft" | "unpaid" | "partial" | "paid" | "cancelled")}
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
