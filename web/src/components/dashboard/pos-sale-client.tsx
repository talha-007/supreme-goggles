"use client";

import type { CustomerOption } from "@/components/invoices/invoice-editor";
import {
  saveDraftAndFinalizeCash,
  saveDraftAndFinalizeCredit,
  saveDraftAndSubmitToKitchen,
  saveInvoiceDraft,
  type LineDraft,
  type SaveDraftInput,
} from "@/lib/invoices/actions";
import { invoiceTotals, lineTotal } from "@/lib/invoices/calc";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { looksLikeBarcode } from "@/lib/products/barcode-utils";
import { sanitizeProductSearchQuery } from "@/lib/products/search-query";
import { SearchableFilterList } from "@/components/ui/searchable-filter-list";
import type { InvoiceEditorDefaults } from "@/types/invoice";
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
  useTransition,
  type KeyboardEvent,
} from "react";

export type PosSaleClientProps = {
  initialCatalogProducts: ProductRow[];
  customers: CustomerOption[];
  restaurantTables?: { id: string; name: string }[];
  restaurantWaiters?: { id: string; name: string }[];
  forceRestaurantMode?: boolean;
  restaurantWorkflowMode?: "counter-sale" | "order-to-kitchen";
  defaultWaiterId?: string | null;
  invoiceDefaults: InvoiceEditorDefaults | null;
  cancelHref: string;
  firstDraftSaveBehavior: "navigate-to-edit" | "refresh-only";
  fullPageInvoiceHref: string;
};

type Props = PosSaleClientProps;

async function fetchProductSearch(
  q: string,
  signal: AbortSignal,
  options?: { menuOnly?: boolean },
): Promise<ProductRow[]> {
  const params = new URLSearchParams();
  const sq = sanitizeProductSearchQuery(q);
  if (sq) params.set("q", sq);
  params.set("limit", sq ? "100" : "80");
  if (options?.menuOnly) {
    params.set("menuOnly", "1");
  }
  const res = await fetch(`/api/dashboard/products/search?${params}`, { signal });
  const json = (await res.json()) as { products?: ProductRow[]; error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? "__SEARCH_FAILED__");
  }
  return json.products ?? [];
}

const NONE_KEY = "__none__";

function categoryLabel(key: string, t: (k: string) => string) {
  return key === NONE_KEY ? t("uncategorized") : key;
}

