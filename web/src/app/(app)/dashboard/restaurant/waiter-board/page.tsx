import { RestaurantRealtimeAlerts } from "@/components/restaurant/restaurant-realtime-alerts";
import { requireBusinessContext } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { statusBadgeClass, type RestaurantOrderStatus } from "@/lib/restaurant/order-utils";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function WaiterBoardPage() {
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
      .select("id, invoice_number, restaurant_order_status, restaurant_tables ( name ), restaurant_waiters ( name )")
      .eq("business_id", ctx.businessId)
      .in("restaurant_order_status", ["ready", "served"])
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);
  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  if (caps.type !== "restaurant") redirect("/dashboard");

  const orders = (rows ?? []) as Array<{
    id: string;
    invoice_number: string;
    restaurant_order_status: RestaurantOrderStatus;
    restaurant_tables: { name: string } | { name: string }[] | null;
    restaurant_waiters: { name: string } | { name: string }[] | null;
  }>;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Waiter board</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Track ready/served orders and handoff to counter.</p>
      <RestaurantRealtimeAlerts businessId={ctx.businessId} mode="waiter" />
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
                const table = Array.isArray(o.restaurant_tables) ? (o.restaurant_tables[0]?.name ?? "—") : (o.restaurant_tables?.name ?? "—");
                const waiter = Array.isArray(o.restaurant_waiters) ? (o.restaurant_waiters[0]?.name ?? "—") : (o.restaurant_waiters?.name ?? "—");
                return (
                  <tr key={o.id}>
                    <td className="px-4 py-3 font-mono">{o.invoice_number}</td>
                    <td className="px-4 py-3">{table}</td>
                    <td className="px-4 py-3">{waiter}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(o.restaurant_order_status)}`}>
                        {o.restaurant_order_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/invoices/${o.id}`} className="text-sm font-medium underline text-zinc-900 dark:text-zinc-100">
                        Open order
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
  );
}
