import { QuickStatusButton } from "@/components/restaurant/order-row-actions";
import { requireBusinessContext, restaurantRoleGuard } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { statusBadgeClass, type RestaurantOrderStatus } from "@/lib/restaurant/order-utils";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { redirect } from "next/navigation";

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
      .from("restaurant_orders")
      .select("invoice_id, status, invoices!restaurant_orders_invoice_id_fkey ( id, invoice_number, invoice_items ( id, product_name, quantity, unit, products ( image_url ) ) ), restaurant_tables ( name )")
      .eq("business_id", ctx.businessId)
      .in("status", ["new", "preparing"])
      .order("updated_at", { ascending: true }),
  ]);
  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  if (caps.type !== "restaurant") redirect("/dashboard");
  if (!restaurantRoleGuard(ctx, ["chef"])) redirect("/dashboard");

  const orders = (rows ?? []) as Array<{
    invoice_id: string;
    status: RestaurantOrderStatus;
    restaurant_tables: { name: string } | { name: string }[] | null;
    invoices:
      | {
          id: string;
          invoice_number: string;
          invoice_items:
            | Array<{
                id: string;
                product_name: string;
                quantity: number;
                unit: string;
                products: { image_url: string | null } | Array<{ image_url: string | null }> | null;
              }>
            | null;
        }
      | Array<{
          id: string;
          invoice_number: string;
          invoice_items:
            | Array<{
                id: string;
                product_name: string;
                quantity: number;
                unit: string;
                products: { image_url: string | null } | Array<{ image_url: string | null }> | null;
              }>
            | null;
        }>
      | null;
  }>;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Kitchen board</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Prepare incoming orders and mark them ready.</p>
      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error.message}</p> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {orders.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            No kitchen orders right now.
          </p>
        ) : (
          orders.map((o) => {
            const inv = Array.isArray(o.invoices) ? (o.invoices[0] ?? null) : o.invoices;
            if (!inv) return null;
            const table = Array.isArray(o.restaurant_tables) ? (o.restaurant_tables[0]?.name ?? "—") : (o.restaurant_tables?.name ?? "—");
            const next = o.status === "new" ? "preparing" : "ready";
            const cta = o.status === "new" ? "Start preparing" : "Mark ready";
            return (
              <div key={o.invoice_id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{inv.invoice_number}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Table: {table}</p>
                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}>
                  {o.status}
                </span>
                <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  {(inv.invoice_items ?? []).length === 0 ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">No items</p>
                  ) : (
                    (inv.invoice_items ?? []).map((it) => {
                      const productRel = Array.isArray(it.products) ? (it.products[0] ?? null) : it.products;
                      const imageUrl = productRel?.image_url ?? null;
                      return (
                        <div key={it.id} className="flex items-center gap-2">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
                            {imageUrl ? (
                              <Image src={imageUrl} alt={it.product_name} fill className="object-cover" sizes="40px" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs font-semibold text-zinc-500">
                                {it.product_name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">{it.product_name}</p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              Qty: {Number(it.quantity).toLocaleString("en-PK", { maximumFractionDigits: 2 })} {it.unit}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="mt-3">
                  <QuickStatusButton invoiceId={o.invoice_id} nextStatus={next} label={cta} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
