import { KitchenBoardClient, type KitchenOrder } from "@/components/restaurant/kitchen-board-client";
import { OrderAlertToggle } from "@/components/restaurant/order-alert-toggle";
import { OrdersRealtimeSync } from "@/components/restaurant/orders-realtime-sync";
import { requireBusinessContext, restaurantRoleGuard } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function KitchenPage() {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();

  const [{ data: businessRow }, { data: settingsRow }, { data: rows, error }] =
    await Promise.all([
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
        .select(
          "invoice_id, status, created_at, restaurant_tables ( name ), invoices!restaurant_orders_invoice_id_fkey ( invoice_number, invoice_items ( id, product_name, quantity, unit ) )",
        )
        .eq("business_id", ctx.businessId)
        .in("status", ["new", "preparing"])
        .order("created_at", { ascending: true }),
    ]);

  const caps = resolveBusinessCapabilities(
    (businessRow?.type as BusinessType | null) ?? "shop",
    settingsRow,
  );
  if (caps.type !== "restaurant") redirect("/dashboard");
  if (!restaurantRoleGuard(ctx, ["chef"])) redirect("/dashboard");

  const orders = (rows ?? []) as KitchenOrder[];
  const newCount      = orders.filter((o) => o.status === "new").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Kitchen
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {orders.length === 0
              ? "No active orders right now."
              : `${newCount} new · ${preparingCount} preparing`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderAlertToggle businessId={ctx.businessId} mode="kitchen" />
          <OrdersRealtimeSync businessId={ctx.businessId} />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error.message}</p>
      )}

      <div className="mt-6">
        <KitchenBoardClient orders={orders} />
      </div>
    </div>
  );
}
