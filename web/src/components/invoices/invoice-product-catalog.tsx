"use client";

import { SearchableFilterList } from "@/components/ui/searchable-filter-list";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { sanitizeProductSearchQuery } from "@/lib/products/search-query";
import type { ProductRow } from "@/types/product";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo, useState } from "react";

const NONE_KEY = "__none__";

function categoryLabel(key: string, t: (k: string) => string) {
  return key === NONE_KEY ? t("uncategorized") : key;
}

function tagClassForCategory(name: string): string {
  const palette = [
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
    "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % palette.length;
  return palette[h]!;
}

type Props = {
  products: ProductRow[];
  onPick: (p: ProductRow) => void;
};

export function InvoiceProductCatalog({ products, onPick }: Props) {
  const tp = useTranslations("posSale");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [categoryKey, setCategoryKey] = useState<string>("all");
  const [brandKey, setBrandKey] = useState<string>("all");

  const pkr = useMemo(
    () =>
      new Intl.NumberFormat(intlLocaleTag(locale), {
        style: "currency",
        currency: "PKR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    for (const p of products) {
      const k = p.category?.trim() || NONE_KEY;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const categoryKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      set.add(p.category?.trim() || NONE_KEY);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    for (const p of products) {
      const k = p.brand?.trim() || NONE_KEY;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const brandKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      set.add(p.brand?.trim() || NONE_KEY);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const categoryFilterItems = useMemo(
    () =>
      categoryKeys.map((key) => ({
        key,
        label: key === "all" ? tp("allMenu") : categoryLabel(key, tp),
        count: categoryCounts[key] ?? 0,
      })),
    [categoryKeys, categoryCounts, tp],
  );

  const brandFilterItems = useMemo(
    () =>
      brandKeys.map((key) => ({
        key,
        label: key === "all" ? tp("allMenu") : categoryLabel(key, tp),
        count: brandCounts[key] ?? 0,
      })),
    [brandKeys, brandCounts, tp],
  );

  const filteredGrid = useMemo(() => {
    let list = products;
    if (categoryKey !== "all") {
      list = list.filter((p) => (p.category?.trim() || NONE_KEY) === categoryKey);
    }
    if (brandKey !== "all") {
      list = list.filter((p) => (p.brand?.trim() || NONE_KEY) === brandKey);
    }
    const sq = sanitizeProductSearchQuery(q);
    if (!sq) return list;
    const lower = sq.toLowerCase();
    return list.filter((p) => {
      if (p.name.toLowerCase().includes(lower)) return true;
      if (p.sku?.toLowerCase().includes(lower)) return true;
      if (p.barcode?.trim() && p.barcode.trim().toLowerCase() === lower) return true;
      if (p.brand?.toLowerCase().includes(lower)) return true;
      return false;
    });
  }, [products, categoryKey, brandKey, q]);

  return (
    <div className="overflow-visible rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{tp("catalogTitle")}</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{tp("posTopSearchHint")}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
          {tp("openSale")}
        </span>
      </div>

      <div className="mb-3 grid gap-4 overflow-visible sm:grid-cols-2">
        <SearchableFilterList
          groupLabel={tp("categoryFilter")}
          items={categoryFilterItems}
          value={categoryKey}
          onChange={setCategoryKey}
          searchPlaceholder={tp("searchCategories")}
          noMatchesLabel={tp("filterNoMatches")}
          variant="blue"
        />
        <SearchableFilterList
          groupLabel={tp("brandFilter")}
          items={brandFilterItems}
          value={brandKey}
          onChange={setBrandKey}
          searchPlaceholder={tp("searchBrands")}
          noMatchesLabel={tp("filterNoMatches")}
          variant="violet"
        />
      </div>

      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tp("searchPlaceholder")}
          autoComplete="off"
          className="min-h-[40px] w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none ring-blue-500/30 focus:border-blue-400 focus:bg-white focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:bg-zinc-950"
        />
      </div>

      <div className="max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {filteredGrid.map((p) => {
            const cat = p.category?.trim() || tp("uncategorized");
            const br = p.brand?.trim() || null;
            const out = p.current_stock <= 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={out}
                onClick={() => onPick(p)}
                className={`group flex touch-manipulation flex-col overflow-hidden rounded-2xl border text-left transition active:scale-[0.98] ${
                  out
                    ? "cursor-not-allowed border-zinc-200 opacity-60 dark:border-zinc-800"
                    : "border-zinc-200 bg-white shadow-sm hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700"
                }`}
              >
                <div className="relative aspect-[4/3] w-full bg-zinc-100 dark:bg-zinc-800">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 46vw, (max-width: 1024px) 22vw, 180px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl font-semibold text-zinc-400">
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5 p-2">
                  <span className="line-clamp-2 text-xs font-medium leading-snug text-zinc-900 dark:text-zinc-50">
                    {p.name}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    <span
                      className={`inline-flex w-fit rounded px-1 py-0.5 text-[9px] font-medium ${tagClassForCategory(cat)}`}
                    >
                      {cat}
                    </span>
                    {br ? (
                      <span className="inline-flex w-fit rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-[9px] font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {br}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-auto pt-0.5 text-right text-xs font-semibold tabular-nums text-blue-700 dark:text-blue-300">
                    {pkr.format(p.sale_price)}
                  </span>
                  <span className="text-[9px] leading-tight text-zinc-500 dark:text-zinc-400">
                    {tp("stockLine", {
                      qty: p.current_stock.toLocaleString(intlLocaleTag(locale), {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      }),
                      unit: p.unit,
                    })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {filteredGrid.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">{tp("noProducts")}</p>
        ) : null}
      </div>
    </div>
  );
}
