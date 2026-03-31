import { BackfillPoStockButton } from "@/components/purchase-orders/backfill-po-stock-button";
import { PoDetailActions } from "@/components/purchase-orders/po-detail-actions";
import { PoLineQuickAdd } from "@/components/purchase-orders/po-line-quick-add";
import { ReceivePoForm } from "@/components/purchase-orders/receive-po-form";
import { getPurchaseOrder } from "@/lib/purchase-orders/actions";
import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import type { PurchaseOrderItemRow, PurchaseOrderStatus } from "@/types/purchase-order";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const statusStyle: Record<string, string> = {
  draft: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  ordered: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  partial: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  received: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

type ProductNested = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
} | null;

type PoItemRow = PurchaseOrderItemRow & {
  product?: ProductNested | ProductNested[];
};

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;
  const { po, error } = await getPurchaseOrder(id);

  if (error || !po) {
    notFound();
  }

  const status = po.status as PurchaseOrderStatus;
  const supplier = po.supplier as {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  const rawItems = (po.items ?? []) as PoItemRow[];
  const items: PurchaseOrderItemRow[] = rawItems.map((row) => {
    return {
      id: row.id,
      purchase_order_id: row.purchase_order_id,
      product_id: row.product_id,
      product_name: row.product_name,
      qty_ordered: Number(row.qty_ordered),
      qty_received: Number(row.qty_received),
      unit_cost: Number(row.unit_cost),
      line_total: Number(row.line_total),
      created_at: row.created_at,
    };
  });

  const hasUnlinkedLines = rawItems.some(
    (r) => !r.product_id && Number(r.qty_ordered) > 0.0001,
  );

  const canReceive = status === "ordered" || status === "partial";
  const showReceive =
    canReceive &&
    !hasUnlinkedLines &&
    items.some((i) => i.qty_received < i.qty_ordered - 0.0001);

  const needsInventorySync = rawItems.some(
    (r) => !r.product_id && Number(r.qty_received) > 0.0001,
  );

  const showQuickAdd = status !== "cancelled";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/purchase-orders"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {t("backLink")}
          </Link>
          <h1 className="mt-4 font-mono text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {po.po_number as string}
          </h1>
          <p className="mt-1 text-sm capitalize text-zinc-600 dark:text-zinc-400">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[status] ?? statusStyle.draft}`}
            >
              {tStatus(status)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {hasUnlinkedLines && status !== "cancelled" ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
              {t("unlinkedTitle")}
            </p>
            <p className="mt-1 text-sm text-amber-900/95 dark:text-amber-200/90">{t("unlinkedBody")}</p>
          </div>
        ) : null}

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t("supplierSection")}</h2>
          {supplier ? (
            <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              <p className="font-medium">{supplier.name}</p>
              {supplier.phone ? <p>{supplier.phone}</p> : null}
              {supplier.address ? <p className="whitespace-pre-wrap">{supplier.address}</p> : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t("noSupplier")}</p>
          )}
          {po.notes ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{t("notesLabel")}</span>:{" "}
              {String(po.notes)}
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2 text-left">{t("colProduct")}</th>
                <th className="px-4 py-2 text-left">{t("colCatalog")}</th>
                <th className="px-4 py-2 text-right">{t("colOrdered")}</th>
                <th className="px-4 py-2 text-right">{t("colReceived")}</th>
                <th className="px-4 py-2 text-right">{t("colUnitCost")}</th>
                <th className="px-4 py-2 text-right">{t("colLine")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rawItems.map((row) => {
                const prod = Array.isArray(row.product) ? row.product[0] : row.product;
                const quick =
                  showQuickAdd && !row.product_id && Number(row.qty_ordered) > 0.0001;
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-2 align-top">
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">{row.product_name}</span>
                      {prod ? (
                        <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                          {t("stockLabel", {
                            n: Number(prod.current_stock).toLocaleString(intlTag),
                          })}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 align-top">
                      {row.product_id ? (
                        <span className="text-xs text-emerald-700 dark:text-emerald-300">
                          {t("linkedHint")}
                        </span>
                      ) : (
                        <PoLineQuickAdd
                          poItemId={row.id}
                          unitCost={Number(row.unit_cost)}
                          show={quick}
                        />
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums align-top">
                      {Number(row.qty_ordered).toLocaleString(intlTag)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums align-top">
                      {Number(row.qty_received).toLocaleString(intlTag)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums align-top">
                      {pkr.format(Number(row.unit_cost))}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium align-top">
                      {pkr.format(Number(row.line_total))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-between border-t border-zinc-200 px-4 py-3 text-sm font-semibold dark:border-zinc-800">
            <span>{t("totalRow")}</span>
            <span className="tabular-nums">{pkr.format(Number(po.total_amount))}</span>
          </div>
        </div>

        <PoDetailActions poId={id} status={status} canConfirm={!hasUnlinkedLines} />

        {needsInventorySync ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
            <p className="text-sm font-medium text-amber-950 dark:text-amber-100">{t("needsSyncTitle")}</p>
            <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-200/90">{t("needsSyncBody")}</p>
            <p className="mt-2 text-sm">
              <Link href="/dashboard/products" className="font-medium text-amber-950 underline dark:text-amber-100">
                {t("productsLink")}
              </Link>
            </p>
            <div className="mt-3">
              <BackfillPoStockButton poId={id} />
            </div>
          </div>
        ) : null}

        {showReceive ? <ReceivePoForm poId={id} items={items} /> : null}
      </div>
    </div>
  );
}
