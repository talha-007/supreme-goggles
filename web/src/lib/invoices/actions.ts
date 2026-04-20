"use server";

import {
  requireBusinessContext,
  canManageInvoices,
} from "@/lib/auth/business-context";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { invoiceTotals, lineTotal } from "@/lib/invoices/calc";
import type { PaymentMethod } from "@/types/invoice";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type InvoiceActionState = { error?: string; invoiceId?: string };

export type LineDraft = {
  /** Set when the line is already saved in `invoice_items` (draft edit). */
  itemId?: string | null;
  product_id: string | null;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
};

export type SaveDraftInput = {
  invoiceId: string | null;
  customerId: string | null;
  restaurantTableId?: string | null;
  waiterId?: string | null;
  serviceMode?: "counter" | "dine_in" | "takeaway" | "delivery";
  restaurantOrderStatus?: "new" | "preparing" | "served" | "settled";
  discount_amount: number;
  tax_rate: number;
  notes: string | null;
  due_date: string | null;
  lines: LineDraft[];
  /** Cash tendered at counter; must be ≥ invoice total when using cash finalize. */
  cashAmountReceived?: number | null;
};

function validateLines(lines: LineDraft[]): string | null {
  const valid = lines.filter(
    (l) => l.product_name.trim().length > 0 && l.quantity > 0 && l.unit_price >= 0,
  );
  if (valid.length === 0) {
    return "Add at least one line item with a name, quantity, and price.";
  }
  return null;
}

/** Same catalog product on multiple rows (e.g. double tap before React merges) → one row + summed qty. */
function mergeDuplicateCatalogLines(lines: LineDraft[]): LineDraft[] {
  const out: LineDraft[] = [];
  for (const l of lines) {
    if (l.product_id) {
      const idx = out.findIndex((x) => x.product_id === l.product_id);
      if (idx >= 0) {
        const ex = out[idx]!;
        out[idx] = { ...ex, quantity: ex.quantity + l.quantity };
      } else {
        out.push({ ...l });
      }
    } else {
      out.push({ ...l });
    }
  }
  return out;
}

export async function saveInvoiceDraft(
  input: SaveDraftInput,
): Promise<InvoiceActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    return { error: "You do not have permission to edit invoices." };
  }

  const err = validateLines(input.lines);
  if (err) return { error: err };

  const supabase = await createClient();

  const lines = mergeDuplicateCatalogLines(input.lines);
  const lineTotals = lines.map((l) =>
    lineTotal(l.quantity, l.unit_price, l.discount_pct),
  );
  const { subtotal, tax_amount, total_amount } = invoiceTotals(
    lineTotals,
    input.discount_amount,
    input.tax_rate,
  );

  let invoiceId = input.invoiceId;

  if (invoiceId) {
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, status, business_id")
      .eq("id", invoiceId)
      .maybeSingle();

    if (!inv || inv.business_id !== ctx.businessId) {
      return { error: "Invoice not found." };
    }
    if (inv.status !== "draft") {
      return { error: "Only draft invoices can be edited." };
    }

    const { error: uerr } = await supabase
      .from("invoices")
      .update({
        customer_id: input.customerId,
        restaurant_table_id: input.restaurantTableId ?? null,
        waiter_id: input.waiterId ?? null,
        service_mode: input.serviceMode ?? "counter",
        restaurant_order_status: input.restaurantOrderStatus ?? "new",
        subtotal,
        discount_amount: input.discount_amount,
        tax_rate: input.tax_rate,
        tax_amount,
        total_amount,
        notes: input.notes?.trim() || null,
        due_date: input.due_date || null,
      })
      .eq("id", invoiceId)
      .eq("business_id", ctx.businessId);

    if (uerr) return { error: uerr.message };
  } else {
    const { data: num, error: nerr } = await supabase.rpc("generate_invoice_number", {
      p_business_id: ctx.businessId,
    });
    if (nerr || !num) {
      return { error: nerr?.message ?? "Could not generate invoice number." };
    }

    const { data: created, error: ierr } = await supabase
      .from("invoices")
      .insert({
        business_id: ctx.businessId,
        invoice_number: num as string,
        customer_id: input.customerId,
        restaurant_table_id: input.restaurantTableId ?? null,
        waiter_id: input.waiterId ?? null,
        service_mode: input.serviceMode ?? "counter",
        restaurant_order_status: input.restaurantOrderStatus ?? "new",
        status: "draft",
        subtotal,
        discount_amount: input.discount_amount,
        tax_rate: input.tax_rate,
        tax_amount,
        total_amount,
        paid_amount: 0,
        notes: input.notes?.trim() || null,
        due_date: input.due_date || null,
        created_by: ctx.userId,
      })
      .select("id")
      .single();

    if (ierr || !created) {
      return { error: ierr?.message ?? "Could not create invoice." };
    }
    invoiceId = created.id;
  }

  const linesPayload = lines.map((l, i) => ({
    product_id: l.product_id,
    product_name: l.product_name.trim(),
    unit: l.unit,
    quantity: l.quantity,
    unit_price: l.unit_price,
    discount_pct: l.discount_pct,
    line_total: lineTotals[i],
  }));

  const { error: ierr } = await supabase.rpc("replace_invoice_draft_items", {
    p_invoice_id: invoiceId,
    p_lines: linesPayload,
  });
  if (ierr) {
    return { error: ierr.message };
  }

  if (!invoiceId) {
    return { error: "Could not save invoice." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  return { invoiceId };
}

export async function deleteDraftInvoice(invoiceId: string): Promise<InvoiceActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, status, business_id")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!inv || inv.business_id !== ctx.businessId) {
    return { error: "Invoice not found." };
  }
  if (inv.status !== "draft") {
    return { error: "Only drafts can be deleted." };
  }

  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices");
  redirect("/dashboard/invoices");
}

