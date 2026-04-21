import type { SupabaseClient } from "@supabase/supabase-js";

import { invoiceTotals, lineTotal } from "./invoice-calc";

export type DraftLineInput = {
  product_id: string | null;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
};

/**
 * Create a new draft invoice with line items (parity with web saveInvoiceDraft when invoiceId is null).
 */
export async function createInvoiceDraft(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
  input: {
    customerId: string | null;
    notes: string | null;
    discount_amount: number;
    tax_rate: number;
    lines: DraftLineInput[];
  },
): Promise<{ error?: string; invoiceId?: string }> {
  const valid = input.lines.filter(
    (l) => l.product_name.trim().length > 0 && l.quantity > 0 && l.unit_price >= 0,
  );
  if (valid.length === 0) {
    return { error: "Add at least one line item with a name, quantity, and price." };
  }

  const lineTotals = valid.map((l) =>
    lineTotal(l.quantity, l.unit_price, l.discount_pct),
  );
  const { subtotal, tax_amount, total_amount } = invoiceTotals(
    lineTotals,
    input.discount_amount,
    input.tax_rate,
  );

  const { data: num, error: nerr } = await supabase.rpc("generate_invoice_number", {
    p_business_id: businessId,
  });
  if (nerr || !num) {
    return { error: nerr?.message ?? "Could not generate invoice number." };
  }

  const { data: created, error: ierr } = await supabase
    .from("invoices")
    .insert({
      business_id: businessId,
      invoice_number: num as string,
      customer_id: input.customerId,
      status: "draft",
      subtotal,
      discount_amount: input.discount_amount,
      tax_rate: input.tax_rate,
      tax_amount,
      total_amount,
      paid_amount: 0,
      notes: input.notes?.trim() || null,
      due_date: null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (ierr || !created) {
    return { error: ierr?.message ?? "Could not create invoice." };
  }

  const invoiceId = created.id as string;
  const rows = valid.map((l, i) => ({
    invoice_id: invoiceId,
    product_id: l.product_id,
    product_name: l.product_name.trim(),
    unit: l.unit,
    quantity: l.quantity,
    unit_price: l.unit_price,
    discount_pct: l.discount_pct,
    line_total: lineTotals[i],
  }));

  const { error: itemsErr } = await supabase.from("invoice_items").insert(rows);
  if (itemsErr) {
    await supabase.from("invoices").delete().eq("id", invoiceId);
    return { error: itemsErr.message };
  }

  return { invoiceId };
}

/** Create invoice + record full cash payment in one flow (web `saveDraftAndFinalizeCash`). */
export async function createAndFinalizeCashSale(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
  input: {
    customerId: string | null;
    notes: string | null;
    discount_amount: number;
    tax_rate: number;
    lines: DraftLineInput[];
  },
): Promise<{ error?: string; invoiceId?: string }> {
  const saved = await createInvoiceDraft(supabase, businessId, userId, input);
  if (saved.error) return { error: saved.error };
  if (!saved.invoiceId) return { error: "Could not create invoice." };
  const fin = await finalizeDraftInvoiceCash(supabase, businessId, userId, saved.invoiceId);
  if (fin.error) {
    return {
      error: `${fin.error} The sale was saved as a draft — open Bill to retry or edit.`,
    };
  }
  return { invoiceId: saved.invoiceId };
}

/**
 * Finalize draft as cash sale: status → unpaid, record full payment (web finalizeInvoiceCash).
 */
export async function finalizeDraftInvoiceCash(
  supabase: SupabaseClient,
  businessId: string,
  _userId: string,
  invoiceId: string,
): Promise<{ error?: string }> {
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, status, business_id, total_amount")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr || !inv) return { error: invErr?.message ?? "Invoice not found." };
  if (inv.business_id !== businessId) return { error: "Invoice not found." };
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

  const { error: rpcErr } = await supabase.rpc("finalize_draft_invoice_cash", {
    p_invoice_id: invoiceId,
    p_amount_received: null,
  });

  if (rpcErr) return { error: rpcErr.message };
  return {};
}

/**
 * Finalize draft on credit: status → unpaid, stock moves, no payment row.
 * If `customer_id` is set, adds invoice total to that customer's outstanding balance (same as web `finalizeInvoice`).
 */
export async function finalizeDraftInvoiceCredit(
  supabase: SupabaseClient,
  businessId: string,
  _userId: string,
  invoiceId: string,
): Promise<{ error?: string }> {
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, status, business_id, total_amount")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr || !inv) return { error: invErr?.message ?? "Invoice not found." };
  if (inv.business_id !== businessId) return { error: "Invoice not found." };
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

  const { error: rpcErr } = await supabase.rpc("finalize_draft_invoice", {
    p_invoice_id: invoiceId,
  });

  if (rpcErr) return { error: rpcErr.message };
  return {};
}

/** Create invoice + finalize on credit in one flow (web `saveDraftAndFinalizeCredit`). */
export async function createAndFinalizeCreditSale(
  supabase: SupabaseClient,
  businessId: string,
  userId: string,
  input: {
    customerId: string | null;
    notes: string | null;
    discount_amount: number;
    tax_rate: number;
    lines: DraftLineInput[];
  },
): Promise<{ error?: string; invoiceId?: string }> {
  const saved = await createInvoiceDraft(supabase, businessId, userId, input);
  if (saved.error) return { error: saved.error };
  if (!saved.invoiceId) return { error: "Could not create invoice." };
  const fin = await finalizeDraftInvoiceCredit(supabase, businessId, userId, saved.invoiceId);
  if (fin.error) {
    return {
      error: `${fin.error} The sale was saved as a draft — open Bill to retry or edit.`,
    };
  }
  return { invoiceId: saved.invoiceId };
}

/**
 * Reverse a finalized sale (same RPC as web `reverseInvoice`):
 * removes payments, corrects customer balance, restores stock where applicable,
 * marks the invoice cancelled.
 */
export async function reverseInvoice(
  supabase: SupabaseClient,
  invoiceId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("reverse_invoice", {
    p_invoice_id: invoiceId,
  });
  if (error) return { error: error.message };
  return {};
}
