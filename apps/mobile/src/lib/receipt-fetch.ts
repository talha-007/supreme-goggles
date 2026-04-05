import type { SupabaseClient } from "@supabase/supabase-js";

import { formatReceiptText } from "./receipt-text";

/** Load invoice + business name and format a shareable receipt. */
export async function fetchReceiptTextForInvoice(
  supabase: SupabaseClient,
  businessId: string,
  invoiceId: string,
): Promise<{ text: string } | { error: string }> {
  const [{ data: biz }, { data: raw, error }] = await Promise.all([
    supabase.from("businesses").select("name, tax_label").eq("id", businessId).maybeSingle(),
    supabase
      .from("invoices")
      .select(
        `
        *,
        items:invoice_items(*),
        customer:customers(name)
      `,
      )
      .eq("id", invoiceId)
      .eq("business_id", businessId)
      .maybeSingle(),
  ]);

  if (error || !raw) return { error: error?.message ?? "Could not load receipt." };

  const inv = raw as Record<string, unknown>;
  const items = (inv.items ?? []) as Record<string, unknown>[];
  const cs = inv.customer as { name: string } | { name: string }[] | null | undefined;
  const customerName =
    cs == null ? null : Array.isArray(cs) ? (cs[0]?.name ?? null) : cs.name;

  const lines = items.map((it) => ({
    name: String(it.product_name),
    qty: Number(it.quantity),
    unit: String(it.unit ?? "pcs"),
    unitPrice: Number(it.unit_price),
    lineTotal: Number(it.line_total),
  }));

  const b = biz as { name?: string; tax_label?: string | null } | null;
  const text = formatReceiptText({
    businessName: String(b?.name ?? "Store"),
    invoiceNumber: String(inv.invoice_number),
    createdAt: String(inv.created_at),
    customerName,
    lines,
    subtotal: Number(inv.subtotal),
    discount: Number(inv.discount_amount),
    tax: Number(inv.tax_amount),
    total: Number(inv.total_amount),
    taxLabel: b?.tax_label ?? null,
    invoiceStatus: String(inv.status ?? ""),
  });

  return { text };
}
