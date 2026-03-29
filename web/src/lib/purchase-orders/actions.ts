"use server";

import {
  requireBusinessContext,
  canManageProducts,
} from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  POFormValues,
  PurchaseOrderItemRow,
  PurchaseOrderStatus,
  ReceiveItemsFormValues,
} from "@/types/purchase-order";
import type { ProductUnit } from "@/types/product";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type POActionState = { error?: string; poId?: string };

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Legacy backfill only: unique name match. */
async function resolveProductIdByName(
  supabase: SupabaseClient,
  businessId: string,
  productName: string,
): Promise<string | null> {
  const target = productName.trim().toLowerCase();
  if (!target) return null;

  const { data, error } = await supabase
    .from("products")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (error || !data?.length) return null;

  const matches = data.filter((p) => p.name.trim().toLowerCase() === target);
  if (matches.length !== 1) return null;
  return matches[0].id;
}

export async function listSuppliers() {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id, name, phone")
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .order("name");
  if (error) return { error: error.message, suppliers: [] as { id: string; name: string; phone: string | null }[] };
  return { suppliers: data ?? [] };
}

export type QuickAddProductInput = {
  sale_price: number;
  unit?: ProductUnit;
};

/** Create catalog product from PO line, link line, apply stock if already received. */
export async function createProductFromPoLine(
  poItemId: string,
  input: QuickAddProductInput,
): Promise<POActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "Permission denied." };
  }

  const sale = roundMoney(input.sale_price);
  if (!Number.isFinite(sale) || sale < 0) {
    return { error: "Enter a valid sale price." };
  }

  const unit = (input.unit ?? "pcs") as ProductUnit;
  const supabase = await createClient();

  const { data: row, error: rowErr } = await supabase
    .from("purchase_order_items")
    .select("id, product_id, product_name, qty_ordered, qty_received, unit_cost, purchase_order_id")
    .eq("id", poItemId)
    .maybeSingle();

  if (rowErr || !row) return { error: "Line not found." };
  if (row.product_id) return { error: "This line is already linked to a product." };

  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select("id, business_id, status, po_number")
    .eq("id", row.purchase_order_id)
    .eq("business_id", ctx.businessId)
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
      business_id: ctx.businessId,
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
      created_by: ctx.userId,
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
      business_id: ctx.businessId,
      product_id: product.id,
      type: "in",
      quantity: qtyRec,
      unit_cost: row.unit_cost,
      reference_id: po.id,
      reference_type: "purchase_order",
      note: `Received against ${String(po.po_number)} (linked after receipt)`,
      created_by: ctx.userId,
    });
    if (movErr) return { error: movErr.message };
  }

  revalidatePath(`/dashboard/purchase-orders/${po.id}`);
  revalidatePath("/dashboard/purchase-orders");
  revalidatePath("/dashboard/products");
  return {};
}

export async function getPurchaseOrders(status?: string) {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();

  let query = supabase
    .from("purchase_orders")
    .select(
      `
      *,
      supplier:suppliers(id, name, phone)
    `,
    )
    .eq("business_id", ctx.businessId)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return { error: error.message, orders: [] };
  return { orders: data ?? [] };
}

export async function getPurchaseOrder(id: string) {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("purchase_orders")
    .select(
      `
      *,
      supplier:suppliers(id, name, phone, email, address),
      items:purchase_order_items(
        *,
        product:products(id, name, unit, current_stock)
      )
    `,
    )
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (error) return { error: error.message, po: null };
  if (!data) return { error: "Not found", po: null };
  return { po: data };
}

