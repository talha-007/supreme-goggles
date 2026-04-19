"use client";

import { assignInvoiceWaiter, updateRestaurantOrderStatus } from "@/lib/invoices/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function WaiterAssignSelect({
  invoiceId,
  currentWaiterId,
  waiters,
}: {
  invoiceId: string;
  currentWaiterId: string | null;
  waiters: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentWaiterId ?? ""}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await assignInvoiceWaiter(invoiceId, e.target.value || null);
          router.refresh();
        })
      }
      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
    >
      <option value="">Unassigned</option>
      {waiters.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </select>
  );
}

export function QuickStatusButton({
  invoiceId,
  nextStatus,
  label,
  disabled,
}: {
  invoiceId: string;
  nextStatus: "new" | "preparing" | "ready" | "served" | "settled";
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isDisabled = Boolean(disabled) || pending;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() =>
        startTransition(async () => {
          await updateRestaurantOrderStatus(invoiceId, nextStatus);
          router.refresh();
        })
      }
      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
    >
      {label}
    </button>
  );
}
