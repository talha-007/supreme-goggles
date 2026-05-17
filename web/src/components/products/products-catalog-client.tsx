"use client";

import { looksLikeBarcode } from "@/lib/products/barcode-utils";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { sanitizeProductSearchQuery } from "@/lib/products/search-query";
import type { ProductRow } from "@/types/product";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

function buildProductsPath(opts: { q?: string; stock?: "low"; scan?: boolean }): string {
  const p = new URLSearchParams();
  if (opts.q) p.set("q", opts.q);
  if (opts.stock === "low") p.set("stock", "low");
  if (opts.scan) p.set("scan", "1");
  const s = p.toString();
  return s ? `/dashboard/products?${s}` : "/dashboard/products";
}

function replaceCatalogUrl(pathWithQuery: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", pathWithQuery);
}

type Props = {
  initialProducts: ProductRow[];
  initialQ: string;
  initialLowStockOnly: boolean;
  initialScanMode: boolean;
  canEdit: boolean;
};

async function fetchProductSearch(
  q: string,
  lowStockOnly: boolean,
  signal: AbortSignal,
): Promise<ProductRow[]> {
  const params = new URLSearchParams();
  const sq = sanitizeProductSearchQuery(q);
  if (sq) params.set("q", sq);
  if (lowStockOnly) params.set("stock", "low");
  params.set("limit", sq ? "100" : "50");
  const res = await fetch(`/api/dashboard/products/search?${params}`, { signal });
  const json = (await res.json()) as { products?: ProductRow[]; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "__SEARCH_FAILED__");
  }
  return json.products ?? [];
}

