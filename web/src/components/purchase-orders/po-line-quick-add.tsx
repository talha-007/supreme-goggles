"use client";

import { createProductFromPoLine } from "@/lib/purchase-orders/actions";
import { PRODUCT_UNITS, type ProductUnit } from "@/types/product";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  poItemId: string;
  unitCost: number;
  /** Show form when line has no catalog link */
  show: boolean;
};

export function PoLineQuickAdd({ poItemId, unitCost, show }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [salePrice, setSalePrice] = useState(String(unitCost || 0));
  const [unit, setUnit] = useState<ProductUnit>("pcs");
  const [error, setError] = useState<string | null>(null);

  if (!show) {
    return <span className="text-zinc-400">—</span>;
  }

  function submit() {
    setError(null);
    const sale = Number(String(salePrice).replace(/,/g, ""));
    startTransition(async () => {
      const res = await createProductFromPoLine(poItemId, {
        sale_price: sale,
        unit,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex max-w-[280px] flex-col gap-2">
      <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
        New SKU: creates the product, links this line, then inventory can be received.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium uppercase text-zinc-500">Sale price</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="w-24 rounded border border-zinc-200 px-1.5 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium uppercase text-zinc-500">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as ProductUnit)}
            className="rounded border border-zinc-200 px-1.5 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900"
          >
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "…" : "Quick add"}
        </button>
      </div>
      {error ? (
        <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
