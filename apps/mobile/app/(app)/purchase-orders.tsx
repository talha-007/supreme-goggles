import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
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
import { SearchBar } from "../../src/components/SearchBar";
import { useAuth } from "../../src/contexts/auth-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import { formatPkr } from "../../src/lib/format-money";
import {
  PRODUCT_UNITS,
  cancelPurchaseOrder,
  confirmDraftPurchaseOrder,
  createProductFromPoLine,
  linkPoLineToProduct,
  receiveRemainingStock,
  type ProductUnit,
} from "../../src/lib/po-workflow";
import { supabase } from "../../src/lib/supabase";
import { buildSupplierPurchaseAlert, openWhatsAppMessage } from "../../src/lib/whatsapp-alerts";
import {
  borderedSurfaceClass,
  bottomSheetContainerClass,
  chipInactiveBorder,
  chipInactiveText,
  formLineItemClass,
  hairlineBorderBClass,
  listEntityCardClass,
  modalSecondaryButtonClass,
  screenCenterRootClass,
  scrollCanvasClass,
  stackedMutedPanelClass,
  subtlePositiveClass,
  textFieldLabelClass,
  textMutedClass,
  textStrongOnSurfaceClass,
  textSubtleClass,
  type ResolvedScheme,
} from "../../src/theme/semantic";
import { useTheme } from "../../src/contexts/theme-context";
import type {
  PoItemDetail,
  PurchaseOrderDetail,
  PurchaseOrderListRow,
  PurchaseOrderStatus,
  SupplierListRow,
} from "../../src/types/purchase";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function poStatusLabel(s: PurchaseOrderStatus): string {
  const map: Record<PurchaseOrderStatus, string> = {
    draft: "Draft",
    ordered: "Ordered",
    partial: "Partial",
    received: "Received",
    cancelled: "Cancelled",
  };
  return map[s];
}

function statusBadgeClass(s: PurchaseOrderStatus, resolved: ResolvedScheme): string {
  if (s === "cancelled") return resolved === "dark" ? "bg-neutral-800 text-neutral-400" : "bg-zinc-200 text-zinc-600";
  if (s === "received") return resolved === "dark" ? "bg-brand-950 text-brand-400" : "bg-brand-100 text-brand-800";
  if (s === "draft") return resolved === "dark" ? "bg-amber-950 text-amber-400" : "bg-amber-100 text-amber-800";
  return resolved === "dark" ? "bg-sky-950 text-sky-400" : "bg-sky-100 text-sky-800";
}

function brandChipActiveSurface(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "border-brand-500 bg-brand-500/15" : "border-brand-500 bg-brand-100";
}

function brandChipActiveText(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-brand-400" : "text-brand-800";
}

function ionIconMuted(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "#525252" : "#71717a";
}

function ionIconSecondary(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "#a3a3a3" : "#52525b";
}

function catalogSearchChipClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-lg border border-sky-600/50 bg-sky-950/40 px-3 py-2 active:opacity-90"
    : "rounded-lg border border-sky-400/50 bg-sky-50 px-3 py-2 active:opacity-90";
}

function catalogSearchChipText(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-sky-400" : "text-sky-800";
}

function brandSoftCtaClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "rounded-lg border border-brand-600/50 bg-brand-950/40 px-3 py-2 active:opacity-90"
    : "rounded-lg border border-brand-400/50 bg-brand-50 px-3 py-2 active:opacity-90";
}

function brandSoftCtaText(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-brand-400" : "text-brand-800";
}

function poUnlinkedBannerClass(resolved: ResolvedScheme): string {
  return resolved === "dark"
    ? "mt-4 rounded-xl border border-amber-900/50 bg-amber-950/30 px-3 py-3"
    : "mt-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3";
}

function poUnlinkedBannerText(resolved: ResolvedScheme): string {
  return resolved === "dark" ? "text-sm leading-5 text-amber-200/95" : "text-sm leading-5 text-amber-900";
}

type LineDraft = { key: string; product_name: string; qty: string; unit_cost: string };

function newLine(): LineDraft {
  return { key: `${Date.now()}-${Math.random()}`, product_name: "", qty: "1", unit_cost: "" };
}

