import { requireBusinessContext, canManageProducts, guardOwnerPage } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { SupplierRow } from "@/types/purchase-order";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SuppliersPage() {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  if (!canManageProducts(ctx.role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("suppliers")
    .select("id, name, phone, email, is_active")
    .eq("business_id", ctx.businessId)
    .order("name");

  const suppliers = (rows ?? []) as Pick<SupplierRow, "id" | "name" | "phone" | "email" | "is_active">[];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Suppliers
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Vendors you purchase stock from.
          </p>
        </div>
        <Link
          href="/dashboard/suppliers/new"
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Add supplier
        </Link>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error.message}</p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {suppliers.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            No suppliers yet.{" "}
            <Link href="/dashboard/suppliers/new" className="font-medium text-zinc-900 underline">
              Add one
            </Link>
            .
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.name}</td>
                  <td className="px-4 py-3 text-zinc-700">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">{s.email ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {s.is_active ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
