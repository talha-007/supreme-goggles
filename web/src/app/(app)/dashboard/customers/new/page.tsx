import { CustomerCreateForm } from "@/components/customers/customer-create-form";
import { requireBusinessContext, canManageCustomers, guardOwnerPage } from "@/lib/auth/business-context";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewCustomerPage() {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  if (!canManageCustomers(ctx.role)) {
    redirect("/dashboard/customers");
  }

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
          Add customer
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Outstanding balance is tracked automatically when you record invoices and payments.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <CustomerCreateForm />
      </div>
    </div>
  );
}
