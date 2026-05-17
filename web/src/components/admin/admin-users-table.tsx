"use client";

import { canonicalSubscriptionStatus } from "@/lib/admin/subscription-types";
import type { AdminUserRow } from "@/lib/admin/panel-types";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type Props = {
  initialRows: AdminUserRow[];
};

export function AdminUsersTable({ initialRows }: Props) {
  const t = useTranslations("admin");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter((r) => {
      const hay = [
        r.email,
        r.id,
        r.business_name,
        r.business_id,
        r.member_role,
        r.business_subscription,
        r.business_subscription_ends_at,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [initialRows, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-sm text-zinc-600">
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("usersSearchPlaceholder")}
            className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <p className="text-sm text-zinc-500">
          {t("usersRowCount", { count: filtered.length, total: initialRows.length })}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[1024px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600">
            <tr>
              <th className="px-4 py-3">{t("colEmail")}</th>
              <th className="px-4 py-3">{t("colSignedUp")}</th>
              <th className="px-4 py-3">{t("colLastSignIn")}</th>
              <th className="px-4 py-3">{t("colEmailConfirmed")}</th>
              <th className="px-4 py-3">{t("colBusiness")}</th>
              <th className="px-4 py-3">{t("colRole")}</th>
              <th className="px-4 py-3">{t("colSubscription")}</th>
              <th className="px-4 py-3">{t("colSubscriptionEnds")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <span className="font-medium text-zinc-900">
                    {row.email ?? "—"}
                  </span>
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">{row.id}</p>
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-700">
                  {formatDate(row.created_at)}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-600">
                  {row.last_sign_in_at ? formatDate(row.last_sign_in_at) : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {row.email_confirmed_at ? t("yes") : t("no")}
                </td>
                <td className="px-4 py-3">
                  {row.business_name ? (
                    <>
                      <span className="text-zinc-900">{row.business_name}</span>
                      {row.business_id ? (
                        <p className="mt-0.5 font-mono text-xs text-zinc-500">{row.business_id}</p>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-amber-700">{t("noBusinessYet")}</span>
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-zinc-700">
                  {row.member_role ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {row.business_id
                    ? subscriptionLabel(canonicalSubscriptionStatus(row.business_subscription), t)
                    : (row.business_subscription ?? "—")}
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-600">
                  {row.business_subscription_ends_at ? formatDate(row.business_subscription_ends_at) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">{t("usersEmpty")}</p>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function subscriptionLabel(
  key: string,
  t: (key: string) => string,
): string {
  switch (key) {
    case "active":
      return t("status.active");
    case "trial":
    case "trialing":
      return t("status.trialing");
    case "past_due":
      return t("status.past_due");
    case "cancelled":
      return t("status.cancelled");
    default:
      return key;
  }
}
