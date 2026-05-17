import type { ProductRow } from "@/types/product";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

type Props = {
  items: Pick<
    ProductRow,
    "id" | "name" | "current_stock" | "reorder_level" | "unit" | "sku" | "sale_price"
  >[];
  totalCount: number;
  canEdit: boolean;
};

export async function LowStockPanel({ items, totalCount, canEdit }: Props) {
  const t = await getTranslations("lowStockPanel");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const pkr = new Intl.NumberFormat(intlLocaleTag(locale), {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-amber-50/80 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{t("title")}</h2>
          <p className="text-xs text-zinc-600">{t("subtitle")}</p>
        </div>
        {totalCount > 0 ? (
          <Link
            href="/dashboard/products?stock=low"
            className="text-sm font-medium text-amber-900 underline hover:no-underline"
          >
            {t("viewAll", { count: totalCount })}
          </Link>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">{t("empty")}</p>
      ) : (
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-4 py-2">{t("colProduct")}</th>
              <th className="px-4 py-2">{t("colSku")}</th>
              <th className="px-4 py-2 text-right">{t("colStock")}</th>
              <th className="px-4 py-2 text-right">{t("colReorder")}</th>
              <th className="px-4 py-2 text-right">{t("colSale")}</th>
              {canEdit ? <th className="px-4 py-2 text-right"> </th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50">
                <td className="px-4 py-2.5 font-medium text-zinc-900">{p.name}</td>
                <td className="px-4 py-2.5 text-zinc-600">{p.sku ?? tCommon("dash")}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-amber-800">
                  {p.current_stock} {p.unit}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600">
                  {p.reorder_level}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700">
                  {pkr.format(p.sale_price)}
                </td>
                {canEdit ? (
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/dashboard/products/${p.id}/edit`}
                      className="text-sm font-medium text-zinc-900 underline hover:no-underline"
                    >
                      {tCommon("edit")}
                    </Link>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
