"use client";

import {
  updateBusinessSubscription,
  updateBusinessSubscriptionEndsAt,
} from "@/lib/admin/subscription-actions";
import {
  SUBSCRIPTION_STATUSES,
  canonicalSubscriptionStatus,
  type AdminBusinessRow,
} from "@/lib/admin/subscription-types";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

type Props = {
  initialRows: AdminBusinessRow[];
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatEnds(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AdminSubscriptionTable({ initialRows }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const statusLabels: Record<(typeof SUBSCRIPTION_STATUSES)[number], string> = {
    active: t("status.active"),
    trial: t("status.trialing"),
    past_due: t("status.past_due"),
    cancelled: t("status.cancelled"),
  };
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [endInputs, setEndInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const m: Record<string, string> = {};
    for (const r of initialRows) {
      m[r.id] = toDatetimeLocalValue(r.subscription_ends_at);
    }
    setEndInputs(m);
  }, [initialRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter((r) => {
      const hay = [r.name, r.id, r.subscription_status].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [initialRows, query]);

  function onStatusChange(businessId: string, value: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateBusinessSubscription(businessId, value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function saveEndDate(businessId: string) {
    setError(null);
    const raw = endInputs[businessId] ?? "";
    startTransition(async () => {
      const res = await updateBusinessSubscriptionEndsAt(
        businessId,
        raw.trim() === "" ? null : raw,
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </label>
        <p className="text-sm text-zinc-500">
          {t("rowCount", { count: filtered.length, total: initialRows.length })}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">{t("colBusiness")}</th>
              <th className="px-4 py-3">{t("colType")}</th>
              <th className="px-4 py-3">{t("colSubscription")}</th>
              <th className="px-4 py-3">{t("colSubscriptionEnds")}</th>
              <th className="px-4 py-3">{t("colCreated")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{row.name}</span>
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">{row.id}</p>
                </td>
                <td className="px-4 py-3 capitalize text-zinc-700 dark:text-zinc-300">{row.type}</td>
                <td className="px-4 py-3">
                  <select
                    value={canonicalSubscriptionStatus(row.subscription_status)}
                    disabled={pending}
                    onChange={(e) => onStatusChange(row.id, e.target.value)}
                    className="w-full max-w-[11rem] rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                    aria-label={t("colSubscription")}
                  >
                    {SUBSCRIPTION_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {statusLabels[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatEnds(row.subscription_ends_at)}
                  </p>
                  <div className="mt-2 flex max-w-[14rem] flex-col gap-1 sm:flex-row sm:items-center">
                    <input
                      type="datetime-local"
                      value={endInputs[row.id] ?? toDatetimeLocalValue(row.subscription_ends_at)}
                      disabled={pending}
                      onChange={(e) =>
                        setEndInputs((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-900"
                      aria-label={t("colSubscriptionEnds")}
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveEndDate(row.id)}
                      className="shrink-0 rounded-lg border border-zinc-300 px-2 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                    >
                      {tc("save")}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-600 dark:text-zinc-400">
                  {new Date(row.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">{t("empty")}</p>
        ) : null}
      </div>

      {pending ? (
        <p className="text-sm text-zinc-500">
          {tc("working")}…
        </p>
      ) : null}
    </div>
  );
}
