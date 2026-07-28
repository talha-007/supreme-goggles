"use client";

import { addProductBatch } from "@/lib/product-batches/actions";
import type { ProductBatchRow } from "@/types/product-batch";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

type Props = {
  productId: string;
  initialBatches: ProductBatchRow[];
  batchExpiryMode: boolean;
};

export function ProductBatchesPanel({ productId, initialBatches, batchExpiryMode }: Props) {
  const t = useTranslations("productBatches");
  const router = useRouter();
  const [batches, setBatches] = useState(initialBatches);
  useEffect(() => {
    setBatches(initialBatches);
  }, [initialBatches]);
  const [state, formAction, pending] = useActionState(
    addProductBatch.bind(null, productId),
    {},
  );
  const [showForm, setShowForm] = useState(false);

  if (!batchExpiryMode) return null;

  return (
    <div className="mt-8 border-t border-zinc-200 pt-8">
      <h2 className="text-lg font-semibold text-zinc-900">{t("title")}</h2>
      <p className="mt-1 text-sm text-zinc-600">{t("subtitle")}</p>

      {batches.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">{t("empty")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-3 py-2">{t("colBatch")}</th>
                <th className="px-3 py-2">{t("colExpiry")}</th>
                <th className="px-3 py-2 text-right">{t("colQty")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {batches.map((b) => (
                <tr key={b.id} className="text-zinc-800">
                  <td className="px-3 py-2 font-mono text-xs">{b.batch_no}</td>
                  <td className="px-3 py-2 tabular-nums">{b.expiry_date ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.qty_on_hand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <form
          action={formAction}
          className="mt-4 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2"
          onSubmit={() => {
            setTimeout(() => router.refresh(), 300);
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="batch_no" className="text-sm font-medium text-zinc-700">
              {t("batchNo")}
            </label>
            <input
              id="batch_no"
              name="batch_no"
              required
              placeholder={t("batchNoHint")}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="batch_expiry_date" className="text-sm font-medium text-zinc-700">
              {t("expiryDate")}
            </label>
            <input
              id="batch_expiry_date"
              name="expiry_date"
              type="date"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="batch_qty" className="text-sm font-medium text-zinc-700">
              {t("qty")}
            </label>
            <input
              id="batch_qty"
              name="qty"
              type="number"
              min={0.001}
              step="0.001"
              required
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="batch_unit_cost" className="text-sm font-medium text-zinc-700">
              {t("unitCost")}
            </label>
            <input
              id="batch_unit_cost"
              name="unit_cost"
              type="number"
              min={0}
              step="0.01"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums"
            />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-1">
            <label htmlFor="batch_notes" className="text-sm font-medium text-zinc-700">
              {t("notes")}
            </label>
            <input
              id="batch_notes"
              name="notes"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          {state.error ? <p className="sm:col-span-2 text-sm text-red-600">{state.error}</p> : null}
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {pending ? t("saving") : t("addBatch")}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
        >
          {t("addBatch")}
        </button>
      )}
    </div>
  );
}
