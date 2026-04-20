import { StaffAccountCreateForm } from "@/components/restaurant/staff-account-create-form";
import { StaffPasswordResetForm } from "@/components/restaurant/staff-password-reset-form";
import { requireBusinessContext, guardOwnerPage } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { fetchAllAuthUsersViaAdminApi } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
      .select("id, name, role, phone, is_active, user_id")
      .eq("business_id", ctx.businessId)
      .order("role")
      .order("name"),
  ]);
  const caps = resolveBusinessCapabilities((businessRow?.type as BusinessType | null) ?? "shop", settingsRow);
  if (caps.type !== "restaurant") redirect("/dashboard");
  guardOwnerPage(ctx);

  const staff = (rows ?? []) as Array<{
    id: string;
    name: string;
    role: string;
    phone: string | null;
    is_active: boolean;
    user_id: string | null;
  }>;
  const { users: authUsers } = await fetchAllAuthUsersViaAdminApi();
  const emailByUserId = new Map(
    authUsers.map((u) => [u.id, u.email ?? null]),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Restaurant staff</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Add staff and create login accounts with role-based access.</p>
      <StaffAccountCreateForm />
      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error.message}</p> : null}
      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3 text-right">Security</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">No staff yet.</td>
              </tr>
            ) : (
              staff.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{s.name}</td>
                  <td className="px-4 py-3 capitalize text-zinc-700 dark:text-zinc-300">{s.role}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{s.user_id ? (emailByUserId.get(s.user_id) ?? "—") : "—"}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{s.user_id ? "Linked" : "Not linked"}</td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{s.is_active ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <StaffPasswordResetForm staffId={s.id} disabled={!s.user_id} />
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
