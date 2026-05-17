import { InvoiceDraftToolbar } from "@/components/invoices/invoice-draft-toolbar";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import { requireBusinessContext, canManageInvoices, guardOwnerPage } from "@/lib/auth/business-context";
import type { LineDraft } from "@/lib/invoices/actions";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceRow } from "@/types/invoice";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  if (!canManageInvoices(ctx.role)) {
    redirect("/dashboard/invoices");
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load invoice draft: ${error.message}`);
  }
  if (!invoice) {
    notFound();
  }

  if (invoice.status !== "draft") {
    redirect(`/dashboard/invoices/${id}`);
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("id", { ascending: true });

  const lines: LineDraft[] = (items ?? []).map((it) => ({
    itemId: it.id,
    product_id: it.product_id,
    product_name: it.product_name,
    unit: it.unit,
    quantity: Number(it.quantity),
    unit_price: Number(it.unit_price),
    discount_pct: Number(it.discount_pct),
  }));

  const { data: products } = await supabase
    .from("products")
    .select("id, name, unit, sale_price")
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .order("name");

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/invoices"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Back to invoices
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
            Edit draft
          </h1>
          <p className="mt-1 font-mono text-sm text-zinc-600">
            {(invoice as InvoiceRow).invoice_number}
          </p>
        </div>
        <InvoiceDraftToolbar invoiceId={id} />
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <InvoiceEditor
          invoiceId={id}
          initialInvoice={invoice as InvoiceRow}
          initialLines={lines}
          customers={customers ?? []}
          products={products ?? []}
        />
      </div>
    </div>
  );
}
