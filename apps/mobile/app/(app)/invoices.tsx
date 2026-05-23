import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import { BRAND_ACCENT_HEX } from "../../src/theme/brand";

import { ConfirmDialog } from "../../src/components/ConfirmDialog";
import { ErrorBannerWithSupport } from "../../src/components/ErrorBannerWithSupport";
import { headerRightWithSupport } from "../../src/components/SupportHeaderButton";
import { FormField } from "../../src/components/FormField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProductThumbnail } from "../../src/components/ProductThumbnail";
import { ReceiptShareSheet } from "../../src/components/ReceiptShareSheet";
import { SearchBar } from "../../src/components/SearchBar";
import { useAuth } from "../../src/contexts/auth-context";
import { useRealtimeNotifications } from "../../src/contexts/realtime-notifications-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import { fetchReceiptTextForInvoice } from "../../src/lib/receipt-fetch";
import {
  createAndFinalizeCashSale,
  createAndFinalizeCreditSale,
  createInvoiceDraft,
  finalizeDraftInvoiceCash,
  finalizeDraftInvoiceCredit,
  reverseInvoice,
  type DraftLineInput,
} from "../../src/lib/invoice-workflow";
import {
  getRangeStartForPreset,
  INVOICE_DATE_FILTER_OPTIONS,
  type DateRangePreset,
} from "../../src/lib/date-range-presets";
import { formatPkr } from "../../src/lib/format-money";
import { supabase } from "../../src/lib/supabase";
import { buildCreditInvoiceAlert, openWhatsAppMessage } from "../../src/lib/whatsapp-alerts";
import {
  bottomSheetContainerClass,
  chipInactiveBorder,
  chipInactiveText,
  formLineItemClass,
  hairlineBorderBClass,
  listEntityCardClass,
  modalSecondaryButtonClass,
  screenCenterRootClass,
  scrollCanvasClass,
  subtlePositiveClass,
  textFieldLabelClass,
  textMutedClass,
  textStrongOnSurfaceClass,
  textSubtleClass,
  type ResolvedScheme,
} from "../../src/theme/semantic";
import { useTheme } from "../../src/contexts/theme-context";
import type { CustomerRow } from "../../src/types/customer";
import type { InvoiceItemRow, InvoiceRow, InvoiceStatus } from "../../src/types/invoice";

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function statusLabel(s: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    draft: "Draft",
    unpaid: "Unpaid",
    partial: "Partial",
    paid: "Paid",
    cancelled: "Cancelled",
  };
  return map[s];
}

function statusBadgeClass(s: InvoiceStatus, resolved: ResolvedScheme): string {
  if (s === "cancelled") return "bg-red-950 text-red-400";
  if (s === "paid") return resolved === "dark" ? "bg-brand-950 text-brand-400" : "bg-brand-100 text-brand-800";
  if (s === "draft") return resolved === "dark" ? "bg-neutral-800 text-neutral-400" : "bg-zinc-200 text-zinc-600";
  if (s === "partial") return resolved === "dark" ? "bg-sky-950 text-sky-400" : "bg-sky-100 text-sky-800";
  return resolved === "dark" ? "bg-amber-950 text-amber-400" : "bg-amber-100 text-amber-800";
}

function brandChipActiveSurface(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "border-brand-500 bg-brand-500/15" : "border-brand-500 bg-brand-100";
}

function brandChipActiveText(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-brand-400" : "text-brand-800";
}

function skyChipActiveSurface(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "border-sky-500 bg-sky-500/15" : "border-sky-600 bg-sky-100";
}

function skyChipActiveText(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-sky-400" : "text-sky-800";
}

function ionIconMuted(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "#525252" : "#71717a";
}

function ionIconSecondary(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "#a3a3a3" : "#52525b";
}

function catalogSearchChipClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "mb-3 self-start rounded-lg border border-sky-600/50 bg-sky-950/40 px-3 py-2 active:opacity-90"
    : "mb-3 self-start rounded-lg border border-sky-400/50 bg-sky-50 px-3 py-2 active:opacity-90";
}

function catalogSearchChipText(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-sky-400" : "text-sky-800";
}

function creditSaleCardSurfaceClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-xl border border-amber-600/50 bg-amber-950/25 py-3.5 active:opacity-90 disabled:opacity-50"
    : "rounded-xl border border-amber-400/60 bg-amber-50 py-3.5 active:opacity-90 disabled:opacity-50";
}

function creditSaleSurfaceClass(resolved: ResolvedScheme): string {
  return `mt-2 ${creditSaleCardSurfaceClass(resolved)}`;
}

function creditSaleTextClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-amber-300" : "text-amber-900";
}

function receiptCtaSurfaceClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "mt-4 rounded-xl border border-brand-700/50 bg-brand-950/30 py-3.5 active:opacity-90 disabled:opacity-50"
    : "mt-4 rounded-xl border border-brand-300 bg-brand-50 py-3.5 active:opacity-90 disabled:opacity-50";
}

function receiptCtaTitleClass(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-brand-400" : "text-brand-800";
}

type InvoiceListRow = InvoiceRow & {
  customer: { name: string } | null;
};

type InvoiceDetail = InvoiceRow & {
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
  items: InvoiceItemRow[];
};

type LineDraft = {
  key: string;
  product_id: string | null;
  product_name: string;
  qty: string;
  unit_price: string;
  unit: string;
};

type CatalogPickRow = { id: string; name: string; unit: string; sale_price: number; image_url: string | null };

const INVOICE_FETCH_LIMIT = 500;

function newLine(): LineDraft {
  return {
    key: `${Date.now()}-${Math.random()}`,
    product_id: null,
    product_name: "",
    qty: "1",
    unit_price: "",
    unit: "pcs",
  };
}

