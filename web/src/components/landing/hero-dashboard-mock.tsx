"use client";

import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

function pkr(
  n: number,
  locale: AppLocale
): string {
  return new Intl.NumberFormat(intlLocaleTag(locale), {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);
}

const BAR_HEIGHTS = [0.4, 0.65, 0.5, 0.85, 0.45, 0.7, 0.9];

const card =
  "rounded-xl border border-zinc-200 bg-white p-3";
const upDown = (up: boolean) => (up ? "text-brand-600" : "text-rose-500");

export function HeroDashboardMock() {
  const t = useTranslations("landing");
  const raw = useLocale();
  const loc: AppLocale = isAppLocale(raw) ? raw : defaultLocale;

  const m = useMemo(
    () => ({
      income: pkr(128400, loc),
      outflow: pkr(47100, loc),
      bal: pkr(81300, loc),
      item1: pkr(12800, loc),
      item2: pkr(9600, loc),
      item3: pkr(7200, loc),
    }),
    [loc]
  );

  return (
    <div
      className="w-full bg-zinc-50 p-3 sm:p-4"
      style={{ minHeight: 240 }}
    >
      <div className="flex items-start justify-between gap-2 border-b border-zinc-200 pb-3">
        <div>
          <p className="text-left text-sm font-semibold text-zinc-900">
            {t("mockGreeting")}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{t("mockGreetingSub")}</p>
        </div>
        <div className="h-8 w-8 rounded-full border border-zinc-200 bg-gradient-to-br from-zinc-100 to-zinc-200" />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:mt-4 sm:grid-cols-3">
        {(
          [
            { k: "mockMetricIncome" as const, v: m.income, up: true },
            { k: "mockMetricOut" as const, v: m.outflow, up: false },
            { k: "mockMetricBalance" as const, v: m.bal, up: true },
          ] as const
        ).map((row) => (
          <div key={row.k} className={card}>
            <p className="text-[0.65rem] font-medium uppercase tracking-wide text-zinc-500">
              {t(row.k)}
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900 sm:text-base">
              {row.v}
            </p>
            <p className={`text-[0.7rem] font-medium ${upDown(row.up)}`}>
              {row.up ? "â–²" : "â–¼"} {row.up ? t("mockTrendUp") : t("mockTrendDown")}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <p className="mb-2 text-xs font-semibold text-zinc-600">{t("mockChartTitle")}</p>
          <div
            className="flex h-28 items-end justify-between gap-0.5 rounded-xl border border-zinc-200 bg-white px-2 sm:h-32 sm:px-3"
            dir="ltr"
          >
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="w-full rounded-t bg-gradient-to-t from-brand-700 to-brand-500"
                style={{ height: `${h * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[0.65rem] text-zinc-500" dir="ltr">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d} className="w-full text-center">
                {d}
              </span>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <p className="mb-2 text-xs font-semibold text-zinc-600">
            {t("mockBestsellerTitle")}
          </p>
          <ul className="space-y-2">
            {(
              [
                { a: t("mockItem1"), c: m.item1, sw: "bg-amber-100" },
                { a: t("mockItem2"), c: m.item2, sw: "bg-rose-100" },
                { a: t("mockItem3"), c: m.item3, sw: "bg-sky-100" },
              ] as const
            ).map((row) => (
              <li
                key={row.a}
                className="flex items-center justify-between gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-left text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-7 w-7 shrink-0 rounded ${row.sw}`} />
                  <span className="truncate font-medium text-zinc-800">{row.a}</span>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-700">
                  {row.c}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
