"use client";

import { backfillPurchaseOrderStock } from "@/lib/purchase-orders/actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function BackfillPoStockButton({ poId }: { poId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErr(null);
          startTransition(async () => {
            const res = await backfillPurchaseOrderStock(poId);
            if (res.error) setErr(res.error);
            else router.refresh();
          });
        }}
        className="w-fit rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
      >
        {pending ? "Applying…" : "Apply received quantities to inventory"}
      </button>
      {err ? (
        <p className="max-w-xl text-sm text-red-600 dark:text-red-400" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