export async function createPurchaseOrder(values: POFormValues): Promise<POActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "You do not have permission to create purchase orders." };
  }

  const valid = values.items.filter(
    (i) => i.product_name.trim().length > 0 && i.qty_ordered > 0 && i.unit_cost >= 0,
  );
  if (valid.length === 0) {
    return { error: "Add at least one line with product name, quantity, and cost." };
  }

  const supabase = await createClient();

  const { data: poNum, error: numErr } = await supabase.rpc("generate_po_number", {
    p_business_id: ctx.businessId,
  });
  if (numErr || !poNum) {
    return { error: numErr?.message ?? "Could not generate PO number." };
  }

  const totalAmount = roundMoney(
    valid.reduce((sum, item) => sum + item.qty_ordered * item.unit_cost, 0),
  );

  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      business_id: ctx.businessId,
      supplier_id: values.supplier_id || null,
      po_number: poNum as string,
      status: "draft" as PurchaseOrderStatus,
      total_amount: totalAmount,
      notes: values.notes?.trim() || null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (poError || !po) {
    return { error: poError?.message ?? "Could not create purchase order." };
  }

  const itemRows = valid.map((item) => ({
    purchase_order_id: po.id,
    product_id: item.product_id || null,
    product_name: item.product_name.trim(),
    qty_ordered: item.qty_ordered,
    qty_received: 0,
    unit_cost: item.unit_cost,
    line_total: roundMoney(item.qty_ordered * item.unit_cost),
  }));

  const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemRows);

  if (itemsError) {
    await supabase.from("purchase_orders").delete().eq("id", po.id);
    return { error: itemsError.message };
  }

  revalidatePath("/dashboard/purchase-orders");
  redirect(`/dashboard/purchase-orders/${po.id}`);
}

export async function confirmPurchaseOrder(id: string): Promise<POActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();

  const { data: poLines, error: linesErr } = await supabase
    .from("purchase_order_items")
    .select("product_id, qty_ordered")
    .eq("purchase_order_id", id);

  if (linesErr) return { error: linesErr.message };

  const unlinked = (poLines ?? []).filter(
    (l) => Number(l.qty_ordered) > 0 && !l.product_id,
  );
  if (unlinked.length > 0) {
    return {
      error:
        "Link every line to a catalog product before confirming. Use Quick add on each line or pick a product when creating the PO.",
    };
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update({
      status: "ordered",
      ordered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath("/dashboard/purchase-orders");
  revalidatePath(`/dashboard/purchase-orders/${id}`);
  return {};
}

export async function cancelPurchaseOrder(id: string): Promise<POActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .in("status", ["draft", "ordered"]);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/purchase-orders");
  revalidatePath(`/dashboard/purchase-orders/${id}`);
  return {};
}

export async function receiveStock(poId: string, values: ReceiveItemsFormValues): Promise<POActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();

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
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (poErr || !po) return { error: poErr?.message ?? "Purchase order not found." };

  const status = po.status as PurchaseOrderStatus;
  if (!["ordered", "partial"].includes(status)) {
    return { error: "Only ordered or partially received POs can receive stock." };
  }

  const items = (po.items ?? []) as PurchaseOrderItemRow[];

  for (const it of items) {
    if (Number(it.qty_ordered) > 0 && !it.product_id) {
      return {
        error:
          "Every line must be linked to a catalog product before receiving. Use Quick add on the PO page first.",
      };
    }
  }

  const byId = new Map(items.map((i) => [i.id, { ...i }]));

  const mergedQty = new Map<string, number>();
  for (const recv of values.items) {
    if (recv.qty_received <= 0) continue;
    mergedQty.set(
      recv.po_item_id,
      (mergedQty.get(recv.po_item_id) ?? 0) + recv.qty_received,
    );
  }

  for (const [poItemId, qtyAdd] of mergedQty) {
    if (qtyAdd <= 0) continue;
    const recv = { po_item_id: poItemId, qty_received: qtyAdd };
    const row = byId.get(recv.po_item_id);
    if (!row) continue;

    const nextReceived = roundMoney(row.qty_received + recv.qty_received);
    if (nextReceived > row.qty_ordered + 0.0001) {
      return {
        error: `Receive quantity exceeds ordered for "${row.product_name}".`,
      };
    }

    const { error: itemErr } = await supabase
      .from("purchase_order_items")
      .update({ qty_received: nextReceived })
      .eq("id", recv.po_item_id)
      .eq("purchase_order_id", poId);

    if (itemErr) return { error: itemErr.message };

    row.qty_received = nextReceived;

    const productId = row.product_id;
    if (!productId) {
      return { error: "Line is missing a catalog link. Cannot receive stock." };
    }

    const { error: stockErr } = await supabase.rpc("increment_stock", {
      p_product_id: productId,
      p_qty: recv.qty_received,
    });
    if (stockErr) return { error: stockErr.message };

    const { error: movErr } = await supabase.from("stock_movements").insert({
      business_id: ctx.businessId,
      product_id: productId,
      type: "in",
      quantity: recv.qty_received,
      unit_cost: row.unit_cost,
      reference_id: poId,
      reference_type: "purchase_order",
      note: `Received against ${po.po_number as string}`,
      created_by: ctx.userId,
    });
    if (movErr) return { error: movErr.message };
  }

  const { data: updatedItems } = await supabase
    .from("purchase_order_items")
    .select("qty_ordered, qty_received")
    .eq("purchase_order_id", poId);

  const rows = updatedItems ?? [];
  const allReceived = rows.length > 0 && rows.every((i) => Number(i.qty_received) >= Number(i.qty_ordered) - 0.0001);
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
    .eq("business_id", ctx.businessId);

  if (upErr) return { error: upErr.message };

  revalidatePath(`/dashboard/purchase-orders/${poId}`);
  revalidatePath("/dashboard/purchase-orders");
  revalidatePath("/dashboard/products");
  return {};
}

