"use server";

import {
  requireBusinessContext,
  canManageInvoices,
} from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import { invoiceTotals, lineTotal } from "@/lib/invoices/calc";
import type { PaymentMethod } from "@/types/invoice";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type InvoiceActionState = { error?: string; invoiceId?: string };

export type LineDraft = {
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

  const lineTotals = input.lines.map((l) =>
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

  await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);

  const rows = input.lines.map((l, i) => ({
    invoice_id: invoiceId,
    product_id: l.product_id,
    product_name: l.product_name.trim(),
    unit: l.unit,
    quantity: l.quantity,
    unit_price: l.unit_price,
    discount_pct: l.discount_pct,
    line_total: lineTotals[i],
  }));

  const { error: ierr } = await supabase.from("invoice_items").insert(rows);
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

  const { error } = await supabase
    .from("invoices")
    .update({ status: "unpaid" })
    .eq("id", invoiceId)
    .eq("business_id", ctx.businessId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
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

  const { error: uerr } = await supabase
    .from("invoices")
    .update({ status: "unpaid" })
    .eq("id", invoiceId)
    .eq("business_id", ctx.businessId);

  if (uerr) return { error: uerr.message };

  const { error: perr } = await supabase.from("payments").insert({
    business_id: ctx.businessId,
    invoice_id: invoiceId,
    amount: total,
    method: "cash",
    received_by: ctx.userId,
  });

  if (perr) {
    return { error: perr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
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

  const { error } = await supabase.from("payments").insert({
    business_id: ctx.businessId,
    invoice_id: invoiceId,
    amount: paymentAmount,
    method,
    reference_no: referenceNo?.trim() || null,
    received_by: ctx.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  return {};
}
