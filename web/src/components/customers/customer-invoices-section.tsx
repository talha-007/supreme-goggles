import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import type { InvoiceRow, InvoiceStatus } from "@/types/invoice";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

export type CustomerInvoiceListRow = Pick<
  InvoiceRow,
  "id" | "invoice_number" | "status" | "total_amount" | "paid_amount" | "created_at"
>;

const statusStyle: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-800",
  unpaid: "bg-amber-100 text-amber-900",
  partial: "bg-sky-100 text-sky-900",
  paid: "bg-brand-100 text-brand-900",
  cancelled: "bg-red-100 text-red-900",
};

type Props = {
  customerId: string;
  invoices: CustomerInvoiceListRow[];
  page: number;
  pageSize: number;
  totalCount: number;
};

function editCustomerHref(customerId: string, targetPage: number) {
  if (targetPage <= 1) {
    return `/dashboard/customers/${customerId}/edit`;
  }
  return `/dashboard/customers/${customerId}/edit?invoicePage=${targetPage}`;
}

export async function CustomerInvoicesSection({
  customerId,
  invoices,
  page,
  pageSize,
  totalCount,
}: Props) {
  const t = await getTranslations("customers");
  const tInv = await getTranslations("invoiceStatus");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const intlTag = intlLocaleTag(locale);
  const pkr = new Intl.NumberFormat(intlTag, {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeFrom = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, totalCount);
  const showPager = totalCount > 0 && totalPages > 1;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t("invoicesHeading")}
        </h2>
        <Link
          href="/dashboard/invoices"
          className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
        >
          {tc("viewAll")}
        </Link>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {invoices.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">{t("invoicesEmpty")}</p>
        ) : (
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">{t("invoicesColInvoice")}</th>
                <th className="px-4 py-3">{t("invoicesColDate")}</th>
                <th className="px-4 py-3">{t("invoicesColStatus")}</th>
                <th className="px-4 py-3 text-right">{t("invoicesColTotal")}</th>
                <th className="px-4 py-3 text-right">{t("invoicesColPaid")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {new Date(inv.created_at).toLocaleDateString(intlTag, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[inv.status] ?? statusStyle.draft}`}
                    >
                      {tInv(inv.status as InvoiceStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                    {pkr.format(Number(inv.total_amount))}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {pkr.format(Number(inv.paid_amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalCount > 0 ? (
          <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-600">
              {t("invoicesPaginationSummary", { from: rangeFrom, to: rangeTo, total: totalCount })}
            </p>
            {showPager ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500">
                  {t("invoicesPageStatus", { page, totalPages })}
                </span>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      href={editCustomerHref(customerId, page - 1)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      {t("invoicesPagePrev")}
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-400">
                      {t("invoicesPagePrev")}
                    </span>
                  )}
                  {page < totalPages ? (
                    <Link
                      href={editCustomerHref(customerId, page + 1)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                    >
                      {t("invoicesPageNext")}
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-400">
                      {t("invoicesPageNext")}
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