type PoFilterKey = "all" | "draft" | "transit" | "archive";

const PO_FILTERS: { key: PoFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "transit", label: "In transit" },
  { key: "archive", label: "Done" },
];

function statusMatchesFilter(status: PurchaseOrderStatus, key: PoFilterKey): boolean {
  if (key === "all") return true;
  if (key === "draft") return status === "draft";
  if (key === "transit") return status === "ordered" || status === "partial";
  if (key === "archive") return status === "received" || status === "cancelled";
  return true;
}

function matchesPoQuery(row: PurchaseOrderListRow, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return (
    row.po_number.toLowerCase().includes(s) ||
    (row.supplier?.name?.toLowerCase().includes(s) ?? false)
  );
}

function shortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/** Matches server rules: every line with qty must be linked to a catalog product. */
function poLinesFullyLinked(items: PoItemDetail[]): boolean {
  return items.every((i) => Number(i.qty_ordered) <= 0 || !!i.product_id);
}

function hasReceivableRemaining(items: PoItemDetail[]): boolean {
  return items.some(
    (i) => Number(i.qty_ordered) - Number(i.qty_received) > 0.0001,
  );
}

type CatalogProduct = { id: string; name: string };

export default function PurchaseOrdersScreen() {
  const navigation = useNavigation();
  const bottomPad = useTabScreenBottomPadding();
  const { businessId, user } = useAuth();
  const { resolved } = useTheme();
  const [rows, setRows] = useState<PurchaseOrderListRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PoFilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierListRow[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [newLine()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailActionError, setDetailActionError] = useState<string | null>(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [waBusy, setWaBusy] = useState(false);

  const [productPickOpen, setProductPickOpen] = useState(false);
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [productPickQuery, setProductPickQuery] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddItemId, setQuickAddItemId] = useState<string | null>(null);
  const [quickAddSale, setQuickAddSale] = useState("");
  const [quickAddUnit, setQuickAddUnit] = useState<ProductUnit>("pcs");

  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false);
  const [cancelPoConfirmOpen, setCancelPoConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter(
      (r) => statusMatchesFilter(r.status, filter) && matchesPoQuery(r, query),
    );
  }, [rows, filter, query]);

  const poStats = useMemo(() => {
    let draft = 0;
    let transit = 0;
    for (const r of rows) {
      if (r.status === "draft") draft += 1;
      if (r.status === "ordered" || r.status === "partial") transit += 1;
    }
    return { draft, transit, total: rows.length };
  }, [rows]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        headerRightWithSupport(
          <Pressable
            onPress={() => {
              setSaveError(null);
              setLines([newLine()]);
              setSupplierId(null);
              setNotes("");
              setCreateOpen(true);
            }}
            hitSlop={12}
            className={`flex-row items-center rounded-full px-3 py-1.5 active:opacity-80 ${
              resolved === "dark" ? "bg-brand-500/15" : "bg-brand-100"
            }`}
            accessibilityRole="button"
            accessibilityLabel="New purchase order"
          >
            <Ionicons name="add" size={22} color={BRAND_ACCENT_HEX} />
            <Text className={`ml-1 text-sm font-semibold ${brandChipActiveText(resolved)}`}>New</Text>
          </Pressable>,
        ),
    });
  }, [navigation, resolved]);

  const load = useCallback(async () => {
    if (!businessId || !user) {
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error } = await supabase
      .from("purchase_orders")
      .select(
        `
        id, po_number, status, total_amount, created_at,
        supplier:suppliers(id, name, phone)
      `,
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      const normalized = (data ?? []).map((row) => {
        const r = row as {
          id: string;
          po_number: string;
          status: PurchaseOrderStatus;
          total_amount: number;
          created_at: string;
          supplier: { id: string; name: string; phone: string | null } | { id: string; name: string; phone: string | null }[] | null;
        };
        const sup = r.supplier;
        const supplier =
          sup == null
            ? null
            : Array.isArray(sup)
              ? sup[0] ?? null
              : sup;
        return {
          id: r.id,
          po_number: r.po_number,
          status: r.status,
          total_amount: Number(r.total_amount),
          created_at: r.created_at,
          supplier,
        };
      });
      setRows(normalized);
    }
    setLoading(false);
    setRefreshing(false);
  }, [businessId, user]);

  const loadSuppliers = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, phone, email, is_active")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name");
    setSuppliers((data ?? []) as SupplierListRow[]);
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (createOpen) void loadSuppliers();
  }, [createOpen, loadSuppliers]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const fetchPoDetail = useCallback(
    async (id: string) => {
      if (!businessId) return;
      setDetailActionError(null);
      setDetailLoading(true);
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(
          `
          id, po_number, status, total_amount, notes, created_at,
          supplier:suppliers(id, name, phone),
          items:purchase_order_items(id, product_id, product_name, qty_ordered, qty_received, unit_cost, line_total)
        `,
        )
        .eq("id", id)
        .eq("business_id", businessId)
        .maybeSingle();

      setDetailLoading(false);
      if (error || !data) {
        setDetail(null);
        return;
      }

      const raw = data as {
        id: string;
        po_number: string;
        status: PurchaseOrderStatus;
        total_amount: number;
        notes: string | null;
        created_at: string;
        supplier: { id: string; name: string; phone: string | null } | { id: string; name: string; phone: string | null }[] | null;
        items: (PoItemDetail & { product_id?: string | null })[] | null;
      };

      const sup = raw.supplier;
      const supplier =
        sup == null ? null : Array.isArray(sup) ? sup[0] ?? null : sup;

      const items = (raw.items ?? []).map((r) => ({
        id: r.id,
        product_id: r.product_id ?? null,
        product_name: r.product_name,
        qty_ordered: Number(r.qty_ordered),
        qty_received: Number(r.qty_received),
        unit_cost: Number(r.unit_cost),
        line_total: Number(r.line_total),
      }));

      setDetail({
        id: raw.id,
        po_number: raw.po_number,
        status: raw.status,
        total_amount: Number(raw.total_amount),
        created_at: raw.created_at,
        supplier,
        notes: raw.notes,
        items,
      });
    },
    [businessId],
  );

  const openDetail = (id: string) => {
    setDetailId(id);
    setDetail(null);
    setDetailActionError(null);
    void fetchPoDetail(id);
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setDetailActionError(null);
    setProductPickOpen(false);
    setLinkingItemId(null);
    setQuickAddOpen(false);
    setQuickAddItemId(null);
    setReceiveConfirmOpen(false);
    setCancelPoConfirmOpen(false);
  };

  const loadCatalog = useCallback(async () => {
    if (!businessId) return;
    setCatalogLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("name");
    setCatalogLoading(false);
    if (error) {
      setCatalogProducts([]);
      return;
    }
    setCatalogProducts((data ?? []) as CatalogProduct[]);
  }, [businessId]);

  const openProductPicker = (itemId: string) => {
    setLinkingItemId(itemId);
    setProductPickQuery("");
    setProductPickOpen(true);
    void loadCatalog();
  };

  const onLinkProduct = async (productId: string) => {
    if (!detailId || !linkingItemId) return;
    setWorkflowBusy(true);
    setDetailActionError(null);
    const { error: err } = await linkPoLineToProduct(supabase, detailId, linkingItemId, productId);
    setWorkflowBusy(false);
    if (err) {
      setDetailActionError(err);
      return;
    }
    setProductPickOpen(false);
    setLinkingItemId(null);
    void fetchPoDetail(detailId);
    void load();
  };

  const openQuickAdd = (line: PoItemDetail) => {
    setQuickAddItemId(line.id);
    setQuickAddSale(String(line.unit_cost ?? 0));
    setQuickAddUnit("pcs");
    setDetailActionError(null);
    setQuickAddOpen(true);
  };

  const onQuickAddSubmit = async () => {
    if (!businessId || !quickAddItemId) return;
    const sale = Number(String(quickAddSale).replace(/,/g, ""));
    if (!Number.isFinite(sale) || sale < 0) {
      setDetailActionError("Enter a valid sale price.");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setDetailActionError("You must be signed in to add a catalog product.");
      return;
    }
    setWorkflowBusy(true);
    setDetailActionError(null);
    const { error: err } = await createProductFromPoLine(supabase, businessId, uid, quickAddItemId, {
      sale_price: sale,
      unit: quickAddUnit,
    });
    setWorkflowBusy(false);
    if (err) {
      setDetailActionError(err);
      return;
    }
    setQuickAddOpen(false);
    setQuickAddItemId(null);
    if (detailId) {
      void fetchPoDetail(detailId);
      void load();
    }
  };

  const onPlaceOrder = async () => {
    if (!businessId || !detailId) return;
    setWorkflowBusy(true);
    setDetailActionError(null);
    const { error: err } = await confirmDraftPurchaseOrder(supabase, businessId, detailId);
    setWorkflowBusy(false);
    if (err) {
      setDetailActionError(err);
      return;
    }
    void fetchPoDetail(detailId);
    void load();
  };

  const onReceiveRemaining = () => {
    if (!businessId || !detailId) return;
    setDetailActionError(null);
    setReceiveConfirmOpen(true);
  };

  const confirmReceiveRemaining = async () => {
    if (!businessId || !detailId) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setDetailActionError("You must be signed in to receive stock.");
      setReceiveConfirmOpen(false);
      return;
    }
    setWorkflowBusy(true);
    setDetailActionError(null);
    const { error: err } = await receiveRemainingStock(supabase, businessId, uid, detailId);
    setWorkflowBusy(false);
    if (err) {
      setDetailActionError(err);
      return;
    }
    setReceiveConfirmOpen(false);
    void fetchPoDetail(detailId);
    void load();
  };

  const onCancelPo = () => {
    if (!businessId || !detailId) return;
    setDetailActionError(null);
    setCancelPoConfirmOpen(true);
  };

  const onSendSupplierWhatsApp = useCallback(async () => {
    if (!detail) return;
    const msg = buildSupplierPurchaseAlert({
      supplierName: detail.supplier?.name ?? null,
      poNumber: detail.po_number,
      totalAmount: detail.total_amount,
    });
    setWaBusy(true);
    const { error: waErr } = await openWhatsAppMessage(detail.supplier?.phone ?? null, msg);
    setWaBusy(false);
    if (waErr) {
      setDetailActionError(waErr);
    }
  }, [detail]);

  const confirmCancelPo = async () => {
    if (!businessId || !detailId) return;
    setWorkflowBusy(true);
    setDetailActionError(null);
    const { error: err } = await cancelPurchaseOrder(supabase, businessId, detailId);
    setWorkflowBusy(false);
    if (err) {
      setDetailActionError(err);
      return;
    }
    setCancelPoConfirmOpen(false);
    closeDetail();
    void load();
  };

  const filteredCatalog = useMemo(() => {
    const q = productPickQuery.trim().toLowerCase();
    if (!q) return catalogProducts;
    return catalogProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [catalogProducts, productPickQuery]);

  const onCreatePo = async () => {
    if (!businessId) return;
    const parsed = lines
      .map((l) => ({
        product_name: l.product_name.trim(),
        qty: Number(l.qty.replace(",", ".")),
        unit_cost: Number(l.unit_cost.replace(",", ".")),
      }))
      .filter((l) => l.product_name.length > 0 && l.qty > 0 && Number.isFinite(l.unit_cost) && l.unit_cost >= 0);

    if (parsed.length === 0) {
      setSaveError("Add at least one line with product name, quantity, and cost.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data: poNum, error: numErr } = await supabase.rpc("generate_po_number", {
      p_business_id: businessId,
    });

    if (numErr || !poNum) {
      setSaving(false);
      setSaveError(numErr?.message ?? "Could not create PO number.");
      return;
    }

    const totalAmount = roundMoney(
      parsed.reduce((sum, l) => sum + l.qty * l.unit_cost, 0),
    );

    const { data: po, error: poErr } = await supabase
      .from("purchase_orders")
      .insert({
        business_id: businessId,
        supplier_id: supplierId,
        po_number: poNum as string,
        status: "draft" as PurchaseOrderStatus,
        total_amount: totalAmount,
        notes: notes.trim() || null,
        created_by: session?.user?.id ?? null,
      })
      .select("id")
      .single();

    if (poErr || !po) {
      setSaving(false);
      setSaveError(poErr?.message ?? "Could not create purchase order.");
      return;
    }

    const itemRows = parsed.map((item) => ({
      purchase_order_id: po.id,
      product_id: null as string | null,
      product_name: item.product_name,
      qty_ordered: item.qty,
      qty_received: 0,
      unit_cost: item.unit_cost,
      line_total: roundMoney(item.qty * item.unit_cost),
    }));

    const { error: itemsErr } = await supabase.from("purchase_order_items").insert(itemRows);

    if (itemsErr) {
      await supabase.from("purchase_orders").delete().eq("id", po.id);
      setSaving(false);
      setSaveError(itemsErr.message);
      return;
    }

    setSaving(false);
    setCreateOpen(false);
    setSupplierId(null);
    setNotes("");
    setLines([newLine()]);
    void load();
  };

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
              placeholder="Search PO # or supplier"
              accessibilityLabel="Search purchase orders"
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 2,
              }}
            >
              {PO_FILTERS.map((f) => {
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
            <Text className={`mt-3 text-xs ${textMutedClass(resolved)}`}>
              {rows.length === 0
                ? "No orders yet"
                : `${filtered.length === rows.length ? rows.length : `${filtered.length} of ${rows.length}`} · ${poStats.draft} draft · ${poStats.transit} in transit`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-4 py-12">
            <Ionicons name="document-text-outline" size={48} color={ionIconMuted(resolved)} />
            <Text className={`mt-4 text-center text-base font-medium ${textStrongOnSurfaceClass(resolved)}`}>
              {query.trim() || filter !== "all" ? "No orders match" : "No purchase orders yet"}
            </Text>
            <Text className={`mt-2 text-center text-sm leading-5 ${textMutedClass(resolved)}`}>
              {query.trim() || filter !== "all"
                ? "Adjust search or filters."
                : "Tap New to create a draft and order stock from a supplier."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openDetail(item.id)}
            className={listEntityCardClass(resolved)}
          >
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className={`text-base font-semibold ${textStrongOnSurfaceClass(resolved)}`}>
                    {item.po_number}
                  </Text>
                  <View className={`rounded-full px-2.5 py-0.5 ${statusBadgeClass(item.status, resolved)}`}>
                    <Text className="text-xs font-semibold">{poStatusLabel(item.status)}</Text>
                  </View>
                </View>
                <Text className={`mt-1.5 text-sm ${textSubtleClass(resolved)}`}>
                  {item.supplier?.name ?? "No supplier"}
                </Text>
                <Text className={`mt-0.5 text-xs ${textMutedClass(resolved)}`}>{shortDate(item.created_at)}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className={`text-base font-semibold ${subtlePositiveClass(resolved)}`}>
                  {formatPkr(Number(item.total_amount))}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={ionIconMuted(resolved)} />
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={createOpen} animationType="slide" transparent onRequestClose={() => setCreateOpen(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className={`max-h-[92%] px-4 pb-8 pt-4 ${bottomSheetContainerClass(resolved)}`}>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className={`text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>New purchase order</Text>
              <Pressable onPress={() => setCreateOpen(false)} hitSlop={12} accessibilityLabel="Close">
                <Ionicons name="close" size={26} color={ionIconSecondary(resolved)} />
              </Pressable>
            </View>
            <Text className={`mt-1 text-sm ${textMutedClass(resolved)}`}>
              Saved as a draft. Review and confirm when you are ready to place the order.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" className="mt-4">
              <Text className={`mb-2 text-sm font-medium ${textFieldLabelClass(resolved)}`}>Supplier (optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
              >
                <Pressable
                  onPress={() => setSupplierId(null)}
                  className={`mr-2 rounded-full border px-3 py-2 ${
                    supplierId === null ? brandChipActiveSurface(resolved) : chipInactiveBorder(resolved)
                  }`}
                >
                  <Text
                    className={`text-sm ${supplierId === null ? brandChipActiveText(resolved) : chipInactiveText(resolved)}`}
                  >
                    None
                  </Text>
                </Pressable>
                {suppliers.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => setSupplierId(s.id)}
                    className={`mr-2 rounded-full border px-3 py-2 ${
                      supplierId === s.id ? brandChipActiveSurface(resolved) : chipInactiveBorder(resolved)
                    }`}
                  >
                    <Text
                      className={`text-sm ${supplierId === s.id ? brandChipActiveText(resolved) : chipInactiveText(resolved)}`}
                    >
                      {s.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Delivery notes" />

              <Text className={`mb-2 text-sm font-medium ${textFieldLabelClass(resolved)}`}>Lines</Text>
              {lines.map((line, index) => (
                <View key={line.key} className={formLineItemClass(resolved)}>
                  <Text className={`mb-2 text-xs font-medium ${textMutedClass(resolved)}`}>Line {index + 1}</Text>
                  <FormField
                    label="Product"
                    value={line.product_name}
                    onChangeText={(t) => {
                      setLines((prev) =>
                        prev.map((l) => (l.key === line.key ? { ...l, product_name: t } : l)),
                      );
                    }}
                    placeholder="Product name"
                    autoCapitalize="sentences"
                  />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <FormField
                        label="Qty"
                        value={line.qty}
                        onChangeText={(t) => {
                          setLines((prev) =>
                            prev.map((l) => (l.key === line.key ? { ...l, qty: t } : l)),
                          );
                        }}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View className="flex-1">
                      <FormField
                        label="Unit cost"
                        value={line.unit_cost}
                        onChangeText={(t) => {
                          setLines((prev) =>
                            prev.map((l) => (l.key === line.key ? { ...l, unit_cost: t } : l)),
                          );
                        }}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  {lines.length > 1 ? (
                    <Pressable
                      onPress={() =>
                        setLines((prev) => prev.filter((l) => l.key !== line.key))
                      }
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

              <PrimaryButton label="Create draft PO" onPress={() => void onCreatePo()} loading={saving} />
              <Pressable onPress={() => setCreateOpen(false)} className="mt-3 py-3">
                <Text className={`text-center text-base ${textSubtleClass(resolved)}`}>Cancel</Text>
              </Pressable>
            </ScrollView>
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
                  <Text className={`text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>{detail.po_number}</Text>
                  <Pressable onPress={closeDetail} hitSlop={12} accessibilityLabel="Close">
                    <Ionicons name="close" size={26} color={ionIconSecondary(resolved)} />
                  </Pressable>
                </View>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <View className={`rounded-full px-2.5 py-0.5 ${statusBadgeClass(detail.status, resolved)}`}>
                    <Text className="text-xs font-semibold">{poStatusLabel(detail.status)}</Text>
                  </View>
                </View>
                <Text className={`mt-2 text-sm ${textSubtleClass(resolved)}`}>
                  {detail.supplier?.name ?? "No supplier"}
                </Text>
                <Text className={`mt-1 text-xl font-semibold ${subtlePositiveClass(resolved)}`}>
                  {formatPkr(detail.total_amount)}
                </Text>
                {detail.notes ? (
                  <Text className={`mt-3 text-sm ${textSubtleClass(resolved)}`}>{detail.notes}</Text>
                ) : null}

                {!poLinesFullyLinked(detail.items) ? (
                  <View className={poUnlinkedBannerClass(resolved)}>
                    <Text className={poUnlinkedBannerText(resolved)}>
                      Link each line to a product in your catalog before you can place this order or receive
                      stock into inventory.
                    </Text>
                  </View>
                ) : null}

                {detailActionError ? (
                  <View className="mt-3">
                    <ErrorBannerWithSupport message={detailActionError} variant="compact" />
                  </View>
                ) : null}

                <Text className={`mt-6 text-sm font-semibold uppercase tracking-wide ${textMutedClass(resolved)}`}>
                  Lines
                </Text>
                {detail.items.map((it) => (
                  <View
                    key={it.id}
                    className={stackedMutedPanelClass(resolved)}
                  >
                    <Text className={`text-base ${textStrongOnSurfaceClass(resolved)}`}>{it.product_name}</Text>
                    <Text className={`mt-1 text-sm ${textMutedClass(resolved)}`}>
                      {it.qty_ordered} × {formatPkr(it.unit_cost)} · Received {it.qty_received}
                    </Text>
                    <Text className={`mt-1 text-sm ${textStrongOnSurfaceClass(resolved)}`}>{formatPkr(it.line_total)}</Text>
                    {!it.product_id && Number(it.qty_ordered) > 0 ? (
                      <View className="mt-3 flex-row flex-wrap gap-2">
                        <Pressable
                          onPress={() => openQuickAdd(it)}
                          disabled={workflowBusy}
                          className={catalogSearchChipClass(resolved)}
                        >
                          <Text className={`text-sm font-semibold ${catalogSearchChipText(resolved)}`}>
                            Quick add to catalog
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => openProductPicker(it.id)}
                          disabled={workflowBusy}
                          className={brandSoftCtaClass(resolved)}
                        >
                          <Text className={`text-sm font-semibold ${brandSoftCtaText(resolved)}`}>Link existing</Text>
                        </Pressable>
                      </View>
                    ) : it.product_id ? (
                      <Text className={`mt-2 text-xs ${textMutedClass(resolved)}`}>Linked to catalog</Text>
                    ) : null}
                  </View>
                ))}

                <View className="mt-6 gap-3">
                  {detail.supplier?.phone && detail.status !== "draft" && detail.status !== "cancelled" ? (
                    <Pressable
                      onPress={() => void onSendSupplierWhatsApp()}
                      disabled={waBusy}
                      className={
                        resolved === "dark"
                          ? "rounded-xl border border-emerald-700/50 bg-emerald-950/35 py-3.5 active:opacity-90 disabled:opacity-50"
                          : "rounded-xl border border-emerald-300 bg-emerald-50 py-3.5 active:opacity-90 disabled:opacity-50"
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Send supplier WhatsApp alert"
                    >
                      <Text
                        className={`text-center text-base font-semibold ${
                          resolved === "dark" ? "text-emerald-300" : "text-emerald-900"
                        }`}
                      >
                        {waBusy ? "Opening WhatsApp..." : "Send WhatsApp to supplier"}
                      </Text>
                    </Pressable>
                  ) : null}

                  {detail.status === "draft" && poLinesFullyLinked(detail.items) ? (
                    <Pressable
                      onPress={() => void onPlaceOrder()}
                      disabled={workflowBusy}
                      className="rounded-xl bg-brand-600 py-3.5 active:opacity-90 disabled:opacity-50"
                    >
                      <Text className="text-center text-base font-semibold text-white">
                        {workflowBusy ? "…" : "Place order"}
                      </Text>
                    </Pressable>
                  ) : null}

                  {(detail.status === "ordered" || detail.status === "partial") &&
                  poLinesFullyLinked(detail.items) &&
                  hasReceivableRemaining(detail.items) ? (
                    <Pressable
                      onPress={onReceiveRemaining}
                      disabled={workflowBusy}
                      className="rounded-xl bg-brand-600 py-3.5 active:opacity-90 disabled:opacity-50"
                    >
                      <Text className="text-center text-base font-semibold text-white">
                        Receive remaining
                      </Text>
                    </Pressable>
                  ) : null}

                  {(detail.status === "draft" || detail.status === "ordered") && (
                    <Pressable
                      onPress={onCancelPo}
                      disabled={workflowBusy}
                      className="rounded-xl border border-red-900/60 bg-red-950/30 py-3.5 active:opacity-90"
                    >
                      <Text className="text-center text-base font-semibold text-red-400">Cancel order</Text>
                    </Pressable>
                  )}
                </View>

                <Pressable onPress={closeDetail} className={`mt-4 ${modalSecondaryButtonClass(resolved)}`}>
                  <Text className={`text-center text-base font-medium ${textStrongOnSurfaceClass(resolved)}`}>
                    Close
                  </Text>
                </Pressable>
              </ScrollView>
            ) : (
              <Text className={`py-8 text-center ${textSubtleClass(resolved)}`}>Could not load this order.</Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={productPickOpen}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setProductPickOpen(false);
          setLinkingItemId(null);
        }}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className={`max-h-[85%] px-4 pb-8 pt-4 ${bottomSheetContainerClass(resolved)}`}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className={`text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>Choose product</Text>
              <Pressable
                onPress={() => {
                  setProductPickOpen(false);
                  setLinkingItemId(null);
                }}
                hitSlop={12}
              >
                <Ionicons name="close" size={26} color={ionIconSecondary(resolved)} />
              </Pressable>
            </View>
            <SearchBar
              value={productPickQuery}
              onChangeText={setProductPickQuery}
              placeholder="Search products"
              accessibilityLabel="Search products"
            />
            {catalogLoading ? (
              <View className="py-8">
                <ActivityIndicator color={BRAND_ACCENT_HEX} />
              </View>
            ) : (
              <FlatList
                data={filteredCatalog}
                keyExtractor={(p) => p.id}
                style={{ maxHeight: 320 }}
                className="mt-2"
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text className={`py-8 text-center ${textMutedClass(resolved)}`}>
                    {catalogProducts.length === 0
                      ? "No active products in catalog. Add products first."
                      : "No matches."}
                  </Text>
                }
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => void onLinkProduct(item.id)}
                    disabled={workflowBusy}
                    className={`py-3.5 active:opacity-80 ${hairlineBorderBClass(resolved)}`}
                  >
                    <Text className={`text-base ${textStrongOnSurfaceClass(resolved)}`}>{item.name}</Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={receiveConfirmOpen}
        title="Receive stock"
        message="Receive all remaining quantities on this PO and add them to inventory?"
        cancelLabel="Not now"
        confirmLabel="Receive"
        variant="primary"
        loading={workflowBusy}
        onCancel={() => setReceiveConfirmOpen(false)}
        onConfirm={() => void confirmReceiveRemaining()}
      />

      <ConfirmDialog
        visible={cancelPoConfirmOpen}
        title="Cancel order"
        message="Cancel this purchase order? You can only do this for drafts or orders not yet fully received."
        cancelLabel="Keep order"
        confirmLabel="Cancel PO"
        variant="danger"
        loading={workflowBusy}
        onCancel={() => setCancelPoConfirmOpen(false)}
        onConfirm={() => void confirmCancelPo()}
      />

      <Modal
        visible={quickAddOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setQuickAddOpen(false);
          setQuickAddItemId(null);
        }}
      >
        <View className="flex-1 justify-center bg-black/70 px-4">
          <View className={borderedSurfaceClass(resolved)}>
            <Text className={`text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>Quick add to catalog</Text>
            <Text className={`mt-2 text-sm leading-5 ${textMutedClass(resolved)}`}>
              Creates the product from this line name, links it, then you can place or receive stock.
            </Text>
            <View className="mt-4">
              <FormField
                label="Sale price"
                value={quickAddSale}
                onChangeText={setQuickAddSale}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
            <Text className={`mt-3 text-xs font-medium uppercase ${textMutedClass(resolved)}`}>Unit</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-2"
              contentContainerStyle={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
            >
              {PRODUCT_UNITS.map((u) => {
                const active = quickAddUnit === u;
                return (
                  <Pressable
                    key={u}
                    onPress={() => setQuickAddUnit(u)}
                    className={`mr-2 rounded-full border px-3 py-2 ${
                      active ? brandChipActiveSurface(resolved) : chipInactiveBorder(resolved)
                    }`}
                  >
                    <Text className={`text-sm ${active ? brandChipActiveText(resolved) : chipInactiveText(resolved)}`}>
                      {u}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <PrimaryButton
              label="Create & link"
              onPress={() => void onQuickAddSubmit()}
              loading={workflowBusy}
            />
            <Pressable
              onPress={() => {
                setQuickAddOpen(false);
                setQuickAddItemId(null);
              }}
              className="mt-3 py-3"
            >
              <Text className={`text-center text-base ${textSubtleClass(resolved)}`}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
