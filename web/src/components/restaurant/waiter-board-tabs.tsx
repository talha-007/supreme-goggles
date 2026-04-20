"use client";

import { QuickStatusButton } from "@/components/restaurant/order-row-actions";
import { statusBadgeClass, type RestaurantOrderStatus } from "@/lib/restaurant/order-utils";
import Link from "next/link";
import { useMemo, useState } from "react";

export type WaiterOrder = {
  invoice_id: string;
  status: RestaurantOrderStatus;
  waiter_id: string | null;
  restaurant_tables: { name: string } | { name: string }[] | null;
  invoices:
    | { invoice_number: string; status?: string | null }
    | { invoice_number: string; status?: string | null }[]
    | null;
};

type Tab = "new-order" | "in-kitchen" | "ready" | "history";

function getTableName(o: WaiterOrder) {
  return Array.isArray(o.restaurant_tables)
    ? (o.restaurant_tables[0]?.name ?? "—")
    : (o.restaurant_tables?.name ?? "—");
}
function getInv(o: WaiterOrder) {
  return Array.isArray(o.invoices) ? (o.invoices[0] ?? null) : o.invoices;
}
function getInvNumber(o: WaiterOrder) {
  return getInv(o)?.invoice_number ?? "—";
}

const invoiceStatusStyle: Record<string, string> = {
  paid:     "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  unpaid:   "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  partial:  "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  draft:    "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  cancelled:"bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

function OrderCard({
  o,
  action,
}: {
  o: WaiterOrder;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Table {getTableName(o)}
        </p>
        <p className="mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">
          {getInvNumber(o)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${statusBadgeClass(o.status)}`}
        >
          {o.status}
        </span>
        {action}
      </div>
    </div>
  );
}

function EmptyLane({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-14 text-center dark:border-zinc-800">
      <p className="text-sm text-zinc-400 dark:text-zinc-500">{message}</p>
    </div>
  );
}

const PAYMENT_STATUS_OPTS = [
  { value: "",         label: "All" },
  { value: "paid",     label: "Paid" },
  { value: "unpaid",   label: "Unpaid" },
  { value: "partial",  label: "Partial" },
];

export function WaiterBoardTabs({
  inKitchenOrders,
  readyToServeOrders,
  servedOrders,
  children,
}: {
  inKitchenOrders: WaiterOrder[];
  readyToServeOrders: WaiterOrder[];
  servedOrders: WaiterOrder[];
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("new-order");

  // In-kitchen filters
  const [kitchenTableQ, setKitchenTableQ] = useState("");
  const [kitchenStatusF, setKitchenStatusF] = useState<"" | "new" | "preparing">("");

  const filteredKitchen = useMemo(() => {
    const q = kitchenTableQ.trim().toLowerCase();
    return inKitchenOrders.filter((o) => {
      if (kitchenStatusF && o.status !== kitchenStatusF) return false;
      if (q && !getTableName(o).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [inKitchenOrders, kitchenTableQ, kitchenStatusF]);

  // History filters
  const [historyFilter, setHistoryFilter] = useState("");

  const filteredHistory = useMemo(() => {
    if (!historyFilter) return servedOrders;
    return servedOrders.filter((o) => getInv(o)?.status === historyFilter);
  }, [servedOrders, historyFilter]);

  const tabs: { id: Tab; label: string; shortLabel: string; count: number | null; countColor?: string }[] = [
    { id: "new-order",   label: "New order",      shortLabel: "New",     count: null },
    { id: "in-kitchen",  label: "In kitchen",     shortLabel: "Kitchen", count: inKitchenOrders.length,   countColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
    { id: "ready",       label: "Ready to serve", shortLabel: "Ready",   count: readyToServeOrders.length, countColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
    { id: "history",     label: "History",        shortLabel: "History", count: null },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Order sections"
        className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={[
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors sm:text-sm",
              tab === t.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
            ].join(" ")}
          >
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.shortLabel}</span>
            {t.count !== null && t.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${t.countColor}`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="mt-4">
        {/* New order */}
        <div role="tabpanel" hidden={tab !== "new-order"}>
          {tab === "new-order" && children}
        </div>

        {/* In kitchen */}
        <div role="tabpanel" hidden={tab !== "in-kitchen"}>
          {tab === "in-kitchen" && (
            <div className="space-y-2.5">
              {/* Filter row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Table search */}
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="search"
                    value={kitchenTableQ}
                    onChange={(e) => setKitchenTableQ(e.target.value)}
                    placeholder="Table…"
                    className="w-32 rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-2 text-xs text-zinc-900 outline-none ring-blue-500/30 focus:border-blue-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>

                {/* Status pills */}
                <div className="flex gap-1">
                  {([["", "All"], ["new", "New"], ["preparing", "Preparing"]] as const).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setKitchenStatusF(val)}
                      className={[
                        "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
                        kitchenStatusF === val
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                {/* Clear */}
                {(kitchenTableQ !== "" || kitchenStatusF !== "") && (
                  <button
                    type="button"
                    onClick={() => { setKitchenTableQ(""); setKitchenStatusF(""); }}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    Clear
                  </button>
                )}

                <span className="ml-auto text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                  {filteredKitchen.length} / {inKitchenOrders.length}
                </span>
              </div>

              {filteredKitchen.length === 0 ? (
                <EmptyLane message={inKitchenOrders.length === 0 ? "No orders in the kitchen right now." : "No orders match your filters."} />
              ) : (
                filteredKitchen.map((o) => (
                  <OrderCard
                    key={o.invoice_id}
                    o={o}
                    action={
                      <Link
                        href={`/dashboard/invoices/${o.invoice_id}`}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        View
                      </Link>
                    }
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Ready to serve */}
        <div role="tabpanel" hidden={tab !== "ready"}>
          {tab === "ready" && (
            <div className="space-y-2.5">
              {readyToServeOrders.length === 0 ? (
                <EmptyLane message="No orders ready to serve yet." />
              ) : (
                readyToServeOrders.map((o) => (
                  <OrderCard
                    key={o.invoice_id}
                    o={o}
                    action={
                      <QuickStatusButton
                        invoiceId={o.invoice_id}
                        nextStatus="served"
                        label="Mark served"
                        variant="green"
                      />
                    }
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* History */}
        <div role="tabpanel" hidden={tab !== "history"}>
          {tab === "history" && (
            <div className="space-y-2.5">
              {/* Filter row */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Payment:
                </span>
                <div className="flex gap-1">
                  {PAYMENT_STATUS_OPTS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setHistoryFilter(opt.value)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                        historyFilter === opt.value
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="ml-auto text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                  {filteredHistory.length} / {servedOrders.length}
                </span>
              </div>

              {filteredHistory.length === 0 ? (
                <EmptyLane message={servedOrders.length === 0 ? "No served orders yet." : "No orders match this filter."} />
              ) : (
                filteredHistory.map((o) => {
                  const invStatus = getInv(o)?.status ?? null;
                  return (
                    <OrderCard
                      key={o.invoice_id}
                      o={o}
                      action={
                        <div className="flex items-center gap-2">
                          {invStatus && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${invoiceStatusStyle[invStatus] ?? invoiceStatusStyle.draft}`}
                            >
                              {invStatus}
                            </span>
                          )}
                          <Link
                            href={`/dashboard/invoices/${o.invoice_id}`}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            View
                          </Link>
                        </div>
                      }
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
