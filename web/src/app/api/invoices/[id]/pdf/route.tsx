import { InvoicePdfDocument } from "@/components/invoices/invoice-pdf-document";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessInvoiceRow,
  CustomerInvoiceRow,
  InvoiceItemRow,
  InvoiceRow,
} from "@/types/invoice";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: member } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.business_id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("business_id", member.business_id)
    .maybeSingle();

  if (invErr || !invoice) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, phone, address, logo_url, currency")
    .eq("id", member.business_id)
    .single();

  if (!business) {
    return new NextResponse("Not found", { status: 404 });
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
    .eq("invoice_id", id)
    .order("id", { ascending: true });

  const buffer = await renderToBuffer(
    <InvoicePdfDocument
      invoice={invoice as InvoiceRow}
      business={business as BusinessInvoiceRow}
      customer={customer}
      items={(items ?? []) as InvoiceItemRow[]}
    />,
  );

  const filename = `${(invoice as InvoiceRow).invoice_number.replace(/[^\w.-]+/g, "_")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
