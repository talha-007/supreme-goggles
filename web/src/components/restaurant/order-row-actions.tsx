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
          const res = await assignInvoiceWaiter(invoiceId, e.target.value || null);
          if (res.error) {
            window.alert(res.error);
            return;
          }
          router.refresh();
        })
      }
      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs"
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

const variantClasses: Record<string, string> = {
  default:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
  amber:
    "border-0 bg-amber-400 text-amber-950 hover:bg-amber-500",
  green:
    "border-0 bg-brand-500 text-white hover:bg-brand-600",
  blue: "border-0 bg-blue-500 text-white hover:bg-blue-600",
};

export function QuickStatusButton({
  invoiceId,
  nextStatus,
  label,
  disabled,
  variant = "default",
  fullWidth = false,
}: {
  invoiceId: string;
  nextStatus: "new" | "preparing" | "ready" | "served" | "settled";
  label: string;
  disabled?: boolean;
  variant?: "default" | "amber" | "green" | "blue";
  fullWidth?: boolean;
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
          const res = await updateRestaurantOrderStatus(invoiceId, nextStatus);
          if (res.error) {
            window.alert(res.error);
            return;
          }
          router.refresh();
        })
      }
      className={[
        "rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
        variantClasses[variant] ?? variantClasses.default,
        fullWidth ? "w-full" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {pending ? "Updatingâ€¦" : label}
    </button>
  );
}
