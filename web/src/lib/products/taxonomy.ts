import { requireBusinessContext } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";

export type ProductTaxonomy = { categories: string[]; brands: string[] };

export async function getProductTaxonomy(): Promise<ProductTaxonomy> {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_product_taxonomy", {
    p_business_id: ctx.businessId,
  });
  if (error || data == null) {
    return { categories: [], brands: [] };
  }
  const obj = data as { categories?: unknown; brands?: unknown };
  const categories = Array.isArray(obj.categories)
    ? obj.categories.map((x) => String(x))
    : [];
  const brands = Array.isArray(obj.brands) ? obj.brands.map((x) => String(x)) : [];
  return { categories, brands };
}
