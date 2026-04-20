import { PosSaleClient } from "@/components/dashboard/pos-sale-client";
import { StatCard } from "@/components/dashboard/stat-card";
import { OrderAlertToggle } from "@/components/restaurant/order-alert-toggle";
import { OrdersRealtimeSync } from "@/components/restaurant/orders-realtime-sync";
import { WaiterBoardTabs, type WaiterOrder } from "@/components/restaurant/waiter-board-tabs";
import { requireBusinessContext, restaurantRoleGuard } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { getNewInvoiceEditorData, getPosCatalogProducts } from "@/lib/invoices/new-invoice-data";
import { type RestaurantOrderStatus } from "@/lib/restaurant/order-utils";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WaiterBoardPage() {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();

  const [
    { data: businessRow },
    { data: settingsRow },
    { data: activeRows, error: activeErr },
    { data: servedRows, error: servedErr },
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
    // new / preparing / ready — "live" orders
    supabase
      .from("restaurant_orders")
      .select(
        "invoice_id, status, waiter_id, restaurant_tables ( name ), invoices!restaurant_orders_invoice_id_fkey ( invoice_number )",
      )
      .eq("business_id", ctx.businessId)
      .in("status", ["new", "preparing", "ready"])
      .order("created_at", { ascending: true })
      .limit(100),
    // served — history (include invoice payment status)
    supabase
      .from("restaurant_orders")
      .select(
        "invoice_id, status, waiter_id, restaurant_tables ( name ), invoices!restaurant_orders_invoice_id_fkey ( invoice_number, status )",
      )
      .eq("business_id", ctx.businessId)
      .eq("status", "served")
      .order("updated_at", { ascending: false })
      .limit(30),
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

  const caps = resolveBusinessCapabilities(
    (businessRow?.type as BusinessType | null) ?? "shop",
    settingsRow,
  );
  if (caps.type !== "restaurant") redirect("/dashboard");
  if (!restaurantRoleGuard(ctx, ["waiter"])) redirect("/dashboard");

  const restrictedWaiterId =
    myStaffRow?.role === "waiter" ? (myStaffRow.id as string) : null;

  // Filter by waiter when staff is a restricted waiter
  function filterByWaiter(rows: WaiterOrder[]) {
    return restrictedWaiterId
      ? rows.filter((o) => o.waiter_id === restrictedWaiterId)
      : rows;
  }

  const allActive = filterByWaiter(
    (activeRows ?? []) as WaiterOrder[],
  );
  const inKitchenOrders = allActive.filter(
    (o) => (o.status as RestaurantOrderStatus) === "new" || (o.status as RestaurantOrderStatus) === "preparing",
  );
  const readyToServeOrders = allActive.filter(
    (o) => (o.status as RestaurantOrderStatus) === "ready",
  );
  const servedOrders = filterByWaiter((servedRows ?? []) as WaiterOrder[]);

  // KPI stats
  const statsRows = (kpiRows ?? []) as Array<{
    id: string;
    total_amount: number;
    paid_amount: number;
    waiter_id: string | null;
    status: string;
  }>;
  const waiterKpiRows = restrictedWaiterId
    ? statsRows.filter((r) => r.waiter_id === restrictedWaiterId)
    : statsRows;
  const ordersTaken = waiterKpiRows.length;
  const totalBillsReceived = waiterKpiRows.reduce(
    (s, r) => s + Number(r.paid_amount ?? 0),
    0,
  );
  const pkr = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className="mx-auto max-w-3xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Waiter board
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Take orders, track kitchen progress, and serve customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderAlertToggle businessId={ctx.businessId} mode="waiter" />
          <OrdersRealtimeSync businessId={ctx.businessId} />
        </div>
      </div>

      {kpiErr && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{kpiErr.message}</p>
      )}
      {activeErr && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{activeErr.message}</p>
      )}
      {servedErr && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{servedErr.message}</p>
      )}

      {/* KPI stats */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Orders taken"
          value={String(ordersTaken)}
          hint="Assigned to this waiter"
        />
        <StatCard
          label="Bills received"
          value={pkr.format(totalBillsReceived)}
          hint="Sum of paid amount on assigned bills"
        />
      </div>

      {/* Tabbed order management */}
      <div className="mt-6">
        <WaiterBoardTabs
          inKitchenOrders={inKitchenOrders}
          readyToServeOrders={readyToServeOrders}
          servedOrders={servedOrders}
        >
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
        </WaiterBoardTabs>
      </div>
    </div>
  );
}
