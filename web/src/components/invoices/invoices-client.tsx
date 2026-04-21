"use client";

import { InvoiceReverseButton } from "@/components/invoices/invoice-reverse-button";
import Link from "next/link";
import { useMemo, useState } from "react";

const statusStyle: Record<string, string> = {
  draft:     "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  unpaid:    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  partial:   "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  paid:      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
};

const STATUS_OPTIONS = [
  { value: "",          label: "All statuses" },
  { value: "draft",     label: "Draft" },
  { value: "unpaid",    label: "Unpaid" },
  { value: "partial",   label: "Partial" },
  { value: "paid",      label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

const DATE_OPTIONS = [
  { value: "all",   label: "All time" },
  { value: "today", label: "Today" },
  { value: "week",  label: "This week" },
  { value: "month", label: "This month" },
];

export type InvoiceClientRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number | string;
  paid_amount: number | string;
  created_at: string;
  customers?: { name: string } | null;
  restaurant_tables?: { name: string } | { name: string }[] | null;
  restaurant_staff?: { name: string } | { name: string }[] | null;
  restaurant_order_status?: string | null;
};

type Props = {
  invoices: InvoiceClientRow[];
  canEdit: boolean;
  isRestaurant: boolean;
  /** BCP 47 tag for PKR formatting (e.g. `en-PK`, `ur-PK`) — must be serializable, not a function. */
  currencyLocale: string;
  statusLabels: Record<string, string>;
  editLabel: string;
  viewLabel: string;
  newInvoiceHref: string;
  newInvoiceLabel: string;
  title: string;
  subtitle: string;
  emptyLabel: string;
};

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function startOfWeek(d: Date) {
  const r = startOfDay(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}
function startOfMonth(d: Date) {
  const r = startOfDay(d);
  r.setDate(1);
  return r;
}

export function InvoicesClient({
  invoices,
  canEdit,
  isRestaurant,
  currencyLocale,
  statusLabels,
  editLabel,
  viewLabel,
  newInvoiceHref,
  newInvoiceLabel,
  title,
  subtitle,
  emptyLabel,
}: Props) {
  const [search, setSearch]     = useState("");
  const [statusF, setStatusF]   = useState("");
  const [dateF, setDateF]       = useState("all");

  const now = useMemo(() => new Date(), []);

  const pkr = useMemo(
    () =>
      new Intl.NumberFormat(currencyLocale, {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [currencyLocale],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let cutoff: Date | null = null;
    if (dateF === "today") cutoff = startOfDay(now);
    else if (dateF === "week") cutoff = startOfWeek(now);
    else if (dateF === "month") cutoff = startOfMonth(now);

    return invoices.filter((inv) => {
      if (statusF && inv.status !== statusF) return false;
      if (cutoff && new Date(inv.created_at) < cutoff) return false;
      if (q) {
        const num = (inv.invoice_number ?? "").toLowerCase();
        const cust = (inv.customers?.name ?? "").toLowerCase();
        if (!num.includes(q) && !cust.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, search, statusF, dateF, now]);

  const inputCls =
    "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-blue-500/30 focus:border-blue-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

  const hasFilter = search !== "" || statusF !== "" || dateF !== "all";

  return (
    <div className="mx-auto max-w-6xl">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
        </div>
        {canEdit && (
          <Link
            href={newInvoiceHref}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {newInvoiceLabel}
          </Link>
        )}
      </div>

      {/* Filter bar */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[180px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or customer…"
            className={`${inputCls} w-full pl-9 pr-3`}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          className={inputCls}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Date filter */}
        <select
          value={dateF}
          onChange={(e) => setDateF(e.target.value)}
          className={inputCls}
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Clear */}
        {hasFilter && (
          <button
            type="button"
            onClick={() => { setSearch(""); setStatusF(""); setDateF("all"); }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Clear
          </button>
        )}

        {/* Result count */}
        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
          {filtered.length} / {invoices.length}
        </span>
      </div>

      {/* Table */}
      <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                {isRestaurant && <th className="px-4 py-3">Table</th>}
                {isRestaurant && <th className="px-4 py-3">Waiter</th>}
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={isRestaurant ? 9 : 7}
                    className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    {hasFilter ? "No invoices match your filters." : emptyLabel}
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const cust = inv.customers?.name ?? "—";
                  const table = Array.isArray(inv.restaurant_tables)
                    ? (inv.restaurant_tables[0]?.name ?? "—")
                    : (inv.restaurant_tables?.name ?? "—");
                  const waiter = Array.isArray(inv.restaurant_staff)
                    ? (inv.restaurant_staff[0]?.name ?? "—")
                    : (inv.restaurant_staff?.name ?? "—");
                  const date = new Date(inv.created_at).toLocaleDateString("en-PK", {
                    day: "2-digit", month: "short", year: "numeric",
                  });
                  return (
                    <tr key={inv.id} className="text-zinc-800 dark:text-zinc-200">
                      <td className="px-4 py-3 font-mono text-sm">{inv.invoice_number}</td>
                      <td className="px-4 py-3">{cust}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{date}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusStyle[inv.status] ?? statusStyle.draft}`}>
                          {statusLabels[inv.status] ?? inv.status}
                        </span>
                      </td>
                      {isRestaurant && <td className="px-4 py-3">{table}</td>}
                      {isRestaurant && <td className="px-4 py-3">{waiter}</td>}
                      <td className="px-4 py-3 text-right tabular-nums">
                        {pkr.format(Number(inv.total_amount))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {pkr.format(Number(inv.paid_amount))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:justify-end sm:gap-2">
                          <Link
                            href={`/dashboard/invoices/${inv.id}`}
                            className="font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
                          >
                            {viewLabel}
                          </Link>
                          {canEdit && inv.status === "draft" && (
                            <Link
                              href={`/dashboard/invoices/${inv.id}/edit`}
                              className="font-medium text-zinc-900 underline hover:no-underline dark:text-zinc-100"
                            >
                              {editLabel}
                            </Link>
                          )}
                          {canEdit && inv.status !== "draft" && inv.status !== "cancelled" && (
                            <InvoiceReverseButton invoiceId={inv.id} compact className="!border-0 !bg-transparent !px-0 !py-0 !text-xs !font-medium !text-red-700 hover:!bg-transparent dark:!text-red-400" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