export function ProductsCatalogClient({
  initialProducts,
  initialQ,
  initialLowStockOnly,
  initialScanMode,
  canEdit,
}: Props) {
  const tp = useTranslations("products");
  const tc = useTranslations("common");
  const locale = useLocale();
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
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState(() => sanitizeProductSearchQuery(initialQ));
  const [lowStockOnly, setLowStockOnly] = useState(initialLowStockOnly);
  const [scanMode, setScanMode] = useState(initialScanMode);

  const [products, setProducts] = useState<ProductRow[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const skippedSsrDuplicate = useRef(false);
  const initialRowsRef = useRef(initialProducts);

  /** Debounced server search â€” no full-page navigation. */
  useEffect(() => {
    const ac = new AbortController();
    const debounceTimer = window.setTimeout(async () => {
      const sq = sanitizeProductSearchQuery(q);
      const sameAsSsr =
        sq === sanitizeProductSearchQuery(initialQ) && lowStockOnly === initialLowStockOnly;
      if (sameAsSsr && !skippedSsrDuplicate.current) {
        skippedSsrDuplicate.current = true;
        setProducts(initialRowsRef.current);
        return;
      }
      skippedSsrDuplicate.current = true;

      setLoading(true);
      setLoadError(null);
      try {
        const rows = await fetchProductSearch(q, lowStockOnly, ac.signal);
        setProducts(rows);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        const raw = e instanceof Error ? e.message : "__SEARCH_FAILED__";
        setLoadError(raw === "__SEARCH_FAILED__" ? tp("searchFailed") : raw);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      window.clearTimeout(debounceTimer);
      ac.abort();
    };
  }, [q, lowStockOnly, initialQ, initialLowStockOnly, tp]);

  useEffect(() => {
    const path = buildProductsPath({
      q: sanitizeProductSearchQuery(q) || undefined,
      stock: lowStockOnly ? "low" : undefined,
      scan: scanMode || undefined,
    });
    const t = window.setTimeout(() => replaceCatalogUrl(path), 320);
    return () => window.clearTimeout(t);
  }, [q, lowStockOnly, scanMode]);

  useEffect(() => {
    if (scanMode && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [scanMode]);

  const safeQ = sanitizeProductSearchQuery(q);

  const unknownBarcode =
    !loading &&
    !lowStockOnly &&
    products.length === 0 &&
    safeQ.length > 0 &&
    looksLikeBarcode(safeQ) &&
    canEdit;

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const t = sanitizeProductSearchQuery(q);
    if (!t || lowStockOnly) return;
    const exact = products.filter((p) => p.barcode && p.barcode.trim() === t.trim());
    if (exact.length === 1) {
      e.preventDefault();
      router.push(`/dashboard/products/${exact[0].id}/edit`);
    }
  }

  const onSearchChange = useCallback((v: string) => {
    setQ(v);
  }, []);

  const clearSearch = useCallback(() => {
    setQ("");
    searchInputRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {loading ? tp("ariaLiveLoading") : tp("ariaLiveCount", { count: products.length })}
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {tp("title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{tp("subtitle")}</p>
        </div>
        {canEdit ? (
          <Link
            href="/dashboard/products/new"
            className="min-w-50 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {tp("addProduct")}
          </Link>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div
          className="flex max-w-md flex-1 flex-col gap-2 sm:flex-row sm:items-center"
          role="search"
          aria-label={tp("searchLabel")}
        >
          <label htmlFor="product-catalog-q" className="sr-only">
            {tp("searchOrScan")}
          </label>
          <input
            ref={searchInputRef}
            id="product-catalog-q"
            type="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={tp("searchPlaceholder")}
            aria-busy={loading}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
          />
          {loading ? (
            <span className="shrink-0 text-xs text-zinc-500" aria-hidden>
              {tp("searching")}
            </span>
          ) : null}
          {q ? (
            <button
              type="button"
              onClick={clearSearch}
              className="shrink-0 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {tc("clear")}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {scanMode ? (
            <button
              type="button"
              onClick={() => setScanMode(false)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {tp("exitScanMode")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setScanMode(true)}
              className="rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-950 hover:bg-brand-100"
            >
              {tp("scanMode")}
            </button>
          )}
          {lowStockOnly ? (
            <button
              type="button"
              onClick={() => setLowStockOnly(false)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
            >
              {tp("clearLowStockFilter")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setLowStockOnly(true)}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100"
            >
              {tp("lowStockOnly")}
            </button>
          )}
        </div>
      </div>

      {loadError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {loadError}
        </p>
      ) : null}

      {scanMode ? (
        <p className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-950">
          {tp("scanModeHelp")}
        </p>
      ) : null}

      {lowStockOnly ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {tp("lowStockFilterHelp")}
        </p>
      ) : null}

      {unknownBarcode ? (
        <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
          {tp("unknownBarcode")}{" "}
          <Link
            href={`/dashboard/products/new?barcode=${encodeURIComponent(safeQ.trim())}&scan=1`}
            className="font-medium underline"
          >
            {tp("addProductBarcode")}
          </Link>
        </p>
      ) : null}

      <div className="relative mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {loading ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 bg-white/40"
            aria-hidden
          />
        ) : null}
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="w-14 px-4 py-3">{tp("colPhoto")}</th>
              <th className="px-4 py-3">{tp("colName")}</th>
              <th className="px-4 py-3">{tp("colCategory")}</th>
              <th className="px-4 py-3">{tp("colBrand")}</th>
              <th className="px-4 py-3">{tc("sku")}</th>
              <th className="px-4 py-3">{tc("barcode")}</th>
              <th className="px-4 py-3">{tc("unit")}</th>
              <th className="px-4 py-3 text-right">{tc("sale")}</th>
              <th className="px-4 py-3 text-right">{tc("stock")}</th>
              <th className="px-4 py-3">{tc("status")}</th>
              {canEdit ? <th className="px-4 py-3 text-right">{tc("actions")}</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading && products.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 11 : 10}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  {tp("loadingRows")}
                </td>
              </tr>
            ) : !loading && products.length === 0 ? (
              <tr>
                <td
                  colSpan={canEdit ? 11 : 10}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  {lowStockOnly
                    ? safeQ
                      ? tp("emptyLowSearch")
                      : tp("emptyLowNone")
                    : safeQ
                      ? tp("emptySearch")
                      : tp("emptyNone")}
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const low = p.current_stock <= p.reorder_level && p.reorder_level > 0;
                return (
                  <tr key={p.id} className="text-zinc-800">
                    <td className="px-4 py-3">
                      {p.image_url ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-md border border-zinc-200">
                          <Image
                            src={p.image_url}
                            alt=""
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <span className="text-zinc-400">{tc("dash")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="max-w-[8rem] truncate px-4 py-3 text-zinc-600">
                      {p.category?.trim() ? p.category : tc("dash")}
                    </td>
                    <td className="max-w-[8rem] truncate px-4 py-3 text-zinc-600">
                      {p.brand?.trim() ? p.brand : tc("dash")}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{p.sku ?? tc("dash")}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                      {p.barcode ?? tc("dash")}
                    </td>
                    <td className="px-4 py-3">{p.unit}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{pkr.format(p.sale_price)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={low ? "font-medium text-amber-700" : ""}>
                        {p.current_stock}
                      </span>
                      {low ? (
                        <span className="ml-1 text-xs text-amber-600">{tc("low")}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-800">
                          {tc("active")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-700">
                          {tc("inactive")}
                        </span>
                      )}
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/products/${p.id}/edit`}
                          className="text-sm font-medium text-zinc-900 underline hover:no-underline"
                        >
                          {tc("edit")}
                        </Link>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!safeQ && !lowStockOnly ? (
        <p className="mt-2 text-xs text-zinc-500">{tp("browseHint")}</p>
      ) : null}
    </div>
  );
}
