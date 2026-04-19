import { ProductEditForm } from "@/components/products/product-edit-form";
import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { getProductTaxonomy } from "@/lib/products/taxonomy";
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

  if (error) {
    throw new Error(`Failed to load product: ${error.message}`);
  }
  if (!row) {
    notFound();
  }

  const product = row as ProductRow;
  const [{ data: businessRow }, { data: settingsRow }] = await Promise.all([
    supabase.from("businesses").select("type").eq("id", ctx.businessId).maybeSingle(),
    supabase
      .from("business_settings")
      .select(
        "enable_table_service, enable_batch_expiry, enable_prescription_flow, enable_kot_printing, enable_quick_service_mode, default_tax_mode, rounding_rule",
      )
      .eq("business_id", ctx.businessId)
      .maybeSingle(),
  ]);
  const caps = resolveBusinessCapabilities(
    (businessRow?.type as BusinessType | null) ?? "shop",
    settingsRow,
  );
  const taxonomy = await getProductTaxonomy();

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
        <ProductEditForm
          product={product}
          taxonomy={taxonomy}
          showPharmacyFields={caps.batchExpiry || caps.prescriptionFlow}
          showRestaurantFields={caps.tableService || caps.kotPrinting || caps.type === "restaurant"}
        />
      </div>
    </div>
  );
}
