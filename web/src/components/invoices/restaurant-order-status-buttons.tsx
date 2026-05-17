"use client";

import { updateRestaurantOrderStatus } from "@/lib/invoices/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const ORDER_FLOW: Array<"new" | "preparing" | "ready" | "served" | "settled"> = [
  "new",
  "preparing",
  "ready",
  "served",
  "settled",
];

function label(status: "new" | "preparing" | "ready" | "served" | "settled") {
  if (status === "new") return "New";
  if (status === "preparing") return "Preparing";
  if (status === "ready") return "Ready";
  if (status === "served") return "Served";
  return "Settled";
}

export function RestaurantOrderStatusButtons({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string;
  currentStatus: "new" | "preparing" | "ready" | "served" | "settled";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {ORDER_FLOW.map((st) => (
        <button
          key={st}
          type="button"
          disabled={pending || st === currentStatus}
          onClick={() =>
            startTransition(async () => {
              await updateRestaurantOrderStatus(invoiceId, st);
              router.refresh();
            })
          }
          className={
            st === currentStatus
              ? "rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white"
              : "rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          }
        >
          {label(st)}
        </button>
      ))}
    </div>
  );
}
