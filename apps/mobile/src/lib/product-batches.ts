import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductBatchRow = {
  id: string;
  business_id: string;
  product_id: string;
  batch_no: string;
  expiry_date: string | null;
  qty_on_hand: number;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listProductBatches(
  supabase: SupabaseClient,
  businessId: string,
  productId: string,
): Promise<{ batches: ProductBatchRow[]; error?: string }> {
  const { data, error } = await supabase
    .from("product_batches")
    .select("id, business_id, product_id, batch_no, expiry_date, qty_on_hand, unit_cost, notes, created_at, updated_at")
    .eq("business_id", businessId)
    .eq("product_id", productId)
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) return { batches: [], error: error.message };
  return { batches: (data ?? []) as ProductBatchRow[] };
}

export async function addProductBatch(
  supabase: SupabaseClient,
  businessId: string,
  productId: string,
  input: {
    batch_no: string;
    expiry_date?: string | null;
    qty: number;
    unit_cost?: number | null;
    notes?: string | null;
  },
): Promise<{ error?: string }> {
  const batchNo = input.batch_no.trim();
  if (!batchNo) return { error: "Batch number is required." };
  if (!Number.isFinite(input.qty) || input.qty <= 0) return { error: "Enter a valid quantity." };

  const expiryRaw = String(input.expiry_date ?? "").trim();
  const expiryDate = /^\d{4}-\d{2}-\d{2}$/.test(expiryRaw) ? expiryRaw : null;

  const { error } = await supabase.rpc("upsert_product_batch_stock", {
    p_business_id: businessId,
    p_product_id: productId,
    p_batch_no: batchNo,
    p_expiry_date: expiryDate,
    p_qty: input.qty,
    p_unit_cost: input.unit_cost ?? null,
    p_purchase_order_id: null,
    p_purchase_order_item_id: null,
    p_note: input.notes?.trim() || null,
  });

  return { error: error?.message };
}

export function formatBatchExpiry(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(`${iso.trim()}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}
