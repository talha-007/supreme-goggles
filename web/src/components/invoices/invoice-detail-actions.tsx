"use client";

import {
  finalizeInvoice,
  finalizeInvoiceCash,
} from "@/lib/invoices/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function InvoiceFinalizeButtons({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-2">
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
          onClick={() => run(() => finalizeInvoiceCash(invoiceId))}
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
