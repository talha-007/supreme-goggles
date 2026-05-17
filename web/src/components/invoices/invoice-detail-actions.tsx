"use client";

import {
  finalizeInvoice,
  finalizeInvoiceCash,
} from "@/lib/invoices/actions";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { useLocale, useTranslations } from "next-intl";
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
  const locale = useLocale();
  const tp = useTranslations("invoiceFinalize");
  const te = useTranslations("invoiceEditor");
  const tc = useTranslations("common");
  const tpm = useTranslations("invoicePayment");
  const intlTag = intlLocaleTag(locale);
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
      setError(te("errorCashAmount"));
      return;
    }
    if (r + 0.005 < total) {
      setError(te("errorCashLow"));
      return;
    }
    run(() => finalizeInvoiceCash(invoiceId, r));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-brand-200 bg-brand-50/80 px-3 py-2">
        <label className="text-xs font-medium text-brand-900">
          {tp("amountCashLabel")}
        </label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={cashReceived}
          onChange={(e) => setCashReceived(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-md border border-brand-200 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900"
        />
        {cashChange != null && cashChange > 0.005 ? (
          <p className="mt-2 text-sm font-semibold text-brand-800">
            {tp("changeDue")}{" "}
            {cashChange.toLocaleString(intlTag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
            {tpm("currencySuffix")}
          </p>
        ) : (
          <p className="mt-1 text-xs text-brand-800/80">
            {tp("hintCash")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => finalizeInvoice(invoiceId))}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
        >
          {pending ? tc("working") : tp("finalizeCredit")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCashFinalize}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {pending ? tc("working") : tp("finalizeCash")}
        </button>
      </div>
      <p className="text-xs text-zinc-500">{tp("footnote")}</p>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