export async function finalizeInvoice(invoiceId: string): Promise<InvoiceActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, status, business_id, total_amount")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!inv || inv.business_id !== ctx.businessId) {
    return { error: "Invoice not found." };
  }
  if (inv.status !== "draft") {
    return { error: "Invoice is not a draft." };
  }

  const { count } = await supabase
    .from("invoice_items")
    .select("id", { count: "exact", head: true })
    .eq("invoice_id", invoiceId);

  if (!count || count < 1) {
    return { error: "Add line items before finalizing." };
  }

  const { error } = await supabase.rpc("finalize_draft_invoice", {
    p_invoice_id: invoiceId,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard/products");
  redirect(`/dashboard/invoices/${invoiceId}`);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function finalizeInvoiceCash(
  invoiceId: string,
  amountReceived?: number | null,
): Promise<InvoiceActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, status, business_id, total_amount")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!inv || inv.business_id !== ctx.businessId) {
    return { error: "Invoice not found." };
  }
  if (inv.status !== "draft") {
    return { error: "Invoice is not a draft." };
  }

  const { count } = await supabase
    .from("invoice_items")
    .select("id", { count: "exact", head: true })
    .eq("invoice_id", invoiceId);

  if (!count || count < 1) {
    return { error: "Add line items before finalizing." };
  }

  const total = roundMoney(Number(inv.total_amount));

  if (amountReceived != null && amountReceived !== undefined) {
    if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
      return { error: "Enter a valid amount received." };
    }
    if (roundMoney(amountReceived) + 0.005 < total) {
      return { error: "Amount received is less than the invoice total." };
    }
  }

  const { error: rpcErr } = await supabase.rpc("finalize_draft_invoice_cash", {
    p_invoice_id: invoiceId,
    p_amount_received: amountReceived ?? null,
  });

  if (rpcErr) return { error: rpcErr.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard/products");
  redirect(`/dashboard/invoices/${invoiceId}?print=1`);
}

/** One step: save lines + finalize as unpaid (stock moves). For rush / credit sales. */
export async function saveDraftAndFinalizeCredit(
  input: SaveDraftInput,
): Promise<InvoiceActionState> {
  const saved = await saveInvoiceDraft(input);
  if (saved.error) return saved;
  if (!saved.invoiceId) return { error: "Could not save invoice." };
  return finalizeInvoice(saved.invoiceId);
}

/** One step: save lines + finalize + full cash payment (stock + paid). */
export async function saveDraftAndFinalizeCash(
  input: SaveDraftInput,
): Promise<InvoiceActionState> {
  const saved = await saveInvoiceDraft(input);
  if (saved.error) return saved;
  if (!saved.invoiceId) return { error: "Could not save invoice." };
  return finalizeInvoiceCash(saved.invoiceId, input.cashAmountReceived ?? null);
}

