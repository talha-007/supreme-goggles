"use client";

import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { BRAND_NAME } from "@/lib/brand";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

function pkr(n: number, locale: AppLocale) {
  return new Intl.NumberFormat(intlLocaleTag(locale), {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function HeroMobileAppMock() {
  const t = useTranslations("landing");
  const raw = useLocale();
  const loc: AppLocale = isAppLocale(raw) ? raw : defaultLocale;

  const m = useMemo(
    () => ({
      today: pkr(48120, loc),
      item1: pkr(12800, loc),
      item2: pkr(9600, loc),
      item3: pkr(7200, loc),
    }),
    [loc]
  );

  return (
    <div
      className="mx-auto w-full max-w-[280px] [direction:ltr]"
      role="img"
      aria-label={t("heroMobileMockAria")}
    >
      <div className="relative rounded-[2rem] border-[10px] border-zinc-800 bg-zinc-800 shadow-2xl shadow-zinc-900/40">
        <div className="pointer-events-none absolute start-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-zinc-800" />
        <div className="overflow-hidden rounded-2xl bg-zinc-50">
          <div className="flex h-2.5 items-end justify-center gap-0.5 bg-zinc-200/80 pb-0.5 text-[0.4rem] font-medium text-zinc-500">
            <span>9:41</span>
          </div>
          <div className="border-b border-zinc-200 bg-white px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-900">{BRAND_NAME}</span>
              <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[0.6rem] font-semibold text-brand-800">
                {t("mobileMockAppBadge")}
              </span>
            </div>
          </div>
          <div className="space-y-2 p-2.5">
            <div className="rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm">
              <p className="text-[0.6rem] font-medium uppercase tracking-wide text-zinc-500">
                {t("mobileMockToday")}
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-zinc-900">{m.today}</p>
            </div>
            <p className="px-0.5 text-[0.65rem] font-semibold text-zinc-600">{t("mockBestsellerTitle")}</p>
            <ul className="space-y-1.5">
              {(
                [
                  { label: t("mockItem1"), v: m.item1, sw: "bg-amber-100" },
                  { label: t("mockItem2"), v: m.item2, sw: "bg-brand-100" },
                  { label: t("mockItem3"), v: m.item3, sw: "bg-sky-100" },
                ] as const
              ).map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className={`h-5 w-5 shrink-0 rounded ${row.sw}`} />
                    <span className="truncate font-medium text-zinc-800">{row.label}</span>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-zinc-700">{row.v}</span>
                </li>
              ))}
            </ul>
            <div className="pt-0.5">
              <div className="flex h-9 w-full items-center justify-center rounded-xl bg-brand-600 text-xs font-bold text-white">
                {t("mobileMockPosCta")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
