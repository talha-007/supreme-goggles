import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import { requireBusinessContext, canManageInvoices } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { LineDraft } from "@/lib/invoices/actions";
import { getBusinessInvoiceDefaults } from "@/lib/settings/actions";
import type { InvoiceEditorDefaults } from "@/types/invoice";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewInvoicePage() {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    redirect("/dashboard/invoices");
  }

  const supabase = await createClient();

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

  const businessDefaults = await getBusinessInvoiceDefaults();
  const invoiceDefaults: InvoiceEditorDefaults | null = businessDefaults
    ? {
        defaultTaxRate: businessDefaults.default_tax_rate,
        defaultInvoiceDiscountAmount: businessDefaults.default_invoice_discount_amount,
        defaultLineDiscountPct: businessDefaults.default_line_discount_pct,
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href="/dashboard/invoices"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to invoices
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          New invoice
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Use <strong className="font-medium text-zinc-800 dark:text-zinc-200">Cash</strong> or{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">Credit</strong> to finish in one
          step. Stock updates when you complete a sale (not while a draft is open).
        </p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <InvoiceEditor
          invoiceId={null}
          initialInvoice={null}
          initialLines={[] as LineDraft[]}
          customers={customers ?? []}
          products={products ?? []}
          invoiceDefaults={invoiceDefaults}
        />
      </div>
    </div>
  );
}