function tagClassForCategory(name: string): string {
  const palette = [
    "bg-brand-100 text-brand-900",
    "bg-sky-100 text-sky-900",
    "bg-amber-100 text-amber-900",
    "bg-rose-100 text-rose-900",
    "bg-violet-100 text-violet-900",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % palette.length;
  return palette[h]!;
}

export function PosSaleClient({
  initialCatalogProducts,
  customers,
  restaurantTables = [],
  restaurantWaiters = [],
  forceRestaurantMode = false,
  restaurantWorkflowMode = "counter-sale",
  defaultWaiterId = null,
  invoiceDefaults = null,
  cancelHref,
  firstDraftSaveBehavior,
  fullPageInvoiceHref,
}: Props) {
  const tp = useTranslations("posSale");
  const ti = useTranslations("invoiceEditor");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  /** Blocks a second cash/credit finalize before the first server action returns (avoids duplicate stock moves). */
  const finalizeInFlightRef = useRef(false);

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

  /** `null` until mount so server + first client paint match (avoids hydration mismatch on time). */
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const defaultLineDisc = invoiceDefaults?.defaultLineDiscountPct ?? 0;
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [restaurantTableId, setRestaurantTableId] = useState("");
  const [waiterId, setWaiterId] = useState(defaultWaiterId ?? "");
  const [serviceMode, setServiceMode] = useState<"counter" | "dine_in" | "takeaway" | "delivery">("counter");
  const [restaurantOrderStatus, setRestaurantOrderStatus] = useState<
    "new" | "preparing" | "served" | "settled"
  >(restaurantWorkflowMode === "order-to-kitchen" ? "new" : "served");
  const [discountAmount, setDiscountAmount] = useState(
    String(invoiceDefaults?.defaultInvoiceDiscountAmount ?? 0),
  );
  const [taxRate, setTaxRate] = useState(String(invoiceDefaults?.defaultTaxRate ?? 0));
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [cashReceived, setCashReceived] = useState("");
  /** Below `xl`, toggle between product grid and cart/checkout. */
  const [mobileTab, setMobileTab] = useState<"menu" | "cart">("menu");

  const [q, setQ] = useState("");
  const [displayedProducts, setDisplayedProducts] = useState<ProductRow[]>(initialCatalogProducts);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [categoryKey, setCategoryKey] = useState<string>("all");
  const [brandKey, setBrandKey] = useState<string>("all");
  const menuOnlySearch = restaurantWorkflowMode === "order-to-kitchen";

  useEffect(() => {
    const sq = sanitizeProductSearchQuery(q);
    if (sq === "") {
      setDisplayedProducts(initialCatalogProducts);
      setLoading(false);
      setLoadError(null);
      return;
    }
    const ac = new AbortController();
    const debounceTimer = window.setTimeout(async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await fetchProductSearch(q, ac.signal, {
          menuOnly: menuOnlySearch,
        });
        setDisplayedProducts(rows);
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
  }, [q, initialCatalogProducts, menuOnlySearch, tp]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: initialCatalogProducts.length };
    for (const p of initialCatalogProducts) {
      const k = p.category?.trim() || NONE_KEY;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [initialCatalogProducts]);

  const categoryKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of initialCatalogProducts) {
      set.add(p.category?.trim() || NONE_KEY);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [initialCatalogProducts]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = { all: initialCatalogProducts.length };
    for (const p of initialCatalogProducts) {
      const k = p.brand?.trim() || NONE_KEY;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [initialCatalogProducts]);

  const brandKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of initialCatalogProducts) {
      set.add(p.brand?.trim() || NONE_KEY);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [initialCatalogProducts]);

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
    let list = displayedProducts;
    if (categoryKey !== "all") {
      list = list.filter((p) => (p.category?.trim() || NONE_KEY) === categoryKey);
    }
    if (brandKey !== "all") {
      list = list.filter((p) => (p.brand?.trim() || NONE_KEY) === brandKey);
    }
    return list;
  }, [displayedProducts, categoryKey, brandKey]);

  const productById = useMemo(() => {
    const m = new Map<string, ProductRow>();
    for (const p of initialCatalogProducts) m.set(p.id, p);
    for (const p of displayedProducts) m.set(p.id, p);
    return m;
  }, [initialCatalogProducts, displayedProducts]);

  const previewTotals = useMemo(() => {
    const lineTotals = lines.map((l) =>
      lineTotal(l.quantity, l.unit_price, l.discount_pct),
    );
    const disc = Number(String(discountAmount).replace(/,/g, "")) || 0;
    const taxPct = Number(String(taxRate).replace(/,/g, "")) || 0;
    const { subtotal, tax_amount, total_amount } = invoiceTotals(lineTotals, disc, taxPct);
    return { subtotal, tax: tax_amount, total: total_amount };
  }, [lines, discountAmount, taxRate]);

  useEffect(() => {
    setCashReceived(previewTotals.total.toFixed(2));
  }, [previewTotals.total]);

  const cashChange = useMemo(() => {
    const total = previewTotals.total;
    const r = Number(String(cashReceived).replace(/,/g, ""));
    if (!Number.isFinite(r) || r + 0.001 < total) return null;
    return Math.round((r - total) * 100) / 100;
  }, [cashReceived, previewTotals.total]);
  const isRestaurantMode =
    forceRestaurantMode || restaurantTables.length > 0 || restaurantWaiters.length > 0;

  const addProduct = useCallback(
    (p: ProductRow) => {
      setError(null);
      const restaurantMode =
        forceRestaurantMode || restaurantTables.length > 0 || restaurantWaiters.length > 0;
      const enforceStock = !restaurantMode || p.is_menu_item !== true;
      if (enforceStock && p.current_stock <= 0) {
        setError(tp("outOfStock"));
        return;
      }
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.product_id === p.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return next;
        }
        return [
          ...prev,
          {
            product_id: p.id,
            product_name: p.name,
            unit: p.unit,
            quantity: 1,
            unit_price: p.sale_price,
            discount_pct: defaultLineDisc,
          },
        ];
      });
    },
    [
      defaultLineDisc,
      forceRestaurantMode,
      restaurantTables.length,
      restaurantWaiters.length,
      tp,
    ],
  );

  function updateLineQty(i: number, delta: number) {
    setLines((prev) => {
      const next = [...prev];
      const qn = Math.max(0, next[i]!.quantity + delta);
      if (qn === 0) return prev.filter((_, j) => j !== i);
      next[i] = { ...next[i]!, quantity: qn };
      return next;
    });
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, j) => j !== i));
  }

  function updateLineUnitPrice(i: number, raw: string) {
    setLines((prev) => {
      const next = [...prev];
      const v = Number(String(raw).replace(/,/g, ""));
      if (!Number.isFinite(v) || v < 0) return prev;
      next[i] = { ...next[i]!, unit_price: Math.round(v * 100) / 100 };
      return next;
    });
  }

  function buildInput(): SaveDraftInput {
    const disc = Number(discountAmount.replace(/,/g, "")) || 0;
    const tax = Number(taxRate.replace(/,/g, "")) || 0;
    const received = Number(String(cashReceived).replace(/,/g, ""));
    return {
      invoiceId,
      customerId: customerId || null,
      restaurantTableId: restaurantTableId || null,
      waiterId: waiterId || null,
      serviceMode,
      restaurantOrderStatus,
      discount_amount: disc,
      tax_rate: tax,
      notes: notes.trim() || null,
      due_date: dueDate || null,
      lines,
      cashAmountReceived: Number.isFinite(received) ? received : null,
    };
  }

  function save() {
    setError(null);
    const wasNew = invoiceId === null;
    startTransition(async () => {
      const res = await saveInvoiceDraft(buildInput());
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.invoiceId) {
        setInvoiceId(res.invoiceId);
        if (wasNew) {
          if (firstDraftSaveBehavior === "navigate-to-edit") {
            router.push(`/dashboard/invoices/${res.invoiceId}/edit`);
          }
        }
      }
    });
  }

  function sendToKitchen() {
    setError(null);
    if (!restaurantTableId) {
      setError("Select a table before sending to kitchen.");
      return;
    }
    if (restaurantWorkflowMode === "order-to-kitchen" && !waiterId) {
      setError("Select waiter before sending to kitchen.");
      return;
    }
    startTransition(async () => {
      const res = await saveDraftAndSubmitToKitchen({
        ...buildInput(),
        restaurantOrderStatus: "new",
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.invoiceId) {
        // Start fresh for the next customer after successful kitchen handoff.
        setInvoiceId(null);
        setCustomerId("");
        setRestaurantTableId("");
        setWaiterId(defaultWaiterId ?? "");
        setNotes("");
        setLines([]);
        setRestaurantOrderStatus("new");
        setQ("");
        setMobileTab("menu");
      }
    });
  }

  function chargeCash() {
    if (finalizeInFlightRef.current || pending) return;
    setError(null);
    const total = previewTotals.total;
    const received = Number(String(cashReceived).replace(/,/g, ""));
    if (!Number.isFinite(received) || received <= 0) {
      setError(ti("errorCashAmount"));
      return;
    }
    if (received + 0.005 < total) {
      setError(ti("errorCashLow"));
      return;
    }
    finalizeInFlightRef.current = true;
    startTransition(async () => {
      try {
        const res = await saveDraftAndFinalizeCash(buildInput());
        if (res.error) {
          setError(res.error);
          return;
        }
        if (res.invoiceId) setInvoiceId(res.invoiceId);
      } finally {
        finalizeInFlightRef.current = false;
      }
    });
  }

  function chargeCredit() {
    if (finalizeInFlightRef.current || pending) return;
    setError(null);
    finalizeInFlightRef.current = true;
    startTransition(async () => {
      try {
        const res = await saveDraftAndFinalizeCredit(buildInput());
        if (res.error) {
          setError(res.error);
          return;
        }
        if (res.invoiceId) setInvoiceId(res.invoiceId);
      } finally {
        finalizeInFlightRef.current = false;
      }
    });
  }

  const safeQ = sanitizeProductSearchQuery(q);
  const unknownBarcode =
    !loading &&
    filteredGrid.length === 0 &&
    safeQ.length > 0 &&
    looksLikeBarcode(safeQ);

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const sq = sanitizeProductSearchQuery(q);
    if (!sq) return;
    const exact = displayedProducts.filter((p) => p.barcode && p.barcode.trim() === sq.trim());
    if (exact.length === 1) {
      e.preventDefault();
      addProduct(exact[0]!);
      setQ("");
    }
  }

  const dateStr =
    now?.toLocaleDateString(intlLocaleTag(locale), {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }) ?? "â€”";
  const timeStr =
    now?.toLocaleTimeString(intlLocaleTag(locale), {
      hour: "2-digit",
      minute: "2-digit",
    }) ?? "â€”";

  const showMobileCartBar = lines.length > 0 && mobileTab === "menu";

  return (
    <div
      className={`relative flex flex-col gap-4 xl:pb-28 xl:pt-0 ${showMobileCartBar ? "max-xl:pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]" : ""}`}
    >
      <div
        className="sticky top-0 z-20 flex gap-1 rounded-2xl border border-zinc-200/90 bg-white/95 p-1 shadow-sm backdrop-blur-md xl:hidden"
        role="tablist"
        aria-label={tp("browseTab")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "menu"}
          onClick={() => setMobileTab("menu")}
          className={`min-h-[44px] flex-1 touch-manipulation rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            mobileTab === "menu"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {tp("browseTab")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "cart"}
          onClick={() => setMobileTab("cart")}
          className={`relative min-h-[44px] flex-1 touch-manipulation rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            mobileTab === "cart"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          {tp("cartTab")}
          {lines.length > 0 ? (
            <span
              className={`ms-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                mobileTab === "cart" ? "bg-white/25 text-white" : "bg-blue-100 text-blue-800"
              }`}
            >
              {lines.length}
            </span>
          ) : null}
        </button>
      </div>

      <div className="mb-0 hidden gap-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:p-4 xl:flex xl:flex-wrap xl:items-end">
        <div className="flex min-w-0 items-center gap-2 xl:w-[min(100%,300px)]">
          <label htmlFor="pos-customer-top" className="sr-only">
            {ti("customer")}
          </label>
          <select
            id="pos-customer-top"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">{ti("walkInOption")}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Link
            href="/dashboard/customers/new"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-semibold leading-none text-white shadow-sm hover:bg-blue-700"
            title={tp("addCustomer")}
          >
            +
          </Link>
        </div>
        {isRestaurantMode && restaurantWorkflowMode === "order-to-kitchen" ? (
          <div className="min-w-[220px] xl:w-[min(100%,260px)]">
            <label htmlFor="pos-table-top" className="mb-1 block text-xs font-medium text-zinc-500">
              Select table (required)
            </label>
            <select
              id="pos-table-top"
              value={restaurantTableId}
              onChange={(e) => setRestaurantTableId(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900"
            >
              <option value="">Select table (required)</option>
              {restaurantTables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="relative min-w-[240px] flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
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
            onKeyDown={onSearchKeyDown}
            placeholder={tp("searchPlaceholder")}
            autoComplete="off"
            enterKeyHint="search"
            aria-label={tp("posTopSearchHint")}
            className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2.5 pl-11 pr-4 text-sm text-zinc-900 outline-none ring-blue-500/30 focus:border-blue-400 focus:bg-white focus:ring-2"
          />
          {loading ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{tp("searching")}</span>
          ) : null}
        </div>
        <p className="hidden text-end text-xs text-zinc-500 xl:ms-auto xl:block">
          {dateStr} Â· {timeStr}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-6">
      <div
        className={`min-h-0 min-w-0 flex-1 xl:order-2 xl:max-w-none ${mobileTab === "menu" ? "block" : "hidden xl:block"}`}
      >
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-visible rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm sm:p-5 xl:min-h-[min(100vh-9rem,780px)]">
          <div className="flex flex-col gap-2 border-b border-zinc-100 pb-3 xl:hidden">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                  {tp("catalogTitle")}
                </p>
                <p className="text-sm text-zinc-500">
                  {dateStr} Â· {timeStr}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
                {tp("openSale")}
              </span>
            </div>
            <div className="flex min-w-0 gap-2 overflow-visible">
              <SearchableFilterList
                layout="inline"
                popoverAlign="start"
                groupLabel={tp("categoryFilter")}
                items={categoryFilterItems}
                value={categoryKey}
                onChange={setCategoryKey}
                searchPlaceholder={tp("searchCategories")}
                noMatchesLabel={tp("filterNoMatches")}
                variant="blue"
              />
              <SearchableFilterList
                layout="inline"
                popoverAlign="end"
                groupLabel={tp("brandFilter")}
                items={brandFilterItems}
                value={brandKey}
                onChange={setBrandKey}
                searchPlaceholder={tp("searchBrands")}
                noMatchesLabel={tp("filterNoMatches")}
                variant="violet"
              />
            </div>
          </div>

          <div className="hidden items-center gap-2 border-b border-zinc-100 pb-3 xl:flex">
            <p className="shrink-0 text-sm font-semibold text-zinc-900">{tp("catalogTitle")}</p>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 overflow-visible">
              <SearchableFilterList
                layout="inline"
                popoverAlign="start"
                groupLabel={tp("categoryFilter")}
                items={categoryFilterItems}
                value={categoryKey}
                onChange={setCategoryKey}
                searchPlaceholder={tp("searchCategories")}
                noMatchesLabel={tp("filterNoMatches")}
                variant="blue"
              />
              <SearchableFilterList
                layout="inline"
                popoverAlign="end"
                groupLabel={tp("brandFilter")}
                items={brandFilterItems}
                value={brandKey}
                onChange={setBrandKey}
                searchPlaceholder={tp("searchBrands")}
                noMatchesLabel={tp("filterNoMatches")}
                variant="violet"
              />
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
              {tp("openSale")}
            </span>
          </div>

          <div className="relative border-b border-zinc-100 pb-3 xl:hidden">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              ref={searchInputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={tp("searchPlaceholder")}
              autoComplete="off"
              enterKeyHint="search"
              className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50/80 py-2.5 pl-11 pr-4 text-sm text-zinc-900 outline-none ring-blue-500/30 focus:border-blue-400 focus:bg-white focus:ring-2"
            />
            {loading ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                {tp("searching")}
              </span>
            ) : null}
          </div>

          {loadError ? (
            <p className="text-sm text-red-600" role="alert">
              {loadError}
            </p>
          ) : null}

          {unknownBarcode ? (
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
              {tp("unknownBarcode")}{" "}
              <Link href={`/dashboard/products/new?barcode=${encodeURIComponent(safeQ.trim())}`} className="font-medium underline">
                {tp("addProduct")}
              </Link>
            </p>
          ) : null}

          <div className="relative min-h-[180px] flex-1 sm:min-h-[240px] xl:min-h-0">
            {loading ? (
              <div className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-white/50" />
            ) : null}
            <div className="grid max-h-[min(56vh,600px)] grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:max-h-[min(calc(100vh-13rem),680px)] 2xl:grid-cols-5">
              {filteredGrid.map((p) => {
                const cat = p.category?.trim() || tp("uncategorized");
                const br = p.brand?.trim() || null;
                const enforceStock = !isRestaurantMode || p.is_menu_item !== true;
                const out = enforceStock && p.current_stock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={out}
                    onClick={() => addProduct(p)}
                    className={`group flex h-full touch-manipulation flex-col overflow-hidden rounded-2xl border text-left transition active:scale-[0.98] ${
                      out
                        ? "cursor-not-allowed border-zinc-200 opacity-60"
                        : "border-zinc-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    <div className="relative h-[5.5rem] w-full shrink-0 bg-zinc-100 sm:h-[6.25rem]">
                      {p.image_url ? (
                        <Image
                          src={p.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 45vw, (max-width: 1280px) 20vw, 14vw"
                          quality={65}
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-lg font-semibold text-zinc-400">
                          {p.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2.5">
                      <span className="line-clamp-2 min-h-[2.4em] text-xs font-semibold leading-tight text-zinc-900 sm:text-sm">
                        {p.name}
                      </span>
                      <div className="flex flex-wrap gap-0.5">
                        <span
                          className={`inline-flex max-w-full truncate rounded px-1 py-0.5 text-[9px] font-medium ${tagClassForCategory(cat)}`}
                        >
                          {cat}
                        </span>
                        {br ? (
                          <span className="inline-flex max-w-full truncate rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-[9px] font-medium text-zinc-700">
                            {br}
                          </span>
                        ) : null}
                      </div>
                      <span className="mt-auto pt-0.5 text-right text-xs font-semibold tabular-nums text-blue-700 sm:text-sm">
                        {pkr.format(p.sale_price)}
                      </span>
                      <span className="text-[9px] leading-tight text-zinc-500">
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
            {!loading && filteredGrid.length === 0 ? (
              <p className="py-12 text-center text-sm text-zinc-500">{tp("noProducts")}</p>
            ) : null}
          </div>
        </div>
      </div>

      <aside
        className={`flex w-full shrink-0 flex-col xl:sticky xl:top-4 xl:order-1 xl:w-[min(100%,460px)] xl:self-start ${mobileTab === "cart" ? "block" : "hidden xl:block"}`}
      >
        <div className="flex min-h-0 w-full max-w-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-lg shadow-zinc-200/50 max-xl:max-h-[min(92dvh,840px)] xl:min-h-[min(100vh-8rem,720px)]">
          <div className="shrink-0 border-b border-zinc-100 px-3 py-3 sm:px-4 sm:py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{tp("cartTitle")}</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {invoiceId ? tp("orderSaved") : tp("newOrder")}
                </p>
              </div>
              <Link
                href={fullPageInvoiceHref}
                className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                title={tp("openFullEditor")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Link>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-b border-dashed border-zinc-200 max-xl:max-h-[min(36vh,280px)] xl:min-h-0 xl:max-h-none">
            <div className="flex items-center justify-between px-3 py-2 sm:px-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {ti("linesTitle")}
              </span>
              <span className="text-xs tabular-nums text-zinc-500">{lines.length}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 [-webkit-overflow-scrolling:touch] xl:px-3">
              {lines.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-zinc-400">{tp("noItems")}</p>
              ) : (
                <>
                  <table className="hidden w-full table-fixed border-collapse text-left text-sm xl:table">
                    <colgroup>
                      <col className="min-w-0" />
                      <col className="w-[7.75rem]" />
                      <col className="w-[5.75rem]" />
                      <col className="w-[4.75rem]" />
                      <col className="w-8" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-zinc-200 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        <th className="min-w-0 py-2 pe-2">{ti("colProduct")}</th>
                        <th className="py-2 pe-1">{ti("colQty")}</th>
                        <th className="py-2 pe-1">{ti("colPrice")}</th>
                        <th className="py-2 pe-1">{ti("colLine")}</th>
                        <th className="py-2 text-end" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => {
                        const img = line.product_id ? productById.get(line.product_id)?.image_url : null;
                        const lt = lineTotal(line.quantity, line.unit_price, line.discount_pct);
                        return (
                          <tr
                            key={`${line.product_id ?? "x"}-${i}`}
                            className="border-b border-zinc-100"
                          >
                            <td className="min-w-0 overflow-hidden align-middle py-2 pe-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-zinc-200">
                                  {img ? (
                                    <Image src={img} alt="" fill className="object-cover" sizes="36px" />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-[10px] font-semibold text-zinc-500">
                                      {line.product_name.slice(0, 1)}
                                    </div>
                                  )}
                                </div>
                                <span className="line-clamp-2 text-xs font-medium leading-snug text-zinc-900">
                                  {line.product_name}
                                </span>
                              </div>
                            </td>
                            <td className="w-[7.75rem] min-w-[7.75rem] max-w-[7.75rem] overflow-hidden align-middle py-2 pe-1">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateLineQty(i, -1)}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50"
                                >
                                  âˆ’
                                </button>
                                <span className="min-w-[1.25rem] shrink-0 text-center text-xs tabular-nums">{line.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateLineQty(i, 1)}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="w-[5.75rem] min-w-[5.75rem] max-w-[5.75rem] overflow-hidden align-middle py-2 pe-1">
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step="0.01"
                                value={line.unit_price}
                                onChange={(e) => updateLineUnitPrice(i, e.target.value)}
                                className="box-border h-8 w-full min-w-0 max-w-full rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0 text-end text-xs tabular-nums text-zinc-900 shadow-none outline-none ring-0 transition placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield] [-moz-appearance:textfield]"
                              />
                            </td>
                            <td className="w-[4.75rem] min-w-[4.75rem] max-w-[4.75rem] overflow-hidden align-middle py-2 pe-1 text-xs font-semibold tabular-nums text-zinc-900">
                              {lt.toFixed(2)}
                            </td>
                            <td className="w-8 min-w-8 max-w-8 overflow-hidden align-middle py-2 text-end">
                              <button
                                type="button"
                                onClick={() => removeLine(i)}
                                className="rounded p-1 text-lg leading-none text-red-600 hover:bg-red-50"
                                aria-label={tp("removeLine")}
                              >
                                Ã—
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <ul className="flex flex-col gap-2 xl:hidden">
                    {lines.map((line, i) => {
                      const img = line.product_id ? productById.get(line.product_id)?.image_url : null;
                      const lt = lineTotal(line.quantity, line.unit_price, line.discount_pct);
                      return (
                        <li
                          key={`${line.product_id ?? "x"}-${i}`}
                          className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-2 py-2"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-200">
                            {img ? (
                              <Image src={img} alt="" fill className="object-cover" sizes="48px" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs font-semibold text-zinc-500">
                                {line.product_name.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-900">{line.product_name}</p>
                            <p className="text-xs text-zinc-500">
                              {pkr.format(line.unit_price)} Ã— {line.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <button
                              type="button"
                              onClick={() => updateLineQty(i, -1)}
                              className="flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg border border-zinc-200 text-lg leading-none text-zinc-700 hover:bg-white active:bg-zinc-100"
                            >
                              âˆ’
                            </button>
                            <button
                              type="button"
                              onClick={() => updateLineQty(i, 1)}
                              className="flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center rounded-lg border border-zinc-200 text-lg leading-none text-zinc-700 hover:bg-white active:bg-zinc-100"
                            >
                              +
                            </button>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-semibold tabular-nums text-zinc-900">
                              {lt.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              className="text-[11px] text-red-600 hover:underline"
                            >
                              {tp("removeLine")}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-zinc-200 bg-white shadow-[0_-6px_24px_rgba(0,0,0,0.04)]">
            <div className="space-y-2 px-3 py-3 sm:px-4 xl:hidden">
              <label className="block text-xs font-medium text-zinc-500" htmlFor="pos-customer">
                {ti("customer")}
              </label>
              <select
                id="pos-customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-base text-zinc-900 sm:text-sm"
              >
                <option value="">{ti("walkInOption")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {isRestaurantMode ? (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={restaurantTableId}
                    onChange={(e) => setRestaurantTableId(e.target.value)}
                    className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900"
                  >
                    <option value="">
                      {restaurantWorkflowMode === "order-to-kitchen" ? "Select table (required)" : tp("tableOptional")}
                    </option>
                    {restaurantTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={waiterId}
                    onChange={(e) => setWaiterId(e.target.value)}
                    className="min-h-[44px] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900"
                  >
                    <option value="">
                      {restaurantWorkflowMode === "order-to-kitchen" ? "Select waiter (required)" : tp("waiterOptional")}
                    </option>
                    {restaurantWaiters.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="space-y-2 px-3 pb-3 sm:px-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">{tp("subtotal")}</span>
              <span className="tabular-nums font-medium text-zinc-900">
                {pkr.format(previewTotals.subtotal)}
              </span>
            </div>
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <label className="text-zinc-500" htmlFor="pos-tax">
                {ti("taxRate")}
              </label>
              <input
                id="pos-tax"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-right text-base sm:min-h-0 sm:w-24 sm:py-1 sm:text-sm"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">{tp("tax")}</span>
              <span className="tabular-nums font-medium text-zinc-900">
                {pkr.format(previewTotals.tax)}
              </span>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-2 text-base xl:hidden">
              <span className="font-semibold text-zinc-900">{tp("total")}</span>
              <span className="font-bold tabular-nums text-blue-700">
                {pkr.format(previewTotals.total)}
              </span>
            </div>
            <div className="pt-1">
              <label className="text-xs font-medium text-zinc-500" htmlFor="pos-disc">
                {ti("invoiceDiscount")}
              </label>
              <input
                id="pos-disc"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-base sm:min-h-0 sm:text-sm"
              />
            </div>
            </div>

            <details className="mx-3 mb-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2 text-xs sm:mx-4">
              <summary className="cursor-pointer font-medium text-zinc-600">{tp("moreOptions")}</summary>
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-zinc-500">{ti("dueDate")}</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="text-zinc-500">{ti("notes")}</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5"
                  />
                </div>
                {isRestaurantMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-zinc-500">{tp("serviceMode")}</label>
                      <select
                        value={serviceMode}
                        onChange={(e) => setServiceMode(e.target.value as typeof serviceMode)}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5"
                      >
                        <option value="counter">{tp("serviceCounter")}</option>
                        <option value="dine_in">{tp("serviceDineIn")}</option>
                        <option value="takeaway">{tp("serviceTakeaway")}</option>
                        <option value="delivery">{tp("serviceDelivery")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-zinc-500">{tp("orderStatus")}</label>
                      <select
                        value={restaurantOrderStatus}
                        onChange={(e) =>
                          setRestaurantOrderStatus(e.target.value as typeof restaurantOrderStatus)
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5"
                      >
                        <option value="new">{tp("orderStatusNew")}</option>
                        <option value="preparing">{tp("orderStatusPreparing")}</option>
                        <option value="served">{tp("orderStatusServed")}</option>
                        <option value="settled">{tp("orderStatusSettled")}</option>
                      </select>
                    </div>
                  </div>
                ) : null}
              </div>
            </details>

          <div className="space-y-3 border-t border-zinc-100 px-3 py-4 sm:px-4 xl:hidden">
            {restaurantWorkflowMode === "order-to-kitchen" ? (
              <button
                type="button"
                onClick={sendToKitchen}
                disabled={pending || lines.length === 0}
                className="min-h-[52px] w-full touch-manipulation rounded-2xl bg-amber-600 py-3.5 text-base font-semibold text-white shadow-md shadow-amber-600/25 transition hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 sm:text-sm"
              >
                {pending ? tc("working") : "Send to kitchen"}
              </button>
            ) : null}
            <div className="rounded-xl border border-brand-200/80 bg-brand-50/90 px-3 py-2">
              <label className="text-xs font-medium text-brand-900">{ti("cashReceived")}</label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="mt-1 min-h-[48px] w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-base tabular-nums sm:min-h-0 sm:py-2 sm:text-sm"
              />
              {cashChange != null && cashChange > 0.005 ? (
                <p className="mt-1 text-xs font-semibold text-brand-800">
                  {ti("changeDue")}{" "}
                  {cashChange.toLocaleString(intlLocaleTag(locale), {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  PKR
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-brand-800/80">{ti("cashTenderHint")}</p>
              )}
            </div>

            {restaurantWorkflowMode === "counter-sale" ? (
              <>
                <button
                  type="button"
                  onClick={chargeCash}
                  disabled={pending || lines.length === 0}
                  className="min-h-[52px] w-full touch-manipulation rounded-2xl bg-blue-600 py-3.5 text-base font-semibold text-white shadow-md shadow-blue-600/25 transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 sm:text-sm"
                >
                  {pending ? tc("working") : tp("placeOrderCash")}
                </button>
                <button
                  type="button"
                  onClick={chargeCredit}
                  disabled={pending || lines.length === 0}
                  className="min-h-[48px] w-full touch-manipulation rounded-2xl border-2 border-blue-200 bg-white py-3 text-base font-semibold text-blue-800 hover:bg-blue-50 active:bg-blue-100/80 disabled:opacity-50 sm:text-sm"
                >
                  {pending ? tc("working") : ti("creditLater")}
                </button>
              </>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={cancelHref}
                className="flex min-h-[48px] flex-1 touch-manipulation items-center justify-center rounded-xl border border-zinc-300 py-3 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100"
              >
                {ti("cancel")}
              </Link>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="min-h-[48px] flex-1 touch-manipulation rounded-xl border border-zinc-300 bg-white py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-50"
              >
                {pending ? tc("saving") : ti("saveDraft")}
              </button>
            </div>

            <p className="text-center text-[11px] leading-relaxed text-zinc-500">{tp("helpHint")}</p>
          </div>
          </div>

          {error ? (
            <p className="border-t border-red-100 px-4 py-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </aside>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 hidden gap-3 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.1)] backdrop-blur-md xl:flex xl:flex-wrap xl:items-center xl:justify-between xl:gap-3 xl:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:left-56"
        role="region"
        aria-label={tp("cartTitle")}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="min-h-[40px] rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            {pending ? tc("saving") : ti("saveDraft")}
          </button>
          {restaurantWorkflowMode === "counter-sale" ? (
            <button
              type="button"
              onClick={chargeCredit}
              disabled={pending || lines.length === 0}
              className="min-h-[40px] rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-50"
            >
              {pending ? tc("working") : ti("creditLater")}
            </button>
          ) : (
            <button
              type="button"
              onClick={sendToKitchen}
              disabled={pending || lines.length === 0}
              className="min-h-[40px] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              {pending ? tc("working") : "Send to kitchen"}
            </button>
          )}
          <Link
            href={cancelHref}
            className="inline-flex min-h-[40px] items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            {ti("cancel")}
          </Link>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:justify-center">
          <label className="sr-only" htmlFor="pos-cash-xl">
            {ti("cashReceived")}
          </label>
          <input
            id="pos-cash-xl"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
            className="h-10 w-[7.5rem] rounded-lg border border-brand-200 bg-brand-50/80 px-2 text-sm tabular-nums"
          />
          {restaurantWorkflowMode === "counter-sale" ? (
            <button
              type="button"
              onClick={chargeCash}
              disabled={pending || lines.length === 0}
              className="min-h-[44px] min-w-[8rem] rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? tc("working") : tp("placeOrderCash")}
            </button>
          ) : null}
        </div>
        <div className="flex w-full flex-wrap items-end justify-between gap-3 sm:ms-auto sm:w-auto sm:justify-end">
          <div className="text-end">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {tp("totalPayable")}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-tight text-blue-700">
              {pkr.format(previewTotals.total)}
            </p>
          </div>
          <Link
            href="/dashboard/invoices"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {tp("recentInvoices")}
          </Link>
        </div>
      </div>

      {showMobileCartBar ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-zinc-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md xl:hidden"
          role="status"
          aria-live="polite"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{tp("total")}</p>
            <p className="truncate text-lg font-bold tabular-nums text-blue-700">
              {pkr.format(previewTotals.total)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileTab("cart")}
            className="min-h-[48px] shrink-0 touch-manipulation rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm active:bg-blue-800"
          >
            {tp("viewCart")} ({lines.length})
          </button>
        </div>
      ) : null}
    </div>
  );
}
