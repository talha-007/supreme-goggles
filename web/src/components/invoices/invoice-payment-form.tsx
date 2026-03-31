"use client";

import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { recordPayment } from "@/lib/invoices/actions";
import type { PaymentMethod } from "@/types/invoice";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

const METHOD_VALUES: PaymentMethod[] = [
  "cash",
  "bank_transfer",
  "jazzcash",
  "easypaisa",
  "cheque",
  "credit",
];

type Props = {
  invoiceId: string;
  balanceDue: number;
};

export function InvoicePaymentForm({ invoiceId, balanceDue }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const tp = useTranslations("invoicePayment");
  const intlTag = intlLocaleTag(locale);
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
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{tp("title")}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {tp("amountReceived")}
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
              {tp("appliedToInvoice")}{" "}
              {applied.toLocaleString(intlTag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              {tp("currencySuffix")}
            </p>
          ) : null}
          {changeDue != null && changeDue > 0.005 ? (
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              {tp("changeDue")}{" "}
              {changeDue.toLocaleString(intlTag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              {tp("currencySuffix")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{tp("method")}</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {METHOD_VALUES.map((m) => (
              <option key={m} value={m}>
                {tp(`methods.${m}` as Parameters<typeof tp>[0])}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {tp("referenceLabel")}
          </label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={tp("referencePlaceholder")}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending || balanceDue <= 0.001}
        className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? tp("recording") : tp("submit")}
      </button>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </form>
  );
}
