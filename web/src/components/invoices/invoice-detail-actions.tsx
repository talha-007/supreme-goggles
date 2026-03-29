"use client";

import {
  finalizeInvoice,
  finalizeInvoiceCash,
} from "@/lib/invoices/actions";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function InvoiceFinalizeButtons({
  invoiceId,
  totalAmount,
}: {
  invoiceId: string;
  totalAmount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cashReceived, setCashReceived] = useState(totalAmount.toFixed(2));

  useEffect(() => {
    setCashReceived(totalAmount.toFixed(2));
  }, [totalAmount]);

  const total = Math.round(totalAmount * 100) / 100;
  const receivedNum = Number(String(cashReceived).replace(/,/g, ""));
  const cashChange =
    Number.isFinite(receivedNum) && receivedNum + 0.001 >= total
      ? Math.round((receivedNum - total) * 100) / 100
      : null;

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onCashFinalize() {
    const r = Number(String(cashReceived).replace(/,/g, ""));
    if (!Number.isFinite(r) || r <= 0) {
      setError("Enter the amount received from the customer.");
      return;
    }
    if (r + 0.005 < total) {
      setError("Amount received is less than the invoice total.");
      return;
    }
    run(() => finalizeInvoiceCash(invoiceId, r));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <label className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
          Amount received (PKR) — cash
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={cashReceived}
          onChange={(e) => setCashReceived(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900 dark:border-emerald-800 dark:bg-zinc-900 dark:text-zinc-50"
        />
        {cashChange != null && cashChange > 0.005 ? (
          <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Change to return:{" "}
            {cashChange.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PKR
          </p>
        ) : (
          <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">
            Only the invoice total is recorded as payment; change is for the cashier.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => finalizeInvoice(invoiceId))}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {pending ? "Working…" : "Finalize (credit / due)"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCashFinalize}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {pending ? "Working…" : "Finalize & paid (cash)"}
        </button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Finalizing records the sale and reduces stock. Use credit when payment comes later; use cash
        for immediate payment at the counter.
      </p>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
