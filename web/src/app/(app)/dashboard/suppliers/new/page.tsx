import { SupplierCreateForm } from "@/components/suppliers/supplier-create-form";
import { requireBusinessContext, canManageProducts, guardOwnerPage } from "@/lib/auth/business-context";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewSupplierPage() {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  if (!canManageProducts(ctx.role)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/suppliers"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Suppliers
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
          Add supplier
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Used when creating purchase orders.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <SupplierCreateForm />
      </div>
    </div>
  );
}
