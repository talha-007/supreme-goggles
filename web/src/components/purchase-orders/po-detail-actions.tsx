"use client";

import {
  cancelPurchaseOrder,
  confirmPurchaseOrder,
} from "@/lib/purchase-orders/actions";
import type { PurchaseOrderStatus } from "@/types/purchase-order";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  poId: string;
  status: PurchaseOrderStatus;
  /** When false, Confirm order is disabled (unlinked lines). */
  canConfirm?: boolean;
};

export function PoDetailActions({ poId, status, canConfirm = true }: Props) {
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

  if (status === "cancelled" || status === "received") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? (
          <>
            <button
              type="button"
              disabled={pending || !canConfirm}
              title={
                !canConfirm
                  ? "Link every line to a catalog product (Quick add) before confirming"
                  : undefined
              }
              onClick={() => run(() => confirmPurchaseOrder(poId))}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              {pending ? "Working…" : "Confirm order (sent to supplier)"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => cancelPurchaseOrder(poId))}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950/40"
            >
              Cancel PO
            </button>
          </>
        ) : null}
        {status === "ordered" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => cancelPurchaseOrder(poId))}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950/40"
          >
            Cancel PO
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
