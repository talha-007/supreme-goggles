"use client";

import { deleteDraftInvoice } from "@/lib/invoices/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function InvoiceDraftToolbar({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!confirm("Delete this draft invoice?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteDraftInvoice(invoiceId);
      if (res.error) {
        setError(res.error);
        return;
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
      >
        {pending ? "Deleting…" : "Delete draft"}
      </button>
      {error ? (
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      ) : null}
    </div>
  );
}
