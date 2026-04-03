import type { SupabaseClient } from "@supabase/supabase-js";

import type { PurchaseOrderStatus } from "../types/purchase";

/** Matches DB enum `product_unit` (same as web). */
export const PRODUCT_UNITS = [
  "pcs",
  "kg",
  "g",
  "dozen",
  "ltr",
  "mtr",
  "box",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

type PoItemRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number;
};

export async function linkPoLineToProduct(
  supabase: SupabaseClient,
  poId: string,
  itemId: string,
  productId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("purchase_order_items")
    .update({ product_id: productId })
    .eq("id", itemId)
    .eq("purchase_order_id", poId);
  return { error: error?.message };
}

/** Create catalog product from PO line name/cost, link line, apply stock if already received (web parity). */
export async function createProductFromPoLine(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
  poItemId: string,
  input: { sale_price: number; unit?: ProductUnit },
): Promise<{ error?: string }> {
  const sale = roundMoney(input.sale_price);
  if (!Number.isFinite(sale) || sale < 0) {
    return { error: "Enter a valid sale price." };
  }

  const unit = (input.unit ?? "pcs") as ProductUnit;

  const { data: row, error: rowErr } = await supabase
    .from("purchase_order_items")
    .select(
      "id, product_id, product_name, qty_ordered, qty_received, unit_cost, purchase_order_id",
    )
    .eq("id", poItemId)
    .maybeSingle();

  if (rowErr || !row) return { error: "Line not found." };
  if (row.product_id) return { error: "This line is already linked to a product." };

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select("id, business_id, status, po_number")
    .eq("id", row.purchase_order_id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (poErr || !po) return { error: "Purchase order not found." };

  const st = po.status as PurchaseOrderStatus;
  if (st === "cancelled") {
    return { error: "Cannot add products on a cancelled PO." };
  }

  const name = String(row.product_name).trim();
  if (!name) return { error: "Line has no product name." };

  const { data: product, error: insErr } = await supabase
    .from("products")
    .insert({
      business_id: businessId,
      name,
      sku: null,
      barcode: null,
      category: null,
      description: null,
      unit,
      purchase_price: roundMoney(Number(row.unit_cost)),
      sale_price: sale,
      current_stock: 0,
      reorder_level: 0,
      is_active: true,
      created_by: userId,
    })
    .select("id")
    .single();

  if (insErr) return { error: insErr.message };

  const { error: linkErr } = await supabase
    .from("purchase_order_items")
    .update({ product_id: product.id })
    .eq("id", poItemId);

  if (linkErr) {
    await supabase.from("products").delete().eq("id", product.id);
    return { error: linkErr.message };
  }

  const qtyRec = Number(row.qty_received);
  if (qtyRec > 0.0001) {
    const { error: rpcErr } = await supabase.rpc("increment_stock", {
      p_product_id: product.id,
      p_qty: qtyRec,
    });
    if (rpcErr) {
      await supabase.from("purchase_order_items").update({ product_id: null }).eq("id", poItemId);
      await supabase.from("products").delete().eq("id", product.id);
      return { error: rpcErr.message };
    }

    const { error: movErr } = await supabase.from("stock_movements").insert({
      business_id: businessId,
      product_id: product.id,
      type: "in",
      quantity: qtyRec,
      unit_cost: row.unit_cost,
      reference_id: po.id,
      reference_type: "purchase_order",
      note: `Received against ${String(po.po_number)} (linked after receipt)`,
      created_by: userId,
    });
    if (movErr) return { error: movErr.message };
  }

  return {};
}

export async function confirmDraftPurchaseOrder(
  supabase: SupabaseClient,
  businessId: string,
  poId: string,
): Promise<{ error?: string }> {
  const { data: poLines, error: linesErr } = await supabase
    .from("purchase_order_items")
    .select("product_id, qty_ordered")
    .eq("purchase_order_id", poId);

  if (linesErr) return { error: linesErr.message };

  const unlinked = (poLines ?? []).filter(
    (l) => Number(l.qty_ordered) > 0 && !l.product_id,
  );
  if (unlinked.length > 0) {
    return {
      error:
        "Link every line to a product in your catalog before placing the order.",
    };
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({
      status: "ordered",
      ordered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", poId)
    .eq("business_id", businessId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  return {};
}

export async function cancelPurchaseOrder(
  supabase: SupabaseClient,
  businessId: string,
  poId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("purchase_orders")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", poId)
    .eq("business_id", businessId)
    .in("status", ["draft", "ordered"]);

  if (error) return { error: error.message };
  return {};
}

/**
 * Receive all remaining quantities on each line (ordered / partial → partial / received).
 */
export async function receiveRemainingStock(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
  poId: string,
): Promise<{ error?: string }> {
  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select(
      `
      id,
      status,
      po_number,
      items:purchase_order_items(*)
    `,
    )
    .eq("id", poId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (poErr || !po) return { error: poErr?.message ?? "Purchase order not found." };

  const status = po.status as PurchaseOrderStatus;
  if (!["ordered", "partial"].includes(status)) {
    return { error: "Only ordered or partially received POs can receive stock." };
  }

  const items = (po.items ?? []) as PoItemRow[];

  for (const it of items) {
    if (Number(it.qty_ordered) > 0 && !it.product_id) {
      return {
        error:
          "Every line must be linked to a catalog product before receiving.",
      };
    }
  }

  const mergedQty = new Map<string, number>();
  for (const it of items) {
    const remaining = Number(it.qty_ordered) - Number(it.qty_received);
    if (remaining > 0.0001) {
      mergedQty.set(it.id, remaining);
    }
  }

  if (mergedQty.size === 0) {
    return { error: "Nothing left to receive." };
  }

  const byId = new Map(
    items.map((i) => [
      i.id,
      {
        ...i,
        qty_ordered: Number(i.qty_ordered),
        qty_received: Number(i.qty_received),
      },
    ]),
  );

  for (const [poItemId, qtyAdd] of mergedQty) {
    if (qtyAdd <= 0) continue;
    const row = byId.get(poItemId);
    if (!row) continue;

    const nextReceived = roundMoney(row.qty_received + qtyAdd);
    if (nextReceived > row.qty_ordered + 0.0001) {
      return {
        error: `Receive quantity exceeds ordered for "${row.product_name}".`,
      };
    }

    const { error: itemErr } = await supabase
      .from("purchase_order_items")
      .update({ qty_received: nextReceived })
      .eq("id", poItemId)
      .eq("purchase_order_id", poId);

    if (itemErr) return { error: itemErr.message };

    row.qty_received = nextReceived;

    const productId = row.product_id;
    if (!productId) {
      return { error: "Line is missing a catalog link. Cannot receive stock." };
    }

    const { error: stockErr } = await supabase.rpc("increment_stock", {
      p_product_id: productId,
      p_qty: qtyAdd,
    });
    if (stockErr) return { error: stockErr.message };

    const { error: movErr } = await supabase.from("stock_movements").insert({
      business_id: businessId,
      product_id: productId,
      type: "in",
      quantity: qtyAdd,
      unit_cost: row.unit_cost,
      reference_id: poId,
      reference_type: "purchase_order",
      note: `Received against ${String(po.po_number)}`,
      created_by: userId,
    });
    if (movErr) return { error: movErr.message };
  }

  const { data: updatedItems } = await supabase
    .from("purchase_order_items")
    .select("qty_ordered, qty_received")
    .eq("purchase_order_id", poId);

  const rows = updatedItems ?? [];
  const allReceived =
    rows.length > 0 &&
    rows.every((i) => Number(i.qty_received) >= Number(i.qty_ordered) - 0.0001);
  const anyReceived = rows.some((i) => Number(i.qty_received) > 0.0001);

  const newStatus: PurchaseOrderStatus = allReceived
    ? "received"
    : anyReceived
      ? "partial"
      : "ordered";

  const { error: upErr } = await supabase
    .from("purchase_orders")
    .update({
      status: newStatus,
      received_at: allReceived ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", poId)
    .eq("business_id", businessId);

  if (upErr) return { error: upErr.message };
  return {};
}
