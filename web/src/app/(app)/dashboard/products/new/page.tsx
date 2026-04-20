import { ProductCreateForm } from "@/components/products/product-create-form";
import { requireBusinessContext, canManageProducts, guardOwnerPage } from "@/lib/auth/business-context";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { getProductTaxonomy } from "@/lib/products/taxonomy";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ barcode?: string; scan?: string; menu?: string }>;
}) {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  if (!canManageProducts(ctx.role)) {
    redirect("/dashboard/products");
  }

  const params = await searchParams;
  const barcodeFromUrl = params.barcode?.trim() ? params.barcode.trim().slice(0, 80) : undefined;
  const scanMode = params.scan === "1";
  const menuMode = params.menu === "1";
  const supabase = await createClient();
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
          {menuMode ? "Add menu item" : "Add product"}
        </h1>
        {menuMode ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create restaurant menu items with only menu-relevant fields.
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Stock can also be adjusted later from invoices and purchase orders. Use a barcode scanner on
            the barcode field, or open{" "}
            <Link href="/dashboard/products?scan=1" className="font-medium underline">
              Products in scan mode
            </Link>{" "}
            to find items quickly.
          </p>
        )}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <ProductCreateForm
          barcodeFromUrl={barcodeFromUrl}
          scanMode={scanMode}
          taxonomy={taxonomy}
          showPharmacyFields={caps.batchExpiry || caps.prescriptionFlow}
          showRestaurantFields={caps.tableService || caps.kotPrinting || caps.type === "restaurant"}
          menuMode={menuMode}
        />
      </div>
    </div>
  );
}
