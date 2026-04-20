import { requireBusinessContext, guardOwnerPage } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MenuPage() {
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
      .from("products")
      .select("id, name, category, sale_price, is_active")
      .eq("business_id", ctx.businessId)
      .eq("is_menu_item", true)
      .order("name"),
  ]);

  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  if (caps.type !== "restaurant") redirect("/dashboard");
  guardOwnerPage(ctx);

  const items = (rows ?? []) as {
    id: string;
    name: string;
    category: string | null;
    sale_price: number;
    is_active: boolean;
  }[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Menu items</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage restaurant menu using products marked as menu items.
          </p>
        </div>
        <Link
          href="/dashboard/products/new?menu=1"
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Add menu item
        </Link>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error.message}</p> : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No menu items yet. Create products and enable "Sell as menu item".
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{item.name}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{item.category ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">PKR {Number(item.sale_price).toFixed(2)}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    <Link href={`/dashboard/products/${item.id}/edit?menu=1`} className="underline">
                      {item.is_active ? "Active" : "Inactive"}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
