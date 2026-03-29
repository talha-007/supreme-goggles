"use client";

import { createPurchaseOrder } from "@/lib/purchase-orders/actions";
import type { POLineDraft } from "@/types/purchase-order";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type ProductOpt = { id: string; name: string; unit: string; purchase_price: number };
type SupplierOpt = { id: string; name: string; phone: string | null };

function emptyLine(): POLineDraft {
  return {
    product_id: null,
    product_name: "",
    qty_ordered: 1,
    unit_cost: 0,
  };
}

type Props = {
  products: ProductOpt[];
  suppliers: SupplierOpt[];
};

export function PoEditor({ products, suppliers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<POLineDraft[]>([emptyLine()]);

  const productById = useMemo(() => {
    const m = new Map<string, ProductOpt>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  function updateLine(i: number, patch: Partial<POLineDraft>) {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function onProductPick(i: number, productId: string) {
    if (!productId) {
      updateLine(i, { product_id: null });
      return;
    }
    const p = productById.get(productId);
    if (!p) return;
    updateLine(i, {
      product_id: p.id,
      product_name: p.name,
      unit_cost: p.purchase_price,
    });
  }

  function addRow() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeRow(i: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
  }

  const total = useMemo(
    () =>
      Math.round(
        lines.reduce((s, l) => s + l.qty_ordered * l.unit_cost, 0) * 100,
      ) / 100,
    [lines],
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createPurchaseOrder({
        supplier_id: supplierId || null,
        notes: notes.trim() || null,
        items: lines,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Supplier</label>
            <Link
              href="/dashboard/suppliers/new"
              className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              + Add supplier
            </Link>
          </div>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Optional — select later</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <div>
        <div className="mb-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Line items</h2>
            <button
              type="button"
              onClick={addRow}
              className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              + Add line
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Choose a catalog product for each line you want to receive into inventory. Custom lines
            (name only) must be linked on the PO detail page with Quick add before you can confirm or
            receive.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Name</th>
                <th className="w-28 px-3 py-2">Qty</th>
                <th className="w-32 px-3 py-2">Unit cost</th>
                <th className="w-28 px-3 py-2 text-right">Line</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">
                    <select
                      value={line.product_id ?? ""}
                      onChange={(e) => onProductPick(i, e.target.value)}
                      className="w-full max-w-[200px] rounded border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="">Custom</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={line.product_name}
                      onChange={(e) => updateLine(i, { product_name: e.target.value })}
                      className="w-full min-w-[120px] rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0.001}
                      step="0.001"
                      value={line.qty_ordered}
                      onChange={(e) =>
                        updateLine(i, { qty_ordered: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_cost}
                      onChange={(e) =>
                        updateLine(i, { unit_cost: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {(line.qty_ordered * line.unit_cost).toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Total: {total.toFixed(2)} PKR
        </p>
        <div className="flex gap-2">
          <Link
            href="/dashboard/purchase-orders"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {pending ? "Saving…" : "Create draft PO"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
