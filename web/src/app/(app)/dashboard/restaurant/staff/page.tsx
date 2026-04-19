import { requireBusinessContext } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function addStaff(formData: FormData) {
  "use server";
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !["waiter", "chef", "counter"].includes(role)) return;
  await supabase.from("restaurant_staff").insert({
    business_id: ctx.businessId,
    name,
    role,
    phone: phone || null,
    is_active: true,
  });
  revalidatePath("/dashboard/restaurant/staff");
}

export default async function RestaurantStaffPage() {
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
      .from("restaurant_staff")
      .select("id, name, role, phone, is_active")
      .eq("business_id", ctx.businessId)
      .order("role")
      .order("name"),
  ]);
  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  if (caps.type !== "restaurant") redirect("/dashboard");

  const staff = (rows ?? []) as Array<{ id: string; name: string; role: string; phone: string | null; is_active: boolean }>;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Restaurant staff</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Add waiters, chefs, and counter employees.</p>
      <form action={addStaff} className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-950">
        <input name="name" required placeholder="Name" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <select name="role" defaultValue="waiter" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          <option value="waiter">Waiter</option>
          <option value="chef">Chef</option>
          <option value="counter">Counter</option>
        </select>
        <input name="phone" placeholder="Phone (optional)" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
        <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">
          Add staff
        </button>
      </form>
      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error.message}</p> : null}
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">No staff yet.</td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{s.name}</td>
                  <td className="px-4 py-3 capitalize text-zinc-700 dark:text-zinc-300">{s.role}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{s.is_active ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
