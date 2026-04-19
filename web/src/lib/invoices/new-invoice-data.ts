import { requireBusinessContext } from "@/lib/auth/business-context";
import type { CustomerOption, ProductOption } from "@/components/invoices/invoice-editor";
import { createClient } from "@/lib/supabase/server";
import { getBusinessInvoiceDefaults } from "@/lib/settings/actions";
import type { InvoiceEditorDefaults } from "@/types/invoice";
import type { ProductRow } from "@/types/product";

export type NewInvoiceEditorData = {
  customers: CustomerOption[];
  products: ProductOption[];
  invoiceDefaults: InvoiceEditorDefaults | null;
  restaurantTables: { id: string; name: string }[];
  restaurantWaiters: { id: string; name: string }[];
};

export async function getNewInvoiceEditorData(): Promise<NewInvoiceEditorData> {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();

  const [
    { data: products },
    { data: customers },
    { data: tables, error: tablesErr },
    { data: waiters, error: waitersErr },
    businessDefaults,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit, sale_price")
      .eq("business_id", ctx.businessId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("customers")
      .select("id, name")
      .eq("business_id", ctx.businessId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("restaurant_tables")
      .select("id, name")
      .eq("business_id", ctx.businessId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("restaurant_waiters")
      .select("id, name")
      .eq("business_id", ctx.businessId)
      .eq("is_active", true)
      .order("name"),
    getBusinessInvoiceDefaults(),
  ]);

  const invoiceDefaults: InvoiceEditorDefaults | null = businessDefaults
    ? {
        defaultTaxRate: businessDefaults.default_tax_rate,
        defaultInvoiceDiscountAmount: businessDefaults.default_invoice_discount_amount,
        defaultLineDiscountPct: businessDefaults.default_line_discount_pct,
      }
    : null;

  return {
    products: (products ?? []) as ProductOption[],
    customers: customers ?? [],
    restaurantTables: tablesErr ? [] : (tables ?? []),
    restaurantWaiters: waitersErr ? [] : (waiters ?? []),
    invoiceDefaults,
  };
}

/** Full product rows for POS grid (images, categories). */
export async function getPosCatalogProducts(): Promise<ProductRow[]> {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, business_id, name, sku, barcode, category, brand, description, unit, purchase_price, sale_price, current_stock, reorder_level, is_active, image_url, created_at, updated_at",
    )
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .order("name")
    .limit(500);

  if (error) return [];
  return (data ?? []) as ProductRow[];
}
