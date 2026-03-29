import { ProductEditForm } from "@/components/products/product-edit-form";
import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/types/product";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    redirect("/dashboard/products");
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const product = row as ProductRow;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/dashboard/products"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to products
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Edit product
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{product.name}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <ProductEditForm product={product} />
      </div>
    </div>
  );
}
