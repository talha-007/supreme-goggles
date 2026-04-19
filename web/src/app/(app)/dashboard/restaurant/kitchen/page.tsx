import { RestaurantRealtimeAlerts } from "@/components/restaurant/restaurant-realtime-alerts";
import { requireBusinessContext } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { updateRestaurantOrderStatus } from "@/lib/invoices/actions";
import { statusBadgeClass, type RestaurantOrderStatus } from "@/lib/restaurant/order-utils";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function advanceKitchenOrder(formData: FormData) {
  "use server";
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const next = String(formData.get("next_status") ?? "") as RestaurantOrderStatus;
  await updateRestaurantOrderStatus(invoiceId, next);
  revalidatePath("/dashboard/restaurant/kitchen");
}

export default async function KitchenPage() {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const [{ data: businessRow }, { data: settingsRow }, { data: rows, error }] = await Promise.all([
    supabase.from("businesses").select("type").eq("id", ctx.businessId).maybeSingle(),
    supabase
      .from("business_settings")
      .select(
        "enable_table_service, enable_batch_expiry, enable_prescription_flow, enable_kot_printing, enable_quick_service_mode, default_tax_mode, rounding_rule",
      )
      .eq("business_id", ctx.businessId)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select("id, invoice_number, restaurant_order_status, restaurant_tables ( name )")
      .eq("business_id", ctx.businessId)
      .in("restaurant_order_status", ["new", "preparing"])
      .order("updated_at", { ascending: true }),
  ]);
  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  if (caps.type !== "restaurant") redirect("/dashboard");

  const orders = (rows ?? []) as Array<{
    id: string;
    invoice_number: string;
    restaurant_order_status: RestaurantOrderStatus;
    restaurant_tables: { name: string } | { name: string }[] | null;
  }>;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Kitchen board</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Prepare incoming orders and mark them ready.</p>
      <RestaurantRealtimeAlerts businessId={ctx.businessId} mode="kitchen" />
      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error.message}</p> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {orders.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            No kitchen orders right now.
          </p>
        ) : (
          orders.map((o) => {
            const table = Array.isArray(o.restaurant_tables) ? (o.restaurant_tables[0]?.name ?? "—") : (o.restaurant_tables?.name ?? "—");
            const next = o.restaurant_order_status === "new" ? "preparing" : "ready";
            const cta = o.restaurant_order_status === "new" ? "Start preparing" : "Mark ready";
            return (
              <form key={o.id} action={advanceKitchenOrder} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <input type="hidden" name="invoice_id" value={o.id} />
                <input type="hidden" name="next_status" value={next} />
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{o.invoice_number}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Table: {table}</p>
                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(o.restaurant_order_status)}`}>
                  {o.restaurant_order_status}
                </span>
                <button type="submit" className="mt-3 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
                  {cta}
                </button>
              </form>
            );
          })
        )}
      </div>
    </div>
  );
}
