"use client";

import { receiveStock } from "@/lib/purchase-orders/actions";
import type { PurchaseOrderItemRow } from "@/types/purchase-order";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  poId: string;
  items: PurchaseOrderItemRow[];
  batchExpiryMode?: boolean;
};

export function ReceivePoForm({ poId, items, batchExpiryMode = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [qtyByItem, setQtyByItem] = useState<Record<string, string>>({});
  const [batchByItem, setBatchByItem] = useState<Record<string, string>>({});
  const [expiryByItem, setExpiryByItem] = useState<Record<string, string>>({});

  const itemsKey = items.map((i) => `${i.id}:${i.qty_received}`).join("|");
  useEffect(() => {
    const m: Record<string, string> = {};
    const b: Record<string, string> = {};
    const e: Record<string, string> = {};
    for (const it of items) {
      const remaining = Math.max(0, Number(it.qty_ordered) - Number(it.qty_received));
      m[it.id] = remaining > 0 ? String(remaining) : "";
      b[it.id] = "";
      e[it.id] = "";
    }
    setQtyByItem(m);
    setBatchByItem(b);
    setExpiryByItem(e);
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
        batch_no: batchExpiryMode ? String(batchByItem[it.id] ?? "").trim() || null : null,
        expiry_date: batchExpiryMode ? String(expiryByItem[it.id] ?? "").trim() || null : null,
      }))
      .filter((r) => r.qty_received > 0);

    if (rows.length === 0) {
      setError("Enter quantity to receive for at least one line.");
      return;
    }

    if (batchExpiryMode) {
      for (const r of rows) {
        if (!r.batch_no) {
          const line = items.find((i) => i.id === r.po_item_id);
          setError(`Batch number is required for "${line?.product_name ?? "line"}".`);
          return;
        }
      }
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
        {batchExpiryMode
          ? "Enter batch number and expiry for each line you receive."
          : "Enter how much you are receiving now (linked products update stock automatically)."}
      </p>
      <div className="mt-4 space-y-4">
        {items.map((it) => {
          const remaining = Math.max(0, Number(it.qty_ordered) - Number(it.qty_received));
          if (remaining <= 0.0001) {
            return (
              <div key={it.id} className="flex justify-between text-sm text-zinc-500">
                <span>{it.product_name}</span>
                <span>Fully received</span>
              </div>
            );
          }
          return (
            <div key={it.id} className="rounded-lg border border-zinc-100 p-3">
              <div className="text-sm font-medium text-zinc-800">{it.product_name}</div>
              <p className="mt-0.5 text-xs text-zinc-500">
                Remaining: {remaining.toLocaleString("en-PK", { maximumFractionDigits: 4 })}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-600">Qty</span>
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
                </label>
                {batchExpiryMode ? (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-600">Batch #</span>
                      <input
                        type="text"
                        value={batchByItem[it.id] ?? ""}
                        onChange={(e) =>
                          setBatchByItem((prev) => ({ ...prev, [it.id]: e.target.value }))
                        }
                        placeholder="e.g. B2401"
                        className="w-32 rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-600">Expiry</span>
                      <input
                        type="date"
                        value={expiryByItem[it.id] ?? ""}
                        onChange={(e) =>
                          setExpiryByItem((prev) => ({ ...prev, [it.id]: e.target.value }))
                        }
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                      />
                    </label>
                  </>
                ) : null}
              </div>
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
        {pending ? "Receiving…" : "Record receipt"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
