import { ProductsCatalogClient } from "@/components/products/products-catalog-client";
import { requireBusinessContext, canManageProducts, guardOwnerPage } from "@/lib/auth/business-context";
import { isSparePartsBusinessType } from "@/lib/business/business-type-helpers";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { sanitizeProductSearchQuery } from "@/lib/products/search-query";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/types/product";
import { getTranslations } from "next-intl/server";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stock?: string; scan?: string }>;
}) {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  const canEdit = canManageProducts(ctx.role);
  const params = await searchParams;

  const q = sanitizeProductSearchQuery(params.q ?? "");
  const lowStock = params.stock === "low";

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
    supabase.rpc("search_products", {
      p_business_id: ctx.businessId,
      p_query: q.length > 0 ? q : null,
      p_low_stock_only: lowStock,
      p_limit: q.length > 0 ? 100 : 50,
      p_offset: 0,
    }),
  ]);

  if (error) {
    const t = await getTranslations("products");
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
        <p className="mt-2 text-sm text-zinc-600">
          {t("migrationHint", { fn: "search_products" })}
        </p>
      </div>
    );
  }

  const initialProducts = (rows ?? []) as ProductRow[];
  const caps = resolveBusinessCapabilities(
    (businessRow?.type as BusinessType | null) ?? "shop",
    settingsRow,
  );
  const showSparePartsColumns = isSparePartsBusinessType(caps.type);
  const showPharmacyColumns = caps.batchExpiry || caps.prescriptionFlow;

  return (
    <ProductsCatalogClient
      initialProducts={initialProducts}
      initialQ={params.q ?? ""}
      initialLowStockOnly={lowStock}
      initialScanMode={params.scan === "1"}
      canEdit={canEdit}
      showSparePartsColumns={showSparePartsColumns}
      showPharmacyColumns={showPharmacyColumns}
    />
  );
}