/** Restaurant flow: place order to kitchen as unpaid without redirecting away. */
export async function saveDraftAndSubmitToKitchen(
  input: SaveDraftInput,
): Promise<InvoiceActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    return { error: "Permission denied." };
  }
  let ensuredWaiterId = input.waiterId ?? null;
  if (!ensuredWaiterId) {
    const supabaseForWaiter = await createClient();
    const { data: myStaffRow } = await supabaseForWaiter
      .from("restaurant_staff")
      .select("id, role")
      .eq("business_id", ctx.businessId)
      .eq("user_id", ctx.userId)
      .eq("is_active", true)
      .maybeSingle();
    if (myStaffRow?.role === "waiter" && myStaffRow.id) {
      ensuredWaiterId = myStaffRow.id as string;
    }
  }
  if (!ensuredWaiterId) {
    return { error: "Waiter is required before sending to kitchen." };
  }

  let saved = await saveInvoiceDraft({
    ...input,
    waiterId: ensuredWaiterId,
    restaurantOrderStatus: "new",
  });
  const rlsInsertBlocked =
    !!saved.error &&
    saved.error.toLowerCase().includes("row-level security") &&
    saved.error.toLowerCase().includes("invoices");
  if (rlsInsertBlocked) {
    const service = createServiceRoleClient();
    const lines = mergeDuplicateCatalogLines(input.lines);
    const lineTotals = lines.map((l) =>
      lineTotal(l.quantity, l.unit_price, l.discount_pct),
    );
    const { subtotal, tax_amount, total_amount } = invoiceTotals(
      lineTotals,
      input.discount_amount,
      input.tax_rate,
    );

    let invoiceId = input.invoiceId;
    if (!invoiceId) {
      const { data: num, error: numErr } = await service.rpc("generate_invoice_number", {
        p_business_id: ctx.businessId,
      });
      if (numErr || !num) {
        return { error: numErr?.message ?? "Could not generate invoice number." };
      }
      const { data: created, error: insErr } = await service
        .from("invoices")
        .insert({
          business_id: ctx.businessId,
          invoice_number: String(num),
          customer_id: input.customerId,
          restaurant_table_id: input.restaurantTableId ?? null,
          waiter_id: ensuredWaiterId,
          service_mode: input.serviceMode ?? "counter",
          restaurant_order_status: "new",
          status: "draft",
          subtotal,
          discount_amount: input.discount_amount,
          tax_rate: input.tax_rate,
          tax_amount,
          total_amount,
          paid_amount: 0,
          notes: input.notes?.trim() || null,
          due_date: input.due_date || null,
          created_by: ctx.userId,
        })
        .select("id")
        .single();
      if (insErr || !created?.id) {
        return { error: insErr?.message ?? "Could not create invoice." };
      }
      invoiceId = created.id as string;
    } else {
      const { error: updErr } = await service
        .from("invoices")
        .update({
          customer_id: input.customerId,
          restaurant_table_id: input.restaurantTableId ?? null,
          waiter_id: ensuredWaiterId,
          service_mode: input.serviceMode ?? "counter",
          restaurant_order_status: "new",
          subtotal,
          discount_amount: input.discount_amount,
          tax_rate: input.tax_rate,
          tax_amount,
          total_amount,
          notes: input.notes?.trim() || null,
          due_date: input.due_date || null,
        })
        .eq("id", invoiceId)
        .eq("business_id", ctx.businessId)
        .eq("status", "draft");
      if (updErr) return { error: updErr.message };
    }

    if (!invoiceId) return { error: "Could not save invoice." };
    const { error: delErr } = await service.from("invoice_items").delete().eq("invoice_id", invoiceId);
    if (delErr) return { error: delErr.message };
    const payload = lines.map((l, i) => ({
      invoice_id: invoiceId,
      product_id: l.product_id,
      product_name: l.product_name.trim(),
      unit: l.unit,
      quantity: l.quantity,
      unit_price: l.unit_price,
      discount_pct: l.discount_pct,
      line_total: lineTotals[i],
    }));
    const { error: itemErr } = await service.from("invoice_items").insert(payload);
    if (itemErr) return { error: itemErr.message };
    saved = { invoiceId };
  }
  if (saved.error) return saved;
  if (!saved.invoiceId) return { error: "Could not save invoice." };

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, status, business_id")
    .eq("id", saved.invoiceId)
    .maybeSingle();
  if (!inv || inv.business_id !== ctx.businessId) {
    return { error: "Invoice not found." };
  }
  if (inv.status !== "draft") {
    return { error: "Order is already submitted." };
  }
  const { error } = await supabase.rpc("finalize_draft_invoice", {
    p_invoice_id: saved.invoiceId,
  });
  if (error) return { error: error.message };
  const { data: invRow } = await supabase
    .from("invoices")
    .select("business_id, restaurant_table_id, waiter_id")
    .eq("id", saved.invoiceId)
    .maybeSingle();
  if (invRow?.business_id) {
    const { error: roErr } = await supabase.from("restaurant_orders").upsert(
      {
        business_id: invRow.business_id,
        invoice_id: saved.invoiceId,
        table_id: invRow.restaurant_table_id ?? null,
        waiter_id: invRow.waiter_id ?? null,
        status: "new",
      },
      { onConflict: "invoice_id" },
    );
    if (roErr) return { error: roErr.message };
  }

  revalidatePath("/dashboard/restaurant/waiter-board");
  revalidatePath("/dashboard/restaurant/kitchen");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${saved.invoiceId}`);
  return { invoiceId: saved.invoiceId };
}

export async function recordPayment(
  invoiceId: string,
  amount: number,
  method: PaymentMethod,
  referenceNo: string | null,
): Promise<InvoiceActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, status, business_id, total_amount, paid_amount")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!inv || inv.business_id !== ctx.businessId) {
    return { error: "Invoice not found." };
  }
  if (inv.status !== "unpaid" && inv.status !== "partial") {
    return { error: "This invoice does not accept payments." };
  }

  const balance = roundMoney(Number(inv.total_amount) - Number(inv.paid_amount));
  if (balance <= 0.001) {
    return { error: "This invoice has no balance due." };
  }

  const received = roundMoney(amount);
  const paymentAmount = roundMoney(Math.min(received, balance));
  if (!Number.isFinite(received) || received <= 0) {
    return { error: "Enter a valid amount." };
  }
  if (paymentAmount <= 0.001) {
    return { error: "Amount received is too low." };
  }

  const paymentPayload = {
    business_id: ctx.businessId,
    invoice_id: invoiceId,
    amount: paymentAmount,
    method,
    reference_no: referenceNo?.trim() || null,
    received_by: ctx.userId,
  };
  const { error } = await supabase.from("payments").insert(paymentPayload);
  if (error) {
    const isPaymentsRls =
      error.message.toLowerCase().includes("row-level security") &&
      error.message.toLowerCase().includes("payments");
    if (!isPaymentsRls) return { error: error.message };

    // Restaurant counter staff may not have cashier role in `business_members`;
    // allow only active counter staff, then write with service role.
    const { data: staffRow } = await supabase
      .from("restaurant_staff")
      .select("role, is_active")
      .eq("business_id", ctx.businessId)
      .eq("user_id", ctx.userId)
      .eq("is_active", true)
      .maybeSingle();
    if (staffRow?.role !== "counter") {
      return { error: error.message };
    }
    const service = createServiceRoleClient();
    const { error: serviceErr } = await service.from("payments").insert(paymentPayload);
    if (serviceErr) return { error: serviceErr.message };
  }

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  return {};
}

/** Void a finalized invoice: removes payments, restores customer balance, restores inventory when the sale deducted stock (flag or sale stock movements), sets status cancelled. */
export async function reverseInvoice(invoiceId: string): Promise<InvoiceActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reverse_invoice", {
    p_invoice_id: invoiceId,
  });

  if (error) return { error: error.message };

  // Invalidate the whole dashboard tree (products, invoices, etc.) — production can cache RSC more than dev.
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  return {};
}

export async function updateRestaurantOrderStatus(
  invoiceId: string,
  nextStatus: "new" | "preparing" | "ready" | "served" | "settled",
): Promise<InvoiceActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, business_id, status, restaurant_order_status, waiter_id, restaurant_table_id")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv || inv.business_id !== ctx.businessId) {
    return { error: "Invoice not found." };
  }
  if (inv.status === "cancelled") {
    return { error: "Cancelled invoice cannot be updated." };
  }
  if (nextStatus === "settled" && inv.status !== "paid") {
    return { error: "Only fully paid invoices can be marked settled." };
  }

  const { error } = await supabase
    .from("invoices")
    .update({ restaurant_order_status: nextStatus })
    .eq("id", invoiceId)
    .eq("business_id", ctx.businessId);
  if (error) return { error: error.message };
  const { error: roErr } = await supabase
    .from("restaurant_orders")
    .upsert(
      {
        business_id: ctx.businessId,
        invoice_id: invoiceId,
        waiter_id: (inv as { waiter_id?: string | null }).waiter_id ?? null,
        table_id: (inv as { restaurant_table_id?: string | null }).restaurant_table_id ?? null,
        status: nextStatus,
      },
      { onConflict: "invoice_id" },
    );
  if (roErr) return { error: roErr.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/restaurant/waiter-board");
  revalidatePath("/dashboard/restaurant/kitchen");
  revalidatePath("/dashboard/restaurant/counter");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  return {};
}

export async function assignInvoiceWaiter(
  invoiceId: string,
  waiterId: string | null,
): Promise<InvoiceActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    return { error: "Permission denied." };
  }
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, business_id, status")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv || inv.business_id !== ctx.businessId) {
    return { error: "Invoice not found." };
  }
  if (inv.status === "cancelled") {
    return { error: "Cancelled invoice cannot be reassigned." };
  }

  const nextWaiterId = waiterId && waiterId.trim() !== "" ? waiterId : null;
  const { error } = await supabase
    .from("invoices")
    .update({ waiter_id: nextWaiterId })
    .eq("id", invoiceId)
    .eq("business_id", ctx.businessId);
  if (error) return { error: error.message };
  const { data: invRow } = await supabase
    .from("invoices")
    .select("business_id, restaurant_table_id, restaurant_order_status")
    .eq("id", invoiceId)
    .maybeSingle();
  const { error: roErr } = await supabase
    .from("restaurant_orders")
    .upsert(
      {
        business_id: invRow?.business_id ?? ctx.businessId,
        invoice_id: invoiceId,
        waiter_id: nextWaiterId,
        table_id: invRow?.restaurant_table_id ?? null,
        status: (invRow?.restaurant_order_status as "new" | "preparing" | "ready" | "served" | "settled" | null) ?? "new",
      },
      { onConflict: "invoice_id" },
    );
  if (roErr) return { error: roErr.message };

  revalidatePath("/dashboard/restaurant/waiter-board");
  revalidatePath("/dashboard/restaurant/counter");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  return {};
}

/** Remove one line from a draft invoice and recalculate totals. */
export async function deleteDraftInvoiceItem(
  invoiceId: string,
  itemId: string,
): Promise<InvoiceActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    return { error: "Permission denied." };
  }

  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!inv || inv.business_id !== ctx.businessId) {
    return { error: "Invoice not found." };
  }
  if (inv.status !== "draft") {
    return { error: "Only draft invoices can be edited." };
  }

  const { count } = await supabase
    .from("invoice_items")
    .select("id", { count: "exact", head: true })
    .eq("invoice_id", invoiceId);

  if (!count || count <= 1) {
    return { error: "Keep at least one line item, or delete the whole draft." };
  }

  const { error: derr } = await supabase
    .from("invoice_items")
    .delete()
    .eq("id", itemId)
    .eq("invoice_id", invoiceId);

  if (derr) return { error: derr.message };

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("id", { ascending: true });

  const lines: LineDraft[] = (items ?? []).map((it) => ({
    product_id: it.product_id,
    product_name: it.product_name,
    unit: it.unit,
    quantity: Number(it.quantity),
    unit_price: Number(it.unit_price),
    discount_pct: Number(it.discount_pct),
  }));

  const lineTotals = lines.map((l) =>
    lineTotal(l.quantity, l.unit_price, l.discount_pct),
  );
  const { subtotal, tax_amount, total_amount } = invoiceTotals(
    lineTotals,
    Number(inv.discount_amount),
    Number(inv.tax_rate),
  );

  const { error: uerr } = await supabase
    .from("invoices")
    .update({
      subtotal,
      tax_amount,
      total_amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("business_id", ctx.businessId);

  if (uerr) return { error: uerr.message };

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  return {};
}
