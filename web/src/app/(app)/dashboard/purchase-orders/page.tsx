import { requireBusinessContext, canManageProducts, guardOwnerPage } from "@/lib/auth/business-context";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { getPurchaseOrders } from "@/lib/purchase-orders/actions";
import type { PurchaseOrderRow } from "@/types/purchase-order";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const statusStyle: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-800",
  ordered: "bg-sky-100 text-sky-900",
  partial: "bg-amber-100 text-amber-900",
  received: "bg-brand-100 text-brand-900",
  cancelled: "bg-red-100 text-red-900",
};

export default async function PurchaseOrdersPage() {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
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
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{t("subtitle")}</p>
        </div>
        <Link
          href="/dashboard/purchase-orders/new"
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          {t("new")}
        </Link>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            {t("empty")}{" "}
            <Link href="/dashboard/purchase-orders/new" className="font-medium text-zinc-900 underline">
              {t("emptyCta")}
            </Link>
            .
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">{t("listColPo")}</th>
                <th className="px-4 py-3">{t("listColSupplier")}</th>
                <th className="px-4 py-3">{t("listColStatus")}</th>
                <th className="px-4 py-3 text-right">{t("listColTotal")}</th>
                <th className="px-4 py-3">{t("listColCreated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {rows.map((po) => (
                <tr key={po.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/purchase-orders/${po.id}`}
                      className="font-mono font-medium text-zinc-900 hover:underline"
                    >
                      {po.po_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {po.supplier?.name ?? "â€”"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[po.status] ?? statusStyle.draft}`}
                    >
                      {tStatus(po.status as "draft" | "ordered" | "partial" | "received" | "cancelled")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-900">
                    {pkr.format(Number(po.total_amount))}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
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
