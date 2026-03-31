import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { getPurchaseOrders } from "@/lib/purchase-orders/actions";
import type { PurchaseOrderRow } from "@/types/purchase-order";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const statusStyle: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  ordered: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  partial: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  received: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

export default async function PurchaseOrdersPage() {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    redirect("/dashboard");
  }

  const locale = await getLocale();
  const intlTag = intlLocaleTag(locale);
  const t = await getTranslations("purchaseOrders");
  const tStatus = await getTranslations("poStatus");

  const pkr = new Intl.NumberFormat(intlTag, {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const { orders, error } = await getPurchaseOrders();

  type Row = PurchaseOrderRow & {
    supplier: { id: string; name: string; phone: string | null } | null;
  };

  const rows = (orders ?? []) as Row[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("subtitle")}</p>
        </div>
        <Link
          href="/dashboard/purchase-orders/new"
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {t("new")}
        </Link>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("empty")}{" "}
            <Link href="/dashboard/purchase-orders/new" className="font-medium text-zinc-900 underline dark:text-zinc-100">
              {t("emptyCta")}
            </Link>
            .
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">{t("listColPo")}</th>
                <th className="px-4 py-3">{t("listColSupplier")}</th>
                <th className="px-4 py-3">{t("listColStatus")}</th>
                <th className="px-4 py-3 text-right">{t("listColTotal")}</th>
                <th className="px-4 py-3">{t("listColCreated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((po) => (
                <tr key={po.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/purchase-orders/${po.id}`}
                      className="font-mono font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {po.po_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {po.supplier?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[po.status] ?? statusStyle.draft}`}
                    >
                      {tStatus(po.status as "draft" | "ordered" | "partial" | "received" | "cancelled")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                    {pkr.format(Number(po.total_amount))}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
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
    </div>
  );
}
