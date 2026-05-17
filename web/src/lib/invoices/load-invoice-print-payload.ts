import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";
import type { InvoicePdfLabels } from "@/lib/i18n/pdf-invoice-labels";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessInvoiceRow,
  CustomerInvoiceRow,
  InvoiceItemRow,
  InvoiceRow,
} from "@/types/invoice";
import { cookies } from "next/headers";
import en from "../../../messages/en.json";
import ur from "../../../messages/ur.json";

export type InvoicePrintPayload = {
  invoice: InvoiceRow;
  business: BusinessInvoiceRow;
  customer: CustomerInvoiceRow | null;
  items: InvoiceItemRow[];
  labels: InvoicePdfLabels;
  locale: AppLocale;
  copyLabel: string | null;
};

export async function loadInvoicePrintPayload(
  invoiceId: string,
  copyParam: string | null,
): Promise<
  { ok: true; data: InvoicePrintPayload } | { ok: false; status: 401 | 403 | 404 }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401 };
  }

  const { data: member } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.business_id) {
    return { ok: false, status: 403 };
  }

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("business_id", member.business_id)
    .maybeSingle();

  if (invErr || !invoice) {
    return { ok: false, status: 404 };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, phone, address, logo_url, currency, tax_label")
    .eq("id", member.business_id)
    .single();

  if (!business) {
    return { ok: false, status: 404 };
  }

  let customer: CustomerInvoiceRow | null = null;
  if (invoice.customer_id) {
    const { data: c } = await supabase
      .from("customers")
      .select("id, name, phone, email, address")
      .eq("id", invoice.customer_id)
      .maybeSingle();
    customer = c as CustomerInvoiceRow | null;
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("id", { ascending: true });

  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale: AppLocale = isAppLocale(cookieLocale ?? "")
    ? (cookieLocale as AppLocale)
    : defaultLocale;
  const pdfLabels = (locale === "ur" ? ur : en).pdf as InvoicePdfLabels;
  const copyLabel =
    copyParam === "customer"
      ? pdfLabels.copyLabelCustomer
      : copyParam === "restaurant"
        ? pdfLabels.copyLabelRestaurant
        : null;

  return {
    ok: true,
    data: {
      invoice: invoice as InvoiceRow,
      business: business as BusinessInvoiceRow,
      customer,
      items: (items ?? []) as InvoiceItemRow[],
      labels: pdfLabels,
      locale,
      copyLabel,
    },
  };
}
