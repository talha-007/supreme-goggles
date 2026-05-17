import { CustomerEditForm } from "@/components/customers/customer-edit-form";
import { requireBusinessContext, canManageCustomers, guardOwnerPage } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { CustomerRow } from "@/types/customer";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  if (!canManageCustomers(ctx.role)) {
    redirect("/dashboard/customers");
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load customer: ${error.message}`);
  }
  if (!row) {
    notFound();
  }

  const customer = row as CustomerRow;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/customers"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Back to customers
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
          Edit customer
        </h1>
        <p className="mt-1 text-sm text-zinc-600">{customer.name}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <CustomerEditForm customer={customer} />
      </div>
    </div>
  );
}
