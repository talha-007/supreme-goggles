import { RestaurantRealtimeAlerts } from "@/components/restaurant/restaurant-realtime-alerts";
import { QuickStatusButton } from "@/components/restaurant/order-row-actions";
import { requireBusinessContext, restaurantRoleGuard } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { statusBadgeClass, type RestaurantOrderStatus } from "@/lib/restaurant/order-utils";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function CounterPage() {
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
      .select("id, invoice_number, total_amount, paid_amount, status, restaurant_order_status, restaurant_tables ( name )")
      .eq("business_id", ctx.businessId)
      .in("restaurant_order_status", ["served", "settled"])
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);
  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  if (caps.type !== "restaurant") redirect("/dashboard");
  if (!restaurantRoleGuard(ctx, ["counter"])) redirect("/dashboard");

  const bills = (rows ?? []) as Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    paid_amount: number;
    status: string;
    restaurant_order_status: RestaurantOrderStatus;
    restaurant_tables: { name: string } | { name: string }[] | null;
  }>;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Counter desk</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Settle served orders and print receipts.</p>
      <RestaurantRealtimeAlerts businessId={ctx.businessId} mode="counter" />
      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error.message}</p> : null}
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {bills.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No served/settled bills.
                </td>
              </tr>
            ) : (
              bills.map((b) => {
                const table = Array.isArray(b.restaurant_tables) ? (b.restaurant_tables[0]?.name ?? "—") : (b.restaurant_tables?.name ?? "—");
                return (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-mono">{b.invoice_number}</td>
                    <td className="px-4 py-3">{table}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(b.restaurant_order_status)}`}>
                        {b.restaurant_order_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(b.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{Number(b.paid_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {b.restaurant_order_status === "served" ? (
                          <QuickStatusButton
                            invoiceId={b.id}
                            nextStatus="settled"
                            label="Settle"
                            disabled={b.status !== "paid"}
                          />
                        ) : null}
                        <Link href={`/dashboard/invoices/${b.id}`} className="text-sm font-medium underline text-zinc-900 dark:text-zinc-100">
                          Open bill
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
