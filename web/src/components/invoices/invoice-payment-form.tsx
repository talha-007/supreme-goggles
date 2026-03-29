"use client";

import { recordPayment } from "@/lib/invoices/actions";
import type { PaymentMethod } from "@/types/invoice";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
  { value: "cheque", label: "Cheque" },
  { value: "credit", label: "Credit / other" },
];

type Props = {
  invoiceId: string;
  balanceDue: number;
};

export function InvoicePaymentForm({ invoiceId, balanceDue }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(balanceDue.toFixed(2)));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmount(balanceDue.toFixed(2));
  }, [balanceDue]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(amount.replace(/,/g, ""));
    startTransition(async () => {
      const res = await recordPayment(
        invoiceId,
        n,
        method,
        reference.trim() || null,
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      setAmount(String(balanceDue.toFixed(2)));
      setReference("");
    });
  }

  const receivedNum = Number(String(amount).replace(/,/g, ""));
  const applied = useMemo(() => {
    if (!Number.isFinite(receivedNum) || receivedNum <= 0) return 0;
    return Math.min(receivedNum, balanceDue);
  }, [receivedNum, balanceDue]);
  const changeDue =
    method === "cash" && Number.isFinite(receivedNum) && receivedNum > balanceDue + 0.005
      ? Math.round((receivedNum - balanceDue) * 100) / 100
      : null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Record payment</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Amount received (PKR)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          {Number.isFinite(receivedNum) && receivedNum > 0 && applied > 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Applied to invoice: {applied.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              PKR
            </p>
          ) : null}
          {changeDue != null && changeDue > 0.005 ? (
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              Change to return:{" "}
              {changeDue.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PKR
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Reference (optional)
          </label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Txn ID, cheque #"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending || balanceDue <= 0.001}
        className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Recording…" : "Record payment"}
      </button>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </form>
  );
}
