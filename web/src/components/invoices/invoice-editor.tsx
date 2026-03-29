"use client";

import {
  saveDraftAndFinalizeCash,
  saveDraftAndFinalizeCredit,
  saveInvoiceDraft,
  type LineDraft,
  type SaveDraftInput,
} from "@/lib/invoices/actions";
import { invoiceTotals, lineTotal } from "@/lib/invoices/calc";
import type { InvoiceRow } from "@/types/invoice";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

export type ProductOption = {
  id: string;
  name: string;
  unit: string;
  sale_price: number;
};

export type CustomerOption = { id: string; name: string };

type Props = {
  invoiceId: string | null;
  initialInvoice: InvoiceRow | null;
  initialLines: LineDraft[];
  customers: CustomerOption[];
  products: ProductOption[];
};

function emptyLine(): LineDraft {
  return {
    product_id: null,
    product_name: "",
    unit: "pcs",
    quantity: 1,
    unit_price: 0,
    discount_pct: 0,
  };
}

/** `YYYY-MM-DD` in the browser's local calendar (matches `<input type="date">`). */
function todayLocalIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function InvoiceEditor({
  invoiceId: initialInvoiceId,
  initialInvoice,
  initialLines,
  customers,
  products,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(initialInvoiceId);
  const [customerId, setCustomerId] = useState<string>(
    initialInvoice?.customer_id ?? "",
  );
  const [discountAmount, setDiscountAmount] = useState(
    String(initialInvoice?.discount_amount ?? 0),
  );
  const [taxRate, setTaxRate] = useState(String(initialInvoice?.tax_rate ?? 0));
  const [notes, setNotes] = useState(initialInvoice?.notes ?? "");
  const [dueDate, setDueDate] = useState(
    initialInvoice?.due_date
      ? initialInvoice.due_date.slice(0, 10)
      : todayLocalIsoDate(),
  );
  const [lines, setLines] = useState<LineDraft[]>(
    initialLines.length > 0 ? initialLines : [emptyLine()],
  );
  const [cashReceived, setCashReceived] = useState("");

  const productById = useMemo(() => {
    const m = new Map<string, ProductOption>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  function updateLine(i: number, patch: Partial<LineDraft>) {
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
      unit: p.unit,
      unit_price: p.sale_price,
    });
  }

  function addRow() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeRow(i: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
  }

  const previewTotals = useMemo(() => {
    const lineTotals = lines.map((l) =>
      lineTotal(l.quantity, l.unit_price, l.discount_pct),
    );
    const disc = Number(String(discountAmount).replace(/,/g, "")) || 0;
    const taxPct = Number(String(taxRate).replace(/,/g, "")) || 0;
    const { subtotal, tax_amount, total_amount } = invoiceTotals(
      lineTotals,
      disc,
      taxPct,
    );
    return { subtotal, tax: tax_amount, total: total_amount };
  }, [lines, discountAmount, taxRate]);

  useEffect(() => {
    setCashReceived(previewTotals.total.toFixed(2));
  }, [previewTotals.total]);

  const cashChange = useMemo(() => {
    const total = previewTotals.total;
    const r = Number(String(cashReceived).replace(/,/g, ""));
    if (!Number.isFinite(r) || r + 0.001 < total) return null;
    return Math.round((r - total) * 100) / 100;
  }, [cashReceived, previewTotals.total]);

  function buildInput(): SaveDraftInput {
    const disc = Number(discountAmount.replace(/,/g, "")) || 0;
    const tax = Number(taxRate.replace(/,/g, "")) || 0;
    const received = Number(String(cashReceived).replace(/,/g, ""));
    return {
      invoiceId,
      customerId: customerId || null,
      discount_amount: disc,
      tax_rate: tax,
      notes: notes.trim() || null,
      due_date: dueDate || null,
      lines,
      cashAmountReceived: Number.isFinite(received) ? received : null,
    };
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveInvoiceDraft(buildInput());
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.invoiceId) {
        setInvoiceId(res.invoiceId);
        if (!initialInvoiceId) {
          router.push(`/dashboard/invoices/${res.invoiceId}/edit`);
          router.refresh();
        } else {
          router.refresh();
        }
      }
    });
  }

  function chargeCash() {
    setError(null);
    const total = previewTotals.total;
    const received = Number(String(cashReceived).replace(/,/g, ""));
    if (!Number.isFinite(received) || received <= 0) {
      setError("Enter the amount received from the customer.");
      return;
    }
    if (received + 0.005 < total) {
      setError("Amount received is less than the invoice total.");
      return;
    }
    startTransition(async () => {
      const res = await saveDraftAndFinalizeCash(buildInput());
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.invoiceId) {
        setInvoiceId(res.invoiceId);
      }
    });
  }

  function chargeCredit() {
    setError(null);
    startTransition(async () => {
      const res = await saveDraftAndFinalizeCredit(buildInput());
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.invoiceId) {
        setInvoiceId(res.invoiceId);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Customer
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Walk-in (no customer)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Due date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Invoice discount (PKR)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tax rate (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Line items
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
          >
            + Add line
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Name</th>
                <th className="w-20 px-3 py-2">Unit</th>
                <th className="w-24 px-3 py-2">Qty</th>
                <th className="w-28 px-3 py-2">Price</th>
                <th className="w-20 px-3 py-2">Disc %</th>
                <th className="w-24 px-3 py-2 text-right">Line</th>
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
                      className="w-full max-w-[180px] rounded border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="">Custom / manual</option>
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
                      value={line.unit}
                      onChange={(e) => updateLine(i, { unit: e.target.value })}
                      className="w-full rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(i, { quantity: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) =>
                        updateLine(i, { unit_price: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={line.discount_pct}
                      onChange={(e) =>
                        updateLine(i, { discount_pct: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {lineTotal(
                      line.quantity,
                      line.unit_price,
                      line.discount_pct,
                    ).toFixed(2)}
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
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="mr-4">Subtotal: {previewTotals.subtotal.toFixed(2)}</span>
          <span className="mr-4">Tax: {previewTotals.tax.toFixed(2)}</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Total: {previewTotals.total.toFixed(2)} PKR
          </span>
        </div>
        <div className="flex w-full flex-col gap-3 sm:max-w-md sm:items-end sm:ml-auto">
          <div className="w-full rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <label className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
              Amount received (PKR)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="mt-1 w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900 dark:border-emerald-800 dark:bg-zinc-900 dark:text-zinc-50"
            />
            {cashChange != null && cashChange > 0.005 ? (
              <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                Change to return: {cashChange.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                PKR
              </p>
            ) : (
              <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
                Enter cash tendered; only the invoice total is recorded as payment.
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={chargeCash}
              disabled={pending}
              className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              {pending ? "Working…" : "Cash — paid now"}
            </button>
            <button
              type="button"
              onClick={chargeCredit}
              disabled={pending}
              className="rounded-lg border border-amber-600 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
            >
              {pending ? "Working…" : "Credit — pay later"}
            </button>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
            <Link
              href="/dashboard/invoices"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {pending ? "Saving…" : "Save draft only"}
            </button>
          </div>
          <p className="max-w-md text-right text-xs text-zinc-500 dark:text-zinc-400">
            Use <strong className="font-medium text-zinc-700 dark:text-zinc-300">Cash</strong> or{" "}
            <strong className="font-medium text-zinc-700 dark:text-zinc-300">Credit</strong> to
            finish in one step. Use <strong className="font-medium">Save draft only</strong> to pause
            (e.g. customer stepped away).
          </p>
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
