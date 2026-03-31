import { ProductsCatalogClient } from "@/components/products/products-catalog-client";
import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
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
  const canEdit = canManageProducts(ctx.role);
  const params = await searchParams;

  const q = sanitizeProductSearchQuery(params.q ?? "");
  const lowStock = params.stock === "low";

  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc("search_products", {
    p_business_id: ctx.businessId,
    p_query: q.length > 0 ? q : null,
    p_low_stock_only: lowStock,
    p_limit: q.length > 0 ? 100 : 50,
    p_offset: 0,
  });

  if (error) {
    const t = await getTranslations("products");
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error.message}</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("migrationHint", { fn: "search_products" })}
        </p>
      </div>
    );
  }

  const initialProducts = (rows ?? []) as ProductRow[];

  return (
    <ProductsCatalogClient
      initialProducts={initialProducts}
      initialQ={params.q ?? ""}
      initialLowStockOnly={lowStock}
      initialScanMode={params.scan === "1"}
      canEdit={canEdit}
    />
  );
}
