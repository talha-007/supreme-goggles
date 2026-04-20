"use client";

import { QuickStatusButton } from "@/components/restaurant/order-row-actions";
import { statusBadgeClass, type RestaurantOrderStatus } from "@/lib/restaurant/order-utils";
import { useMemo, useState } from "react";

export type KitchenOrder = {
  invoice_id: string;
  status: RestaurantOrderStatus;
  created_at: string;
  restaurant_tables: { name: string } | { name: string }[] | null;
  invoices:
    | { invoice_number: string; invoice_items: KitchenItem[] | null }
    | { invoice_number: string; invoice_items: KitchenItem[] | null }[]
    | null;
};

export type KitchenItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
};

function getTable(o: KitchenOrder) {
  return Array.isArray(o.restaurant_tables)
    ? (o.restaurant_tables[0]?.name ?? "—")
    : (o.restaurant_tables?.name ?? "—");
}
function getInv(o: KitchenOrder) {
  return Array.isArray(o.invoices) ? (o.invoices[0] ?? null) : o.invoices;
}

function elapsed(iso: string, now: number) {
  const s = Math.floor((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function elapsedMinutes(iso: string, now: number) {
  return Math.floor((now - new Date(iso).getTime()) / 60000);
}

const ELAPSED_OPTS = [
  { value: 0,  label: "Any age" },
  { value: 5,  label: "> 5 min" },
  { value: 10, label: "> 10 min" },
  { value: 15, label: "> 15 min" },
];

function OrderCard({ o, now }: { o: KitchenOrder; now: number }) {
  const inv = getInv(o);
  const table = getTable(o);
  const items = inv?.invoice_items ?? [];
  const isNew = o.status === "new";
  const age = elapsedMinutes(o.created_at, now);
  const urgent = age >= 10;

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-950 ${
        urgent
          ? "border-red-200 dark:border-red-900/60"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${
          urgent
            ? "border-red-100 dark:border-red-900/40"
            : "border-zinc-100 dark:border-zinc-800"
        }`}
      >
        <div className="min-w-0">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Table {table}
          </p>
          <p className={`mt-0.5 text-xs ${urgent ? "font-semibold text-red-600 dark:text-red-400" : "text-zinc-400 dark:text-zinc-500"}`}>
            {inv?.invoice_number} · {elapsed(o.created_at, now)} ago
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(o.status)}`}
        >
          {isNew ? "New" : "Preparing"}
        </span>
      </div>

      {/* Items */}
      <div className="flex-1 divide-y divide-zinc-100 px-4 dark:divide-zinc-800/60">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-zinc-400 dark:text-zinc-500">No items</p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {it.product_name}
              </span>
              <span className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-sm font-bold tabular-nums text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                ×{Number(it.quantity).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Action */}
      <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
        <QuickStatusButton
          invoiceId={o.invoice_id}
          nextStatus={isNew ? "preparing" : "ready"}
          label={isNew ? "Start preparing" : "Mark ready"}
          variant={isNew ? "amber" : "green"}
          fullWidth
        />
      </div>
    </div>
  );
}

function EmptyColumn({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center dark:border-zinc-800">
      <p className="text-sm text-zinc-400 dark:text-zinc-500">{message}</p>
    </div>
  );
}

export function KitchenBoardClient({ orders }: { orders: KitchenOrder[] }) {
  const now = Date.now();

  const [tableQ, setTableQ]     = useState("");
  const [statusF, setStatusF]   = useState<"all" | "new" | "preparing">("all");
  const [minAge, setMinAge]     = useState(0);

  const filtered = useMemo(() => {
    const q = tableQ.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusF !== "all" && o.status !== statusF) return false;
      if (minAge > 0 && elapsedMinutes(o.created_at, now) < minAge) return false;
      if (q && !getTable(o).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, tableQ, statusF, minAge, now]);

  const newOrders      = filtered.filter((o) => o.status === "new");
  const preparingOrders = filtered.filter((o) => o.status === "preparing");

  const inputCls =
    "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-blue-500/30 focus:border-blue-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

  const pillBase = "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors";
  const pillActive = "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900";
  const pillInactive = "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800";

  const hasFilter = tableQ !== "" || statusF !== "all" || minAge > 0;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Table search */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            value={tableQ}
            onChange={(e) => setTableQ(e.target.value)}
            placeholder="Table name…"
            className={`${inputCls} pl-9 pr-3 w-36 sm:w-44`}
          />
        </div>

        {/* Status toggle */}
        <div className="flex gap-1">
          {(["all", "new", "preparing"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusF(s)}
              className={`${pillBase} ${statusF === s ? pillActive : pillInactive}`}
            >
              {s === "all" ? "All" : s === "new" ? "New" : "Preparing"}
            </button>
          ))}
        </div>

        {/* Elapsed time filter */}
        <select
          value={minAge}
          onChange={(e) => setMinAge(Number(e.target.value))}
          className={inputCls}
        >
          {ELAPSED_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Clear */}
        {hasFilter && (
          <button
            type="button"
            onClick={() => { setTableQ(""); setStatusF("all"); setMinAge(0); }}
            className={`${pillBase} ${pillInactive}`}
          >
            Clear
          </button>
        )}

        {/* Count */}
        <span className="ml-auto text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
          {filtered.length} / {orders.length} orders
        </span>
      </div>

      {/* Board */}
      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 py-14 text-center dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {orders.length === 0 ? "All clear — no orders in the kitchen." : "No orders match your filters."}
          </p>
          {orders.length === 0 && (
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
              New orders will appear here automatically.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* New orders column */}
          {statusF !== "preparing" && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  New orders
                </span>
                {newOrders.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    {newOrders.length}
                  </span>
                )}
              </div>
              {newOrders.length === 0 ? (
                <EmptyColumn message="No new orders" />
              ) : (
                newOrders.map((o) => <OrderCard key={o.invoice_id} o={o} now={now} />)
              )}
            </div>
          )}

          {/* Preparing column */}
          {statusF !== "new" && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  Preparing
                </span>
                {preparingOrders.length > 0 && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                    {preparingOrders.length}
                  </span>
                )}
              </div>
              {preparingOrders.length === 0 ? (
                <EmptyColumn message="Nothing being prepared yet" />
              ) : (
                preparingOrders.map((o) => <OrderCard key={o.invoice_id} o={o} now={now} />)
              )}
            </div>
          )}

          {/* When filtered to one status, use full width */}
          {statusF === "new" && newOrders.length > 0 && (
            <div /> /* spacer so grid doesn't orphan */
          )}
        </div>
      )}
    </div>
  );
}
