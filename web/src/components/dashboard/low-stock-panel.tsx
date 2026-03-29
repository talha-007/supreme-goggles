import type { ProductRow } from "@/types/product";
import Link from "next/link";

const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

type Props = {
  items: Pick<
    ProductRow,
    "id" | "name" | "current_stock" | "reorder_level" | "unit" | "sku" | "sale_price"
  >[];
  totalCount: number;
  canEdit: boolean;
};

export function LowStockPanel({ items, totalCount, canEdit }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-amber-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-amber-950/30">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Reorder soon</h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Stock at or below your reorder level — restock before you run out.
          </p>
        </div>
        {totalCount > 0 ? (
          <Link
            href="/dashboard/products?stock=low"
            className="text-sm font-medium text-amber-900 underline hover:no-underline dark:text-amber-200"
          >
            View all ({totalCount})
          </Link>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Nothing low right now. Set a reorder level on each product to get alerts here.
        </p>
      ) : (
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2 text-right">Stock</th>
              <th className="px-4 py-2 text-right">Reorder at</th>
              <th className="px-4 py-2 text-right">Sale</th>
              {canEdit ? <th className="px-4 py-2 text-right"> </th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">{p.name}</td>
                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{p.sku ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-amber-800 dark:text-amber-300">
                  {p.current_stock} {p.unit}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">
                  {p.reorder_level}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {pkr.format(p.sale_price)}
                </td>
                {canEdit ? (
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/dashboard/products/${p.id}/edit`}
                      className="text-sm font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
                    >
                      Edit
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
