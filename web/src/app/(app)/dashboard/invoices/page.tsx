import { InvoiceReverseButton } from "@/components/invoices/invoice-reverse-button";
import { requireBusinessContext, canManageInvoices } from "@/lib/auth/business-context";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceRow } from "@/types/invoice";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

const statusStyle: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  unpaid: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  partial: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export default async function InvoicesPage() {
  const ctx = await requireBusinessContext();
  const canEdit = canManageInvoices(ctx.role);
  const supabase = await createClient();
  const t = await getTranslations("invoices");
  const tc = await getTranslations("common");
  const tStatus = await getTranslations("invoiceStatus");
  const locale = await getLocale();
  const pkr = new Intl.NumberFormat(intlLocaleTag(locale), {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const { data: rows, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      customers (
        name
      )
    `,
    )
    .eq("business_id", ctx.businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  type Row = InvoiceRow & { customers: { name: string } | null };
  const invoices = (rows ?? []) as Row[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("subtitle")}</p>
        </div>
        {canEdit ? (
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {t("new")}
          </Link>
        ) : null}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">{t("colInvoice")}</th>
              <th className="px-4 py-3">{t("colCustomer")}</th>
              <th className="px-4 py-3">{t("colStatus")}</th>
              <th className="px-4 py-3 text-right">{t("colTotal")}</th>
              <th className="px-4 py-3 text-right">{t("colPaid")}</th>
              <th className="px-4 py-3 text-right">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const cust = inv.customers?.name ?? tc("dash");
                return (
                  <tr key={inv.id} className="text-zinc-800 dark:text-zinc-200">
                    <td className="px-4 py-3 font-mono text-sm">{inv.invoice_number}</td>
                    <td className="px-4 py-3">{cust}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusStyle[inv.status] ?? statusStyle.draft}`}
                      >
                        {tStatus(inv.status as "draft" | "unpaid" | "partial" | "paid" | "cancelled")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {pkr.format(Number(inv.total_amount))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {pkr.format(Number(inv.paid_amount))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end sm:gap-3">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
                        >
                          {t("view")}
                        </Link>
                        {canEdit && inv.status === "draft" ? (
                          <Link
                            href={`/dashboard/invoices/${inv.id}/edit`}
                            className="font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
                          >
                            {tc("edit")}
                          </Link>
                        ) : null}
                        {canEdit && inv.status !== "draft" && inv.status !== "cancelled" ? (
                          <InvoiceReverseButton
                            invoiceId={inv.id}
                            compact
                            className="!px-2 !py-1 text-xs"
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