/**
 * For POs received before product linking: match line name to a unique catalog product
 * and apply qty_received to stock once.
 */
export async function backfillPurchaseOrderStock(poId: string): Promise<POActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();
  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select(
      `
      id,
      status,
      po_number,
      items:purchase_order_items(id, product_id, product_name, qty_received, unit_cost)
    `,
    )
    .eq("id", poId)
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (poErr || !po) return { error: "Purchase order not found." };

  const st = po.status as PurchaseOrderStatus;
  if (!["received", "partial"].includes(st)) {
    return { error: "Only received or partially received orders can sync inventory." };
  }

  const rawItems = (po.items ?? []) as Pick<
    PurchaseOrderItemRow,
    "id" | "product_id" | "product_name" | "qty_received" | "unit_cost"
  >[];

  let applied = 0;
  for (const item of rawItems) {
    if (item.product_id || Number(item.qty_received) <= 0) continue;

    const resolved = await resolveProductIdByName(supabase, ctx.businessId, item.product_name);
    if (!resolved) continue;

    const qty = Number(item.qty_received);
    const { error: rpcErr } = await supabase.rpc("increment_stock", {
      p_product_id: resolved,
      p_qty: qty,
    });
    if (rpcErr) return { error: rpcErr.message };

    const { error: upErr } = await supabase
      .from("purchase_order_items")
      .update({ product_id: resolved })
      .eq("id", item.id);
    if (upErr) return { error: upErr.message };

    const { error: movErr } = await supabase.from("stock_movements").insert({
      business_id: ctx.businessId,
      product_id: resolved,
      type: "in",
      quantity: qty,
      unit_cost: item.unit_cost,
      reference_id: poId,
      reference_type: "purchase_order",
      note: `Synced from ${String(po.po_number)}`,
      created_by: ctx.userId,
    });
    if (movErr) return { error: movErr.message };
    applied += 1;
  }

  if (applied === 0) {
    return {
      error:
        "No lines could be matched. Ensure the line name exactly matches one active product name (or pick the product from the dropdown on new POs).",
    };
  }

  revalidatePath(`/dashboard/purchase-orders/${poId}`);
  revalidatePath("/dashboard/purchase-orders");
  revalidatePath("/dashboard/products");
  return {};
}
