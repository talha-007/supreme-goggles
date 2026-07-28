"use server";

import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { ProductBatchRow } from "@/types/product-batch";
import { revalidatePath } from "next/cache";

export type BatchActionState = { error?: string };

function parseQty(value: FormDataEntryValue | null): number {
  if (value === null || value === "") return 0;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseNullableDate(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export async function listProductBatches(productId: string): Promise<{
  batches: ProductBatchRow[];
  error?: string;
}> {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_batches")
    .select("*")
    .eq("business_id", ctx.businessId)
    .eq("product_id", productId)
    .order("expiry_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) return { batches: [], error: error.message };
  return { batches: (data ?? []) as ProductBatchRow[] };
}

export async function addProductBatch(
  productId: string,
  _prev: BatchActionState,
  formData: FormData,
): Promise<BatchActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "You do not have permission to manage batches." };
  }

  const batchNo = String(formData.get("batch_no") ?? "").trim();
  if (!batchNo) return { error: "Batch number is required." };

  const qty = parseQty(formData.get("qty"));
  if (qty <= 0) return { error: "Enter a valid quantity." };

  const expiryDate = parseNullableDate(formData.get("expiry_date"));
  const unitCostRaw = String(formData.get("unit_cost") ?? "").trim();
  const unitCost = unitCostRaw ? Number(unitCostRaw.replace(/,/g, "")) : null;

  const supabase = await createClient();
  const { data: batchId, error } = await supabase.rpc("upsert_product_batch_stock", {
    p_business_id: ctx.businessId,
    p_product_id: productId,
    p_batch_no: batchNo,
    p_expiry_date: expiryDate,
    p_qty: qty,
    p_unit_cost: unitCost != null && Number.isFinite(unitCost) ? unitCost : null,
    p_purchase_order_id: null,
    p_purchase_order_item_id: null,
    p_note: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) return { error: error.message };
  if (!batchId) return { error: "Could not save batch." };

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${productId}/edit`);
  return {};
}
