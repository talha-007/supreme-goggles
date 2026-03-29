import { InvoiceFinalizeButtons } from "@/components/invoices/invoice-detail-actions";
import { InvoicePaymentForm } from "@/components/invoices/invoice-payment-form";
import { requireBusinessContext, canManageInvoices } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceItemRow, InvoiceRow } from "@/types/invoice";
import Link from "next/link";
import { notFound } from "next/navigation";

const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireBusinessContext();
  const canEdit = canManageInvoices(ctx.role);
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      customers (
        name,
        phone,
        address
      )
    `,
    )
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .maybeSingle();

  if (error || !invoice) {
    notFound();
  }

  const inv = invoice as InvoiceRow & {
    customers: { name: string; phone: string | null; address: string | null } | null;
  };

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id)
    .order("id", { ascending: true });

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", id)
    .order("paid_at", { ascending: false });

  const total = Number(inv.total_amount);
  const paid = Number(inv.paid_amount);
  const balance = Math.round((total - paid) * 100) / 100;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard/invoices"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Invoices
          </Link>
          <h1 className="mt-4 font-mono text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {inv.invoice_number}
          </h1>
          <p className="mt-1 text-sm capitalize text-zinc-600 dark:text-zinc-400">Status: {inv.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && inv.status !== "draft" ? (
            <Link
              href="/dashboard/invoices/new"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              New invoice
            </Link>
          ) : null}
          <a
            href={`/api/invoices/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            View / print PDF
          </a>
          {canEdit && inv.status === "draft" ? (
            <Link
              href={`/dashboard/invoices/${id}/edit`}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Edit draft
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Customer</h2>
            {inv.customers ? (
              <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                <p className="font-medium">{inv.customers.name}</p>
                {inv.customers.phone ? <p>{inv.customers.phone}</p> : null}
                {inv.customers.address ? <p className="whitespace-pre-wrap">{inv.customers.address}</p> : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Walk-in</p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(items ?? []).map((it) => {
                  const row = it as InvoiceItemRow;
                  return (
                    <tr key={row.id}>
                      <td className="px-4 py-3">
                        <span className="font-medium">{row.product_name}</span>
                        <span className="ml-2 text-xs text-zinc-500">{row.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {pkr.format(Number(row.unit_price))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {pkr.format(Number(row.line_total))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {inv.notes ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Notes</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {inv.notes}
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
              <span className="tabular-nums">{pkr.format(Number(inv.subtotal))}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Discount</span>
              <span className="tabular-nums">{pkr.format(Number(inv.discount_amount))}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">
                Tax ({Number(inv.tax_rate).toFixed(2)}%)
              </span>
              <span className="tabular-nums">{pkr.format(Number(inv.tax_amount))}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3 text-base font-semibold dark:border-zinc-800">
              <span>Total</span>
              <span className="tabular-nums">{pkr.format(total)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Paid</span>
              <span className="tabular-nums">{pkr.format(paid)}</span>
            </div>
            {balance > 0.001 ? (
              <div className="mt-2 flex justify-between text-sm font-medium text-amber-800 dark:text-amber-200">
                <span>Balance</span>
                <span className="tabular-nums">{pkr.format(balance)}</span>
              </div>
            ) : null}
          </div>

          {canEdit && inv.status === "draft" ? (
            <InvoiceFinalizeButtons invoiceId={id} totalAmount={total} />
          ) : null}

          {canEdit && (inv.status === "unpaid" || inv.status === "partial") && balance > 0.001 ? (
            <InvoicePaymentForm invoiceId={id} balanceDue={balance} />
          ) : null}

          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Payments</h3>
            {(payments ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No payments recorded.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {(payments ?? []).map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800"
                  >
                    <span className="capitalize text-zinc-600 dark:text-zinc-400">
                      {p.method as string}
                    </span>
                    <span className="tabular-nums font-medium">
                      {pkr.format(Number(p.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
