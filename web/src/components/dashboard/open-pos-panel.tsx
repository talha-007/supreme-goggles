import type { PurchaseOrderStatus } from "@/types/purchase-order";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

const pkrLocale = (tag: string) =>
  new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const statusStyle: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-800",
  ordered: "bg-sky-100 text-sky-900",
  partial: "bg-amber-100 text-amber-900",
};

type Row = {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  created_at: string;
};

type Props = {
  items: Row[];
};

export async function OpenPosPanel({ items }: Props) {
  const t = await getTranslations("openPosPanel");
  const tPo = await getTranslations("poStatus");
  const locale = await getLocale();
  const intlTag = intlLocaleTag(locale);
  const pkr = pkrLocale(intlTag);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{t("title")}</h2>
          <p className="text-xs text-zinc-600">{t("subtitle")}</p>
        </div>
        <Link
          href="/dashboard/purchase-orders"
          className="text-sm font-medium text-zinc-700 underline hover:no-underline"
        >
          {t("viewAll")}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">{t("empty")}</p>
      ) : (
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-4 py-2">{t("colPo")}</th>
              <th className="px-4 py-2">{t("colStatus")}</th>
              <th className="px-4 py-2 text-right">{t("colTotal")}</th>
              <th className="px-4 py-2 text-right">{t("colCreated")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {items.map((po) => (
              <tr key={po.id} className="hover:bg-zinc-50">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/dashboard/purchase-orders/${po.id}`}
                    className="font-mono font-medium text-zinc-900 hover:underline"
                  >
                    {po.po_number}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[po.status] ?? statusStyle.draft}`}
                  >
                    {tPo(
                      po.status as "draft" | "ordered" | "partial" | "received" | "cancelled",
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-900">
                  {pkr.format(Number(po.total_amount))}
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-zinc-500">
                  {new Date(po.created_at).toLocaleDateString(intlTag, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
