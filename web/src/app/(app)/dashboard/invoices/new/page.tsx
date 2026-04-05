import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import { requireBusinessContext, canManageInvoices } from "@/lib/auth/business-context";
import type { LineDraft } from "@/lib/invoices/actions";
import { getNewInvoiceEditorData, getPosCatalogProducts } from "@/lib/invoices/new-invoice-data";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewInvoicePage() {
  const ctx = await requireBusinessContext();
  if (!canManageInvoices(ctx.role)) {
    redirect("/dashboard/invoices");
  }

  const [{ customers, products, invoiceDefaults }, catalogRows] = await Promise.all([
    getNewInvoiceEditorData(),
    getPosCatalogProducts(),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
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
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        <InvoiceEditor
          invoiceId={null}
          initialInvoice={null}
          initialLines={[] as LineDraft[]}
          customers={customers ?? []}
          products={products ?? []}
          invoiceDefaults={invoiceDefaults}
          catalogProducts={catalogRows}
        />
      </div>
    </div>
  );
}