type BillFilter = "all" | "draft" | "open" | "credit" | "paid" | "cancelled";

const BILL_FILTERS: { key: BillFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "open", label: "Open" },
  { key: "credit", label: "Credit" },
  { key: "paid", label: "Paid" },
  { key: "cancelled", label: "Cancelled" },
];

function matchesBillFilter(status: InvoiceStatus, key: BillFilter): boolean {
  if (key === "all") return true;
  if (key === "draft") return status === "draft";
  if (key === "open") return status === "unpaid" || status === "partial";
  if (key === "credit") return status === "unpaid" || status === "partial";
  if (key === "paid") return status === "paid";
  if (key === "cancelled") return status === "cancelled";
  return true;
}

function matchesQuery(row: InvoiceListRow, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return (
    row.invoice_number.toLowerCase().includes(s) ||
    (row.customer?.name?.toLowerCase().includes(s) ?? false)
  );
}

function normalizePickRow(row: Record<string, unknown>): CatalogPickRow {
  return {
    id: String(row.id),
    name: String(row.name),
    unit: String(row.unit ?? "pcs"),
    sale_price: Number(row.sale_price),
    image_url: row.image_url != null ? String(row.image_url) : null,
  };
}

function normalizeInvoiceRow(raw: Record<string, unknown>): InvoiceRow {
  return {
    id: String(raw.id),
    business_id: String(raw.business_id),
    invoice_number: String(raw.invoice_number),
    customer_id: raw.customer_id != null ? String(raw.customer_id) : null,
    status: raw.status as InvoiceStatus,
    subtotal: Number(raw.subtotal),
    discount_amount: Number(raw.discount_amount),
    tax_rate: Number(raw.tax_rate),
    tax_amount: Number(raw.tax_amount),
    total_amount: Number(raw.total_amount),
    paid_amount: Number(raw.paid_amount),
    due_date: raw.due_date != null ? String(raw.due_date) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

export default function InvoicesScreen() {
  const navigation = useNavigation();
  const bottomPad = useTabScreenBottomPadding();
  const { businessId, user, memberRole } = useAuth();
  const params = useLocalSearchParams<{ invoiceId?: string | string[]; invoiceFocus?: string | string[] }>();
  const { refreshGeneration } = useRealtimeNotifications();
  const { resolved } = useTheme();
  const ownerCanDiscount = memberRole === "owner";

  const [rows, setRows] = useState<InvoiceListRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BillFilter>("all");
  const [datePreset, setDatePreset] = useState<DateRangePreset>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [customers, setCustomers] = useState<Pick<CustomerRow, "id" | "name">[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [taxRateStr, setTaxRateStr] = useState("0");
  const [invoiceDiscountStr, setInvoiceDiscountStr] = useState("0");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [saving, setSaving] = useState(false);
  const [createCheckoutBusy, setCreateCheckoutBusy] = useState<"cash" | "credit" | null>(null);
  const createModalBusy = saving || createCheckoutBusy !== null;
  const [saveError, setSaveError] = useState<string | null>(null);

  const [productPickOpen, setProductPickOpen] = useState(false);
  const [productPickLineKey, setProductPickLineKey] = useState<string | null>(null);
  const [productPickQuery, setProductPickQuery] = useState("");
  const [debouncedPickQuery, setDebouncedPickQuery] = useState("");
  const [catalogPickerRows, setCatalogPickerRows] = useState<CatalogPickRow[]>([]);
  const [catalogPickerLoading, setCatalogPickerLoading] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [finalizeMode, setFinalizeMode] = useState<null | "cash" | "credit">(null);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseBusy, setReverseBusy] = useState(false);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptText, setReceiptText] = useState("");
  const [receiptFetchBusy, setReceiptFetchBusy] = useState(false);
  const [waBusy, setWaBusy] = useState(false);
  /** product_id -> image_url for invoice line display */
  const [detailLineImages, setDetailLineImages] = useState<Record<string, string | null>>({});

  const filtered = useMemo(() => {
    return rows.filter((r) => matchesBillFilter(r.status, filter) && matchesQuery(r, query));
  }, [rows, filter, query]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        headerRightWithSupport(
          <Pressable
            onPress={() => {
              setSaveError(null);
              setLines([newLine()]);
              setCustomerId(null);
              setNotes("");
              setTaxRateStr("0");
              setInvoiceDiscountStr("0");
              setProductPickOpen(false);
              setProductPickLineKey(null);
              setProductPickQuery("");
              setCreateOpen(true);
              void loadBusinessDefaults();
              void loadCustomers();
            }}
            hitSlop={12}
            className={`flex-row items-center rounded-full px-3 py-1.5 active:opacity-80 ${
              resolved === "dark" ? "bg-brand-500/15" : "bg-brand-100"
            }`}
            accessibilityRole="button"
            accessibilityLabel="New bill"
          >
            <Ionicons name="add" size={22} color={BRAND_ACCENT_HEX} />
            <Text className={`ml-1 text-sm font-semibold ${brandChipActiveText(resolved)}`}>New</Text>
          </Pressable>,
        ),
    });
  }, [navigation, resolved]);

  const loadCustomers = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name");
    setCustomers((data ?? []) as Pick<CustomerRow, "id" | "name">[]);
  }, [businessId]);

  const loadBusinessDefaults = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase
      .from("businesses")
      .select("default_tax_rate, default_invoice_discount_amount")
      .eq("id", businessId)
      .maybeSingle();
    if (data) {
      const r = data as { default_tax_rate?: number; default_invoice_discount_amount?: number };
      setTaxRateStr(String(r.default_tax_rate ?? 0));
      setInvoiceDiscountStr(String(r.default_invoice_discount_amount ?? 0));
    }
  }, [businessId]);

  const load = useCallback(async () => {
    if (!businessId || !user) {
      setLoading(false);
      return;
    }
    setError(null);
    let invQuery = supabase
      .from("invoices")
      .select(
        `
        *,
        customer:customers(name)
      `,
      )
      .eq("business_id", businessId);
    if (datePreset !== "all") {
      const rangeStart = getRangeStartForPreset(new Date(), datePreset);
      if (rangeStart) {
        invQuery = invQuery.gte("created_at", rangeStart.toISOString());
      }
    }
    const { data, error: fetchErr } = await invQuery
      .order("created_at", { ascending: false })
      .limit(INVOICE_FETCH_LIMIT);

    if (fetchErr) {
      setError(fetchErr.message);
      setRows([]);
    } else {
      const list = (data ?? []) as Record<string, unknown>[];
      const normalized: InvoiceListRow[] = list.map((raw) => {
        const inv = normalizeInvoiceRow(raw);
        const c = raw.customer as { name: string } | { name: string }[] | null | undefined;
        const customer =
          c == null ? null : Array.isArray(c) ? (c[0] ?? null) : c;
        return { ...inv, customer };
      });
      setRows(normalized);
    }
    setLoading(false);
    setRefreshing(false);
  }, [businessId, user, datePreset]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (refreshGeneration === 0) return;
    void load();
  }, [refreshGeneration, load]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPickQuery(productPickQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [productPickQuery]);

  const loadCatalogPicker = useCallback(async () => {
    if (!businessId || !productPickOpen) return;
    setCatalogPickerLoading(true);
    const { data, error: rpcErr } = await supabase.rpc("search_products", {
      p_business_id: businessId,
      p_query: debouncedPickQuery.length > 0 ? debouncedPickQuery : null,
      p_low_stock_only: false,
      p_limit: 100,
      p_offset: 0,
    });
    setCatalogPickerLoading(false);
    if (rpcErr) {
      setCatalogPickerRows([]);
      return;
    }
    const list = (data ?? []) as Record<string, unknown>[];
    setCatalogPickerRows(list.map(normalizePickRow));
  }, [businessId, productPickOpen, debouncedPickQuery]);

  useEffect(() => {
    if (productPickOpen) void loadCatalogPicker();
  }, [loadCatalogPicker, productPickOpen]);

  const openProductPickerForLine = (lineKey: string) => {
    setProductPickLineKey(lineKey);
    setProductPickQuery("");
    setDebouncedPickQuery("");
    setProductPickOpen(true);
  };

  const applyCatalogProductToLine = (p: CatalogPickRow) => {
    if (!productPickLineKey) return;
    setLines((prev) =>
      prev.map((l) =>
        l.key === productPickLineKey
          ? {
              ...l,
              product_id: p.id,
              product_name: p.name,
              unit: p.unit,
              unit_price: String(p.sale_price),
            }
          : l,
      ),
    );
    setProductPickOpen(false);
    setProductPickLineKey(null);
  };

  const fetchDetail = useCallback(
    async (id: string) => {
      if (!businessId) return;
      setDetailError(null);
      setDetailLoading(true);
      const { data, error: fetchErr } = await supabase
        .from("invoices")
        .select(
          `
          *,
          customer:customers(id, name, phone, email),
          items:invoice_items(*)
        `,
        )
        .eq("id", id)
        .eq("business_id", businessId)
        .maybeSingle();

      setDetailLoading(false);
      if (fetchErr || !data) {
        setDetail(null);
        setDetailLineImages({});
        setDetailError(fetchErr?.message ?? "Could not load bill.");
        return;
      }

      const raw = data as Record<string, unknown>;
      const inv = normalizeInvoiceRow(raw);
      const cs = raw.customer as
        | { id: string; name: string; phone: string | null; email: string | null }
        | { id: string; name: string; phone: string | null; email: string | null }[]
        | null
        | undefined;
      const customer =
        cs == null ? null : Array.isArray(cs) ? (cs[0] ?? null) : cs;
      const itemRows = (raw.items ?? []) as Record<string, unknown>[];
      const items: InvoiceItemRow[] = itemRows.map((it) => ({
        id: String(it.id),
        invoice_id: String(it.invoice_id),
        product_id: it.product_id != null ? String(it.product_id) : null,
        product_name: String(it.product_name),
        unit: String(it.unit ?? "pcs"),
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        discount_pct: Number(it.discount_pct),
        line_total: Number(it.line_total),
      }));

      const productIds = [...new Set(items.map((i) => i.product_id).filter((id): id is string => Boolean(id)))];
      let lineImages: Record<string, string | null> = {};
      if (productIds.length > 0) {
        const { data: prodRows } = await supabase
          .from("products")
          .select("id, image_url")
          .eq("business_id", businessId)
          .in("id", productIds);
        for (const pr of prodRows ?? []) {
          const r = pr as { id: string; image_url: string | null };
          lineImages[r.id] = r.image_url != null ? String(r.image_url) : null;
        }
      }
      setDetailLineImages(lineImages);
      setDetail({ ...inv, customer, items });
    },
    [businessId],
  );

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailError(null);
    setFinalizeMode(null);
    setReverseOpen(false);
    setDetailLineImages({});
    void fetchDetail(id);
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setDetailError(null);
    setFinalizeMode(null);
    setReverseOpen(false);
    setDetailLineImages({});
  };

  /** Open a bill when another screen links here with `invoiceId` (+ optional `invoiceFocus` nonce). */
  useEffect(() => {
    const raw = params.invoiceId;
    const id = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : null;
    if (!id || !businessId) return;
    setDetailId(id);
    setDetail(null);
    setDetailError(null);
    setFinalizeMode(null);
    setReverseOpen(false);
    setDetailLineImages({});
    void fetchDetail(id);
  }, [params.invoiceId, params.invoiceFocus, businessId, fetchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const prepareBillLines = async (): Promise<{
    uid: string;
    draftLines: DraftLineInput[];
    tax: number;
    invDisc: number;
  } | null> => {
    if (!businessId) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setSaveError("You must be signed in to create a bill.");
      return null;
    }

    const parsed = lines
      .map((l) => ({
        product_id: l.product_id,
        product_name: l.product_name.trim(),
        qty: Number(String(l.qty).replace(",", ".")),
        unit_price: Number(String(l.unit_price).replace(",", ".")),
        unit: l.unit.trim() || "pcs",
      }))
      .filter(
        (l) =>
          l.product_name.length > 0 &&
          l.qty > 0 &&
          Number.isFinite(l.unit_price) &&
          l.unit_price >= 0,
      );

    if (parsed.length === 0) {
      setSaveError("Add at least one line with product name, quantity, and price.");
      return null;
    }

    const tax = Number(String(taxRateStr).replace(",", "."));
    const invDisc = ownerCanDiscount ? Number(String(invoiceDiscountStr).replace(",", ".")) : 0;
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      setSaveError("Enter a valid tax rate (0–100).");
      return null;
    }
    if (ownerCanDiscount && (!Number.isFinite(invDisc) || invDisc < 0)) {
      setSaveError("Enter a valid invoice discount.");
      return null;
    }

    const draftLines: DraftLineInput[] = parsed.map((l) => ({
      product_id: l.product_id,
      product_name: l.product_name,
      unit: l.unit,
      quantity: l.qty,
      unit_price: l.unit_price,
      discount_pct: 0,
    }));

    return {
      uid,
      draftLines,
      tax: Math.round(tax * 100) / 100,
      invDisc: Math.round(invDisc * 100) / 100,
    };
  };

  /** One step: invoice + full cash payment (same as Quick sale). */
  const onCompleteSaleCash = async () => {
    if (!businessId) return;
    const prep = await prepareBillLines();
    if (!prep) return;

    setCreateCheckoutBusy("cash");
    setSaveError(null);

    const { error: err, invoiceId } = await createAndFinalizeCashSale(supabase, businessId, prep.uid, {
      customerId: customerId,
      notes: notes.trim() || null,
      discount_amount: prep.invDisc,
      tax_rate: prep.tax,
      lines: prep.draftLines,
    });

    setCreateCheckoutBusy(null);
    if (err) {
      setSaveError(err);
      return;
    }

    setCreateOpen(false);
    setProductPickOpen(false);
    setProductPickLineKey(null);
    void load();

    if (invoiceId) {
      const receipt = await fetchReceiptTextForInvoice(supabase, businessId, invoiceId);
      if ("error" in receipt) {
        setReceiptText(`Sale completed.\n(${receipt.error})`);
      } else {
        setReceiptText(receipt.text);
      }
      setReceiptOpen(true);
    }
  };

  const onCompleteSaleCredit = async () => {
    if (!businessId) return;
    const prep = await prepareBillLines();
    if (!prep) return;

    setCreateCheckoutBusy("credit");
    setSaveError(null);

    const { error: err, invoiceId } = await createAndFinalizeCreditSale(supabase, businessId, prep.uid, {
      customerId: customerId,
      notes: notes.trim() || null,
      discount_amount: prep.invDisc,
      tax_rate: prep.tax,
      lines: prep.draftLines,
    });

    setCreateCheckoutBusy(null);
    if (err) {
      setSaveError(err);
      return;
    }

    setCreateOpen(false);
    setProductPickOpen(false);
    setProductPickLineKey(null);
    void load();

    if (invoiceId) {
      const receipt = await fetchReceiptTextForInvoice(supabase, businessId, invoiceId);
      if ("error" in receipt) {
        setReceiptText(`Credit sale saved.\n(${receipt.error})`);
      } else {
        setReceiptText(receipt.text);
      }
      setReceiptOpen(true);
    }
  };

  /** Draft only - finish payment later from Bill or web. */
  const onSaveDraftOnly = async () => {
    if (!businessId) return;
    const prep = await prepareBillLines();
    if (!prep) return;

    setSaving(true);
    setSaveError(null);

    const { error: err, invoiceId } = await createInvoiceDraft(supabase, businessId, prep.uid, {
      customerId: customerId,
      notes: notes.trim() || null,
      discount_amount: prep.invDisc,
      tax_rate: prep.tax,
      lines: prep.draftLines,
    });

    setSaving(false);
    if (err) {
      setSaveError(err);
      return;
    }
    setCreateOpen(false);
    setProductPickOpen(false);
    setProductPickLineKey(null);
    void load();
    if (invoiceId) {
      openDetail(invoiceId);
    }
  };

  const confirmFinalizeCash = async () => {
    if (!businessId || !detailId) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setDetailError("You must be signed in.");
      setFinalizeMode(null);
      return;
    }
    setWorkflowBusy(true);
    setDetailError(null);
    const { error: err } = await finalizeDraftInvoiceCash(supabase, businessId, uid, detailId);
    setWorkflowBusy(false);
    if (err) {
      setDetailError(err);
      return;
    }
    setFinalizeMode(null);
    void fetchDetail(detailId);
    void load();
    const receipt = await fetchReceiptTextForInvoice(supabase, businessId, detailId);
    if ("error" in receipt) {
      setReceiptText(`Payment recorded. (${receipt.error})`);
    } else {
      setReceiptText(receipt.text);
    }
    setReceiptOpen(true);
  };

  const confirmFinalizeCredit = async () => {
    if (!businessId || !detailId) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setDetailError("You must be signed in.");
      setFinalizeMode(null);
      return;
    }
    setWorkflowBusy(true);
    setDetailError(null);
    const { error: err } = await finalizeDraftInvoiceCredit(supabase, businessId, uid, detailId);
    setWorkflowBusy(false);
    if (err) {
      setDetailError(err);
      return;
    }
    setFinalizeMode(null);
    void fetchDetail(detailId);
    void load();
    const receipt = await fetchReceiptTextForInvoice(supabase, businessId, detailId);
    if ("error" in receipt) {
      setReceiptText(`Sale on credit saved. (${receipt.error})`);
    } else {
      setReceiptText(receipt.text);
    }
    setReceiptOpen(true);
  };

  const confirmReverseInvoice = async () => {
    if (!detailId) return;
    setReverseBusy(true);
    setDetailError(null);
    const { error: err } = await reverseInvoice(supabase, detailId);
    setReverseBusy(false);
    if (err) {
      setDetailError(err);
      return;
    }
    setReverseOpen(false);
    void fetchDetail(detailId);
    void load();
  };

  const openReceiptShareForDetail = useCallback(async () => {
    if (!businessId || !detailId) return;
    setReceiptFetchBusy(true);
    try {
      const receipt = await fetchReceiptTextForInvoice(supabase, businessId, detailId);
      if ("error" in receipt) {
        setReceiptText(`Could not load receipt.\n${receipt.error}`);
      } else {
        setReceiptText(receipt.text);
      }
      setReceiptOpen(true);
    } finally {
      setReceiptFetchBusy(false);
    }
  }, [businessId, detailId]);

  const onSendCreditWhatsApp = useCallback(async () => {
    if (!detail) return;
    const due = Math.max(0, roundMoney(detail.total_amount - detail.paid_amount));
    const msg = buildCreditInvoiceAlert({
      customerName: detail.customer?.name ?? null,
      invoiceNumber: detail.invoice_number,
      totalAmount: detail.total_amount,
      dueAmount: due,
    });
    setWaBusy(true);
    const { error: waErr } = await openWhatsAppMessage(detail.customer?.phone ?? null, msg);
    setWaBusy(false);
    if (waErr) {
      setDetailError(waErr);
    }
  }, [detail]);

  const balanceDue =
    detail != null
      ? Math.max(0, roundMoney(detail.total_amount - detail.paid_amount))
      : 0;

  if (loading && rows.length === 0) {
    return (
      <View className={screenCenterRootClass(resolved)}>
        <ActivityIndicator size="large" color={BRAND_ACCENT_HEX} />
      </View>
    );
  }

  return (
    <View className={scrollCanvasClass(resolved)}>
      {error ? <ErrorBannerWithSupport message={error} /> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPad + 8, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_ACCENT_HEX} />
        }
        ListHeaderComponent={
          <View className="pb-2 pt-2">
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Search invoice # or customer"
              accessibilityLabel="Search bills"
            />
            <Text className={`mt-2 text-xs font-semibold uppercase tracking-wide ${textSubtleClass(resolved)}`}>
              Status
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-1.5"
              contentContainerStyle={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 2,
              }}
            >
              {BILL_FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    className={`mr-2 rounded-full border px-3.5 py-2 ${
                      active ? brandChipActiveSurface(resolved) : chipInactiveBorder(resolved)
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${active ? brandChipActiveText(resolved) : chipInactiveText(resolved)}`}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text className={`mt-3 text-xs font-semibold uppercase tracking-wide ${textSubtleClass(resolved)}`}>
              Date
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-1.5"
              contentContainerStyle={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 2,
              }}
            >
              {INVOICE_DATE_FILTER_OPTIONS.map((f) => {
                const active = datePreset === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setDatePreset(f.key)}
                    className={`mr-2 rounded-full border px-3.5 py-2 ${
                      active ? skyChipActiveSurface(resolved) : chipInactiveBorder(resolved)
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${active ? skyChipActiveText(resolved) : chipInactiveText(resolved)}`}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text className={`mt-2 text-[11px] leading-4 ${textMutedClass(resolved)}`}>
              {datePreset === "all"
                ? `Loads up to ${INVOICE_FETCH_LIMIT} most recent.`
                : "Date filter is applied on the server for this list."}
            </Text>
            <Text className={`mt-3 text-xs ${textMutedClass(resolved)}`}>
              {filtered.length === rows.length
                ? `${rows.length} bill${rows.length === 1 ? "" : "s"}`
                : `${filtered.length} of ${rows.length} shown`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-4 py-12">
            <Ionicons name="document-text-outline" size={48} color={ionIconMuted(resolved)} />
            <Text className={`mt-4 text-center text-base font-medium ${textStrongOnSurfaceClass(resolved)}`}>
              {rows.length === 0 &&
              !query.trim() &&
              filter === "all" &&
              datePreset === "all"
                ? "No bills yet"
                : "No bills match"}
            </Text>
            <Text className={`mt-2 text-center text-sm leading-5 ${textMutedClass(resolved)}`}>
              {rows.length === 0 &&
              !query.trim() &&
              filter === "all" &&
              datePreset === "all"
                ? "Tap New to create a draft, then finalize when the customer pays cash."
                : "Adjust search, status, or date - then pull to refresh the list."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openDetail(item.id)}
            className={listEntityCardClass(resolved)}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className={`font-mono text-sm ${textSubtleClass(resolved)}`}>{item.invoice_number}</Text>
                <Text className={`mt-1 text-base font-semibold ${textStrongOnSurfaceClass(resolved)}`}>
                  {item.customer?.name ?? "Walk-in"}
                </Text>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <View className={`rounded-full px-2.5 py-0.5 ${statusBadgeClass(item.status, resolved)}`}>
                    <Text className="text-xs font-semibold">{statusLabel(item.status)}</Text>
                  </View>
                  <Text className={`text-xs ${textSubtleClass(resolved)}`}>{shortDate(item.created_at)}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className={`text-base font-semibold ${subtlePositiveClass(resolved)}`}>
                  {formatPkr(item.total_amount)}
                </Text>
                {item.status !== "draft" && item.status !== "cancelled" ? (
                  <Text className={`mt-0.5 text-xs ${textMutedClass(resolved)}`}>
                    Paid {formatPkr(item.paid_amount)}
                  </Text>
                ) : null}
                <Ionicons name="chevron-forward" size={20} color={ionIconMuted(resolved)} style={{ marginTop: 4 }} />
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal
        visible={createOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setProductPickOpen(false);
          setProductPickLineKey(null);
          setCreateOpen(false);
        }}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className={`max-h-[92%] px-4 pb-8 pt-4 ${bottomSheetContainerClass(resolved)}`}>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className={`text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>New bill</Text>
              <Pressable
                onPress={() => {
                  setProductPickOpen(false);
                  setProductPickLineKey(null);
                  setCreateOpen(false);
                }}
                hitSlop={12}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={26} color={ionIconSecondary(resolved)} />
              </Pressable>
            </View>
            <Text className={`text-sm ${textMutedClass(resolved)}`}>
              Complete sale (cash) records full payment. Credit leaves the bill unpaid and updates the customer&apos;s
              balance when a customer is selected. Or save a draft to edit or charge later.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" className="mt-4">
              <Text className={`mb-2 text-sm font-medium ${textFieldLabelClass(resolved)}`}>Customer (optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
              >
                <Pressable
                  onPress={() => setCustomerId(null)}
                  className={`mr-2 rounded-full border px-3 py-2 ${
                    customerId === null ? brandChipActiveSurface(resolved) : chipInactiveBorder(resolved)
                  }`}
                >
                  <Text
                    className={`text-sm ${customerId === null ? brandChipActiveText(resolved) : chipInactiveText(resolved)}`}
                  >
                    Walk-in
                  </Text>
                </Pressable>
                {customers.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setCustomerId(c.id)}
                    className={`mr-2 rounded-full border px-3 py-2 ${
                      customerId === c.id ? brandChipActiveSurface(resolved) : chipInactiveBorder(resolved)
                    }`}
                  >
                    <Text
                      className={`text-sm ${customerId === c.id ? brandChipActiveText(resolved) : chipInactiveText(resolved)}`}
                      numberOfLines={1}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField
                    label="Tax %"
                    value={taxRateStr}
                    onChangeText={setTaxRateStr}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <FormField
                    label="Invoice discount (PKR)"
                    value={invoiceDiscountStr}
                    onChangeText={setInvoiceDiscountStr}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    editable={ownerCanDiscount}
                  />
                </View>
              </View>
              {!ownerCanDiscount ? (
                <Text className={`-mt-1 mb-2 text-xs ${textMutedClass(resolved)}`}>
                  Only owner can apply bill discounts.
                </Text>
              ) : null}

              <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Terms, reference" />

              <Text className={`mb-2 text-sm font-medium ${textFieldLabelClass(resolved)}`}>Line items</Text>
              {lines.map((line, index) => (
                <View key={line.key} className={formLineItemClass(resolved)}>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className={`text-xs font-medium ${textMutedClass(resolved)}`}>Line {index + 1}</Text>
                    {line.product_id ? (
                      <Text className="text-[10px] font-medium uppercase text-brand-500/90">Catalog</Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => openProductPickerForLine(line.key)}
                    className={catalogSearchChipClass(resolved)}
                  >
                    <Text className={`text-sm font-semibold ${catalogSearchChipText(resolved)}`}>
                      Search catalog
                    </Text>
                  </Pressable>
                  <FormField
                    label="Description"
                    value={line.product_name}
                    onChangeText={(t) =>
                      setLines((prev) =>
                        prev.map((l) =>
                          l.key === line.key ? { ...l, product_name: t, product_id: null } : l,
                        ),
                      )
                    }
                    placeholder="Product or service"
                  />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <FormField
                        label="Qty"
                        value={line.qty}
                        onChangeText={(t) =>
                          setLines((prev) =>
                            prev.map((l) => (l.key === line.key ? { ...l, qty: t } : l)),
                          )
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View className="flex-1">
                      <FormField
                        label="Unit price"
                        value={line.unit_price}
                        onChangeText={(t) =>
                          setLines((prev) =>
                            prev.map((l) => (l.key === line.key ? { ...l, unit_price: t } : l)),
                          )
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  {lines.length > 1 ? (
                    <Pressable
                      onPress={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      className="mt-1"
                    >
                      <Text className="text-sm text-red-400">Remove line</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}

              <Pressable
                onPress={() => setLines((prev) => [...prev, newLine()])}
                className={`mb-4 rounded-xl border border-dashed py-3 ${
                  resolved === "dark" ? "border-neutral-600" : "border-zinc-400"
                }`}
              >
                <Text className="text-center text-sm font-medium text-brand-500">+ Add line</Text>
              </Pressable>

              {saveError ? <ErrorBannerWithSupport message={saveError} variant="compact" /> : null}

              <PrimaryButton
                label="Complete sale (cash)"
                onPress={() => void onCompleteSaleCash()}
                loading={createCheckoutBusy === "cash"}
                disabled={createModalBusy}
              />
              <Pressable
                onPress={() => void onCompleteSaleCredit()}
                disabled={createModalBusy}
                className={creditSaleSurfaceClass(resolved)}
                accessibilityRole="button"
                accessibilityLabel="Complete sale on credit"
              >
                <Text className={`text-center text-base font-semibold ${creditSaleTextClass(resolved)}`}>
                  {createCheckoutBusy === "credit" ? "Processing…" : "Complete sale (credit)"}
                </Text>
              </Pressable>
              <Text className={`mt-2 text-center text-xs ${textMutedClass(resolved)}`}>
                Cash: paid in full. Credit: unpaid bill; walk-in allowed; linked customer gets the amount on their
                tab.
              </Text>
              <Pressable
                onPress={() => void onSaveDraftOnly()}
                disabled={createModalBusy}
                className="mt-4 py-3 active:opacity-80 disabled:opacity-50"
              >
                <Text className={`text-center text-sm font-medium ${textSubtleClass(resolved)}`}>
                  Save as draft only
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setProductPickOpen(false);
                  setProductPickLineKey(null);
                  setCreateOpen(false);
                }}
                className="mt-1 py-3"
              >
                <Text className={`text-center text-base ${textMutedClass(resolved)}`}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={productPickOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setProductPickOpen(false);
          setProductPickLineKey(null);
        }}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className={`max-h-[85%] px-4 pb-8 pt-4 ${bottomSheetContainerClass(resolved)}`}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className={`text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>Choose product</Text>
              <Pressable
                onPress={() => {
                  setProductPickOpen(false);
                  setProductPickLineKey(null);
                }}
                hitSlop={12}
                accessibilityLabel="Close catalog search"
              >
                <Ionicons name="close" size={26} color={ionIconSecondary(resolved)} />
              </Pressable>
            </View>
            <Text className={`mb-2 text-xs ${textMutedClass(resolved)}`}>
              Search by name, SKU, or barcode. Picks fill description, unit, and sale price.
            </Text>
            <SearchBar
              value={productPickQuery}
              onChangeText={setProductPickQuery}
              placeholder="Search products"
              accessibilityLabel="Search catalog products"
            />
            {catalogPickerLoading ? (
              <View className="py-8">
                <ActivityIndicator color={BRAND_ACCENT_HEX} />
              </View>
            ) : (
              <FlatList
                data={catalogPickerRows}
                keyExtractor={(p) => p.id}
                style={{ maxHeight: 360 }}
                className="mt-2"
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text className={`py-8 text-center ${textMutedClass(resolved)}`}>
                    No products found. Try another search, add items under Stock, or type a custom line.
                  </Text>
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => applyCatalogProductToLine(item)}
                    className={`py-3.5 active:opacity-80 ${hairlineBorderBClass(resolved)}`}
                  >
                    <View className="flex-row items-center gap-3">
                      <ProductThumbnail imageUrl={item.image_url} size={48} />
                      <View className="min-w-0 flex-1">
                        <Text className={`text-base ${textStrongOnSurfaceClass(resolved)}`}>{item.name}</Text>
                        <Text className={`mt-0.5 text-sm ${textMutedClass(resolved)}`}>
                          {item.unit} · {formatPkr(item.sale_price)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={detailId !== null} animationType="slide" transparent onRequestClose={closeDetail}>
        <View className="flex-1 justify-end bg-black/60">
          <View className={`max-h-[92%] px-4 pb-10 pt-4 ${bottomSheetContainerClass(resolved)}`}>
            {detailLoading ? (
              <View className="py-12">
                <ActivityIndicator size="large" color={BRAND_ACCENT_HEX} />
              </View>
            ) : detail ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View className="flex-row items-center justify-between">
                  <Text className={`font-mono text-base ${textSubtleClass(resolved)}`}>{detail.invoice_number}</Text>
                  <Pressable onPress={closeDetail} hitSlop={12} accessibilityLabel="Close">
                    <Ionicons name="close" size={26} color={ionIconSecondary(resolved)} />
                  </Pressable>
                </View>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <View className={`rounded-full px-2.5 py-0.5 ${statusBadgeClass(detail.status, resolved)}`}>
                    <Text className="text-xs font-semibold">{statusLabel(detail.status)}</Text>
                  </View>
                </View>
                <Text className={`mt-2 text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>
                  {detail.customer?.name ?? "Walk-in"}
                </Text>
                {detail.customer?.phone ? (
                  <Text className={`text-sm ${textMutedClass(resolved)}`}>{detail.customer.phone}</Text>
                ) : null}

                {detailError ? (
                  <View className="mt-3">
                    <ErrorBannerWithSupport message={detailError} variant="compact" />
                  </View>
                ) : null}

                <Text className={`mt-5 text-2xl font-semibold ${subtlePositiveClass(resolved)}`}>
                  {formatPkr(detail.total_amount)}
                </Text>
                <Text className={`mt-1 text-sm ${textMutedClass(resolved)}`}>
                  Paid {formatPkr(detail.paid_amount)}
                  {balanceDue > 0.009 ? ` · Due ${formatPkr(balanceDue)}` : null}
                </Text>

                <Text className={`mt-4 text-xs uppercase ${textMutedClass(resolved)}`}>
                  Subtotal {formatPkr(detail.subtotal)} · Tax {formatPkr(detail.tax_amount)} · Discount{" "}
                  {formatPkr(detail.discount_amount)}
                </Text>

                {detail.notes ? (
                  <Text className={`mt-3 text-sm ${textSubtleClass(resolved)}`}>{detail.notes}</Text>
                ) : null}

                <Text className={`mt-6 text-sm font-semibold uppercase tracking-wide ${textMutedClass(resolved)}`}>
                  Lines
                </Text>
                {detail.items.map((it) => (
                  <View
                    key={it.id}
                    className={`mt-2 flex-row gap-3 py-2 ${hairlineBorderBClass(resolved)}`}
                  >
                    <ProductThumbnail
                      imageUrl={it.product_id ? detailLineImages[it.product_id] ?? null : null}
                      size={44}
                    />
                    <View className="min-w-0 flex-1">
                      <Text className={`text-base ${textStrongOnSurfaceClass(resolved)}`}>{it.product_name}</Text>
                      <Text className={`mt-0.5 text-sm ${textMutedClass(resolved)}`}>
                        {it.quantity} {it.unit} × {formatPkr(it.unit_price)} → {formatPkr(it.line_total)}
                      </Text>
                    </View>
                  </View>
                ))}

                {detail.status !== "draft" && detail.status !== "cancelled" ? (
                  <Pressable
                    onPress={() => void openReceiptShareForDetail()}
                    disabled={receiptFetchBusy}
                    className={receiptCtaSurfaceClass(resolved)}
                    accessibilityRole="button"
                    accessibilityLabel="Share or print receipt"
                  >
                    <Text className={`text-center text-base font-semibold ${receiptCtaTitleClass(resolved)}`}>
                      {receiptFetchBusy ? "Loading receipt…" : "Share or print receipt"}
                    </Text>
                    <Text className={`mt-1 px-1 text-center text-[11px] leading-4 ${textMutedClass(resolved)}`}>
                      Opens a preview - use Share to send to WhatsApp, email, or a printer app.
                    </Text>
                  </Pressable>
                ) : null}

                {(detail.status === "unpaid" || detail.status === "partial") && detail.customer?.phone ? (
                  <Pressable
                    onPress={() => void onSendCreditWhatsApp()}
                    disabled={waBusy}
                    className={
                      resolved === "dark"
                        ? "mt-3 rounded-xl border border-emerald-700/50 bg-emerald-950/35 py-3.5 active:opacity-90 disabled:opacity-50"
                        : "mt-3 rounded-xl border border-emerald-300 bg-emerald-50 py-3.5 active:opacity-90 disabled:opacity-50"
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Send WhatsApp credit alert"
                  >
                    <Text
                      className={`text-center text-base font-semibold ${
                        resolved === "dark" ? "text-emerald-300" : "text-emerald-900"
                      }`}
                    >
                      {waBusy ? "Opening WhatsApp..." : "Send WhatsApp credit alert"}
                    </Text>
                  </Pressable>
                ) : null}

                {detail.status === "draft" && detail.items.length > 0 ? (
                  <View className="mt-6 gap-2">
                    <Pressable
                      onPress={() => setFinalizeMode("cash")}
                      disabled={workflowBusy}
                      className="rounded-xl bg-brand-600 py-3.5 active:opacity-90 disabled:opacity-50"
                    >
                      <Text className="text-center text-base font-semibold text-white">
                        Finalize &amp; take cash (paid in full)
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setFinalizeMode("credit")}
                      disabled={workflowBusy}
                      className={creditSaleCardSurfaceClass(resolved)}
                    >
                      <Text className={`text-center text-base font-semibold ${creditSaleTextClass(resolved)}`}>
                        Finalize on credit (unpaid)
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {detail.status !== "draft" && detail.status !== "cancelled" ? (
                  <>
                    <Text className={`mt-6 text-xs leading-5 ${textMutedClass(resolved)}`}>
                      Only if this sale was entered by mistake. Payments are removed, what the customer owes is
                      corrected, and stock goes back up where it was reduced.
                    </Text>
                    <Pressable
                      onPress={() => setReverseOpen(true)}
                      disabled={reverseBusy || workflowBusy}
                      className="mt-2 rounded-xl border border-red-900/60 bg-red-950/40 py-3.5 active:opacity-90 disabled:opacity-50"
                    >
                      <Text className="text-center text-base font-semibold text-red-400">Reverse sale</Text>
                    </Pressable>
                  </>
                ) : null}

                <Pressable onPress={closeDetail} className={`mt-4 ${modalSecondaryButtonClass(resolved)}`}>
                  <Text className={`text-center text-base font-medium ${textStrongOnSurfaceClass(resolved)}`}>Close</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <Text className={`py-8 text-center ${textSubtleClass(resolved)}`}>
                {detailError ?? "Could not load this bill."}
              </Text>
            )}
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={finalizeMode !== null}
        title={finalizeMode === "credit" ? "Finalize on credit" : "Finalize with cash"}
        message={
          finalizeMode === "credit"
            ? "Finalize without taking payment? The bill stays unpaid. Stock updates for stocked items. If a customer is linked, the total is added to what they owe."
            : "Mark this bill as issued and record a full cash payment? Inventory will update for stocked items."
        }
        cancelLabel="Not now"
        confirmLabel="Finalize"
        variant="primary"
        loading={workflowBusy}
        onCancel={() => setFinalizeMode(null)}
        onConfirm={() =>
          void (finalizeMode === "credit" ? confirmFinalizeCredit() : confirmFinalizeCash())
        }
      />

      <ConfirmDialog
        visible={reverseOpen}
        title="Reverse this sale?"
        message="Recorded payments will be removed, what the customer owes will be corrected, stock will go back up where it was reduced, and the bill will show as cancelled. You cannot undo this."
        cancelLabel="Cancel"
        confirmLabel="Yes, reverse sale"
        variant="danger"
        loading={reverseBusy}
        onCancel={() => !reverseBusy && setReverseOpen(false)}
        onConfirm={() => void confirmReverseInvoice()}
      />

      <ReceiptShareSheet
        visible={receiptOpen}
        receiptText={receiptText}
        onClose={() => {
          setReceiptOpen(false);
          setReceiptText("");
        }}
      />
    </View>
  );
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
