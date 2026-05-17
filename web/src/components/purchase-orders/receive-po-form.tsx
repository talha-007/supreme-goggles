"use client";

import { receiveStock } from "@/lib/purchase-orders/actions";
import type { PurchaseOrderItemRow } from "@/types/purchase-order";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  poId: string;
  items: PurchaseOrderItemRow[];
};

export function ReceivePoForm({ poId, items }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [qtyByItem, setQtyByItem] = useState<Record<string, string>>({});

  const itemsKey = items.map((i) => `${i.id}:${i.qty_received}`).join("|");
  useEffect(() => {
    const m: Record<string, string> = {};
    for (const it of items) {
      const remaining = Math.max(0, Number(it.qty_ordered) - Number(it.qty_received));
      m[it.id] = remaining > 0 ? String(remaining) : "";
    }
    setQtyByItem(m);
  }, [itemsKey, items]);

  function setQty(id: string, v: string) {
    setQtyByItem((prev) => ({ ...prev, [id]: v }));
  }

  function submit() {
    setError(null);
    const rows = items
      .map((it) => ({
        po_item_id: it.id,
        qty_received: Number(String(qtyByItem[it.id] ?? "").replace(/,/g, "")) || 0,
      }))
      .filter((r) => r.qty_received > 0);

    if (rows.length === 0) {
      setError("Enter quantity to receive for at least one line.");
      return;
    }

    startTransition(async () => {
      const res = await receiveStock(poId, { items: rows });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Receive stock</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Enter how much you are receiving now (linked products update stock automatically).
      </p>
      <div className="mt-4 space-y-3">
        {items.map((it) => {
          const remaining = Math.max(0, Number(it.qty_ordered) - Number(it.qty_received));
          if (remaining <= 0.0001) {
            return (
              <div
                key={it.id}
                className="flex justify-between text-sm text-zinc-500"
              >
                <span>{it.product_name}</span>
                <span>Fully received</span>
              </div>
            );
          }
          return (
            <div key={it.id} className="flex flex-wrap items-center gap-3">
              <span className="min-w-[140px] text-sm text-zinc-800">
                {it.product_name}
              </span>
              <span className="text-xs text-zinc-500">
                Remaining: {remaining.toLocaleString("en-PK", { maximumFractionDigits: 4 })}
              </span>
              <input
                type="number"
                min={0}
                max={remaining}
                step="0.001"
                value={qtyByItem[it.id] ?? ""}
                onChange={(e) => setQty(it.id, e.target.value)}
                placeholder="0"
                className="w-28 rounded-lg border border-zinc-200 px-2 py-1 text-sm tabular-nums"
              />
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {pending ? "Receivingâ€¦" : "Record receipt"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
