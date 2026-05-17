"use client";

import { deleteDraftInvoice } from "@/lib/invoices/actions";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function InvoiceDraftToolbar({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const td = useTranslations("invoiceDraftToolbar");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!confirm(td("deleteConfirm"))) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteDraftInvoice(invoiceId);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/dashboard/invoices");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        {pending ? td("deleting") : td("delete")}
      </button>
      {error ? (
        <span className="text-sm text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
