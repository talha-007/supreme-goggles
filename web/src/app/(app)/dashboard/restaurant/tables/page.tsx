import { RestaurantTableCreateForm } from "@/components/restaurant/table-create-form";
import { requireBusinessContext, guardOwnerPage } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RestaurantTablesPage() {
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
      .from("restaurant_tables")
      .select("id, name, seats, is_active")
      .eq("business_id", ctx.businessId)
      .order("name"),
  ]);

  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  if (caps.type !== "restaurant") redirect("/dashboard");
  guardOwnerPage(ctx);

  const tables = (rows ?? []) as { id: string; name: string; seats: number; is_active: boolean }[];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Table management</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Create and manage dine-in tables.</p>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <RestaurantTableCreateForm />
      </div>

      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error.message}</p> : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {tables.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No tables yet.
                </td>
              </tr>
            ) : (
              tables.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{t.name}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{t.seats}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{t.is_active ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
