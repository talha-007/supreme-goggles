import { PosSaleClient } from "@/components/dashboard/pos-sale-client";
import { StatCard } from "@/components/dashboard/stat-card";
import { QuickStatusButton, WaiterAssignSelect } from "@/components/restaurant/order-row-actions";
import { requireBusinessContext, restaurantRoleGuard } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { getNewInvoiceEditorData, getPosCatalogProducts } from "@/lib/invoices/new-invoice-data";
import { statusBadgeClass, type RestaurantOrderStatus } from "@/lib/restaurant/order-utils";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function WaiterBoardPage() {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const [
    { data: businessRow },
    { data: settingsRow },
    { data: rows, error },
    { data: sentRows, error: sentErr },
    { data: waitersRows },
    { data: myStaffRow },
    { data: kpiRows, error: kpiErr },
    invoiceEditorData,
    posCatalogProducts,
  ] = await Promise.all([
    supabase.from("businesses").select("type").eq("id", ctx.businessId).maybeSingle(),
    supabase
      .from("business_settings")
      .select(
        "enable_table_service, enable_batch_expiry, enable_prescription_flow, enable_kot_printing, enable_quick_service_mode, default_tax_mode, rounding_rule",
      )
      .eq("business_id", ctx.businessId)
      .maybeSingle(),
    supabase
      .from("restaurant_orders")
      .select("invoice_id, status, waiter_id, restaurant_tables ( name ), restaurant_staff ( name ), invoices!restaurant_orders_invoice_id_fkey ( invoice_number )")
      .eq("business_id", ctx.businessId)
      .in("status", ["ready", "served"])
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("restaurant_orders")
      .select("invoice_id, status, waiter_id, restaurant_tables ( name ), invoices!restaurant_orders_invoice_id_fkey ( invoice_number )")
      .eq("business_id", ctx.businessId)
      .in("status", ["new", "preparing", "ready"])
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("restaurant_staff")
      .select("id, name")
      .eq("business_id", ctx.businessId)
      .eq("role", "waiter")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("restaurant_staff")
      .select("id, role")
      .eq("business_id", ctx.businessId)
      .eq("user_id", ctx.userId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select("id, total_amount, paid_amount, waiter_id, status")
      .eq("business_id", ctx.businessId)
      .in("status", ["unpaid", "partial", "paid"])
      .limit(500),
    getNewInvoiceEditorData(),
    getPosCatalogProducts({ menuOnly: true }),
  ]);
  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  if (caps.type !== "restaurant") redirect("/dashboard");
  if (!restaurantRoleGuard(ctx, ["waiter"])) redirect("/dashboard");
  const restrictedWaiterId = myStaffRow?.role === "waiter" ? (myStaffRow.id as string) : null;

  const sourceOrders = (rows ?? []) as Array<{
    invoice_id: string;
    status: RestaurantOrderStatus;
    restaurant_tables: { name: string } | { name: string }[] | null;
    restaurant_staff: { name: string } | { name: string }[] | null;
    waiter_id?: string | null;
    invoices: { invoice_number: string } | { invoice_number: string }[] | null;
  }>;
  const orders =
    restrictedWaiterId
      ? sourceOrders.filter((o) => o.waiter_id === restrictedWaiterId)
      : sourceOrders;
  const waiters = (waitersRows ?? []) as Array<{ id: string; name: string }>;
  const sentOrders = ((sentRows ?? []) as Array<{
    invoice_id: string;
    status: RestaurantOrderStatus;
    waiter_id: string | null;
    restaurant_tables: { name: string } | { name: string }[] | null;
    invoices: { invoice_number: string } | { invoice_number: string }[] | null;
  }>).filter((r) => (restrictedWaiterId ? r.waiter_id === restrictedWaiterId : true));
  const inKitchenOrders = sentOrders.filter(
    (r) => r.status === "new" || r.status === "preparing",
  );
  const readyToServeOrders = sentOrders.filter((r) => r.status === "ready");
  const statsRows = (kpiRows ?? []) as Array<{
    id: string;
    total_amount: number;
    paid_amount: number;
    waiter_id: string | null;
    status: string;
  }>;
  const waiterRows = restrictedWaiterId
    ? statsRows.filter((r) => r.waiter_id === restrictedWaiterId)
    : statsRows;
  const ordersTaken = waiterRows.length;
  const totalBillsReceived = waiterRows.reduce((s, r) => s + Number(r.paid_amount ?? 0), 0);
  const pkr = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Waiter board</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Take customer orders, track ready/served orders, and handoff to counter.</p>
      {kpiErr ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{kpiErr.message}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard label="Orders taken" value={String(ordersTaken)} hint="Assigned to this waiter" />
        <StatCard
          label="Total bills received"
          value={pkr.format(totalBillsReceived)}
          hint="Sum of paid amount on assigned bills"
        />
      </div>
      <div className="mt-6">
        <PosSaleClient
          initialCatalogProducts={posCatalogProducts}
          customers={invoiceEditorData.customers}
          restaurantTables={invoiceEditorData.restaurantTables}
          restaurantWaiters={invoiceEditorData.restaurantWaiters}
          forceRestaurantMode
          restaurantWorkflowMode="order-to-kitchen"
          defaultWaiterId={restrictedWaiterId}
          invoiceDefaults={invoiceEditorData.invoiceDefaults}
          cancelHref="/dashboard/restaurant/waiter-board"
          firstDraftSaveBehavior="refresh-only"
          fullPageInvoiceHref="/dashboard/invoices/new"
        />
      </div>
      {sentErr ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{sentErr.message}</p> : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            In kitchen
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {inKitchenOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No orders in kitchen.
                  </td>
                </tr>
              ) : (
                inKitchenOrders.map((o) => {
                  const inv = Array.isArray(o.invoices) ? (o.invoices[0] ?? null) : o.invoices;
                  if (!inv) return null;
                  const table = Array.isArray(o.restaurant_tables) ? (o.restaurant_tables[0]?.name ?? "—") : (o.restaurant_tables?.name ?? "—");
                  return (
                    <tr key={o.invoice_id}>
                      <td className="px-4 py-3 font-mono">{inv.invoice_number}</td>
                      <td className="px-4 py-3">{table}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/invoices/${o.invoice_id}`} className="text-sm font-medium underline text-zinc-900 dark:text-zinc-100">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Ready to serve
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {readyToServeOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                    No ready orders yet.
                  </td>
                </tr>
              ) : (
                readyToServeOrders.map((o) => {
                  const inv = Array.isArray(o.invoices) ? (o.invoices[0] ?? null) : o.invoices;
                  if (!inv) return null;
                  const table = Array.isArray(o.restaurant_tables) ? (o.restaurant_tables[0]?.name ?? "—") : (o.restaurant_tables?.name ?? "—");
                  return (
                    <tr key={o.invoice_id}>
                      <td className="px-4 py-3 font-mono">{inv.invoice_number}</td>
                      <td className="px-4 py-3">{table}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/invoices/${o.invoice_id}`} className="text-sm font-medium underline text-zinc-900 dark:text-zinc-100">
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error.message}</p> : null}
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Waiter</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No ready/served orders.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const inv = Array.isArray(o.invoices) ? (o.invoices[0] ?? null) : o.invoices;
                if (!inv) return null;
                const table = Array.isArray(o.restaurant_tables) ? (o.restaurant_tables[0]?.name ?? "—") : (o.restaurant_tables?.name ?? "—");
                const waiter = Array.isArray(o.restaurant_staff) ? (o.restaurant_staff[0]?.name ?? "—") : (o.restaurant_staff?.name ?? "—");
                return (
                  <tr key={o.invoice_id}>
                    <td className="px-4 py-3 font-mono">{inv.invoice_number}</td>
                    <td className="px-4 py-3">{table}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span>{waiter}</span>
                        <WaiterAssignSelect
                          invoiceId={o.invoice_id}
                          currentWaiterId={o.waiter_id ?? null}
                          waiters={waiters}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {o.status === "ready" ? (
                          <QuickStatusButton invoiceId={o.invoice_id} nextStatus="served" label="Mark served" />
                        ) : null}
                        <Link href={`/dashboard/invoices/${o.invoice_id}`} className="text-sm font-medium underline text-zinc-900 dark:text-zinc-100">
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
