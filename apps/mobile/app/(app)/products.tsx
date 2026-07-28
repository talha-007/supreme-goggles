import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

import { BRAND_ACCENT_HEX } from "../../src/theme/brand";

import { ErrorBannerWithSupport } from "../../src/components/ErrorBannerWithSupport";
import { headerRightWithSupport } from "../../src/components/SupportHeaderButton";
import { FormField } from "../../src/components/FormField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProductThumbnail } from "../../src/components/ProductThumbnail";
import { SearchBar } from "../../src/components/SearchBar";
import { useAuth } from "../../src/contexts/auth-context";
import { useRealtimeNotifications } from "../../src/contexts/realtime-notifications-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import { formatPkr } from "../../src/lib/format-money";
import { deleteProductImageByUrl, uploadProductImageFromUri } from "../../src/lib/product-images";
import {
  addProductBatch,
  formatBatchExpiry,
  listProductBatches,
  type ProductBatchRow,
} from "../../src/lib/product-batches";
import { supabase } from "../../src/lib/supabase";
import {
  bottomSheetContainerClass,
  chipInactiveBorder,
  chipInactiveText,
  compactPressableFieldClass,
  listEntityCardClass,
  screenCenterRootClass,
  scrollCanvasClass,
  textFieldLabelClass,
  textStrongOnSurfaceClass,
  textSubtleClass,
} from "../../src/theme/semantic";
import { useTheme } from "../../src/contexts/theme-context";
import { PRODUCT_UNITS, type ProductRow, type ProductUnit } from "../../src/types/product";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatExpiryDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "-";
  const d = new Date(`${iso.trim()}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}

function parseExpiryDateInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function normalizeProduct(row: Record<string, unknown>): ProductRow {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    name: String(row.name),
    sku: row.sku != null ? String(row.sku) : null,
    barcode: row.barcode != null ? String(row.barcode) : null,
    category: row.category != null ? String(row.category) : null,
    brand: row.brand != null ? String(row.brand) : null,
    oem_part_number: row.oem_part_number != null ? String(row.oem_part_number) : null,
    alternate_part_numbers:
      row.alternate_part_numbers != null ? String(row.alternate_part_numbers) : null,
    application_notes: row.application_notes != null ? String(row.application_notes) : null,
    manufacturer: row.manufacturer != null ? String(row.manufacturer) : null,
    description: row.description != null ? String(row.description) : null,
    unit: (String(row.unit ?? "pcs") || "pcs") as ProductUnit,
    purchase_price: Number(row.purchase_price),
    sale_price: Number(row.sale_price),
    current_stock: Number(row.current_stock),
    reorder_level: Number(row.reorder_level),
    generic_name: row.generic_name != null ? String(row.generic_name) : null,
    expiry_date: row.expiry_date != null ? String(row.expiry_date) : null,
    requires_prescription: row.requires_prescription === true,
    mrp: row.mrp != null ? Number(row.mrp) : null,
    is_active: Boolean(row.is_active),
    image_url: row.image_url != null ? String(row.image_url) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function isLowStock(p: ProductRow): boolean {
  return p.reorder_level > 0 && p.current_stock <= p.reorder_level;
}

type StockFilter = "all" | "low";

const STOCK_FILTERS: { key: StockFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "low", label: "Low stock" },
];

export default function ProductsScreen() {
  const navigation = useNavigation();
  const bottomPad = useTabScreenBottomPadding();
  const { businessId, user } = useAuth();
  const { refreshGeneration } = useRealtimeNotifications();
  const { resolved } = useTheme();

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const lowStockOnly = stockFilter === "low";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState<ProductUnit>("pcs");
  const [salePrice, setSalePrice] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [pendingMimeType, setPendingMimeType] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPharmacyFields, setShowPharmacyFields] = useState(false);
  const [batchExpiryMode, setBatchExpiryMode] = useState(false);
  const [genericName, setGenericName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [mrp, setMrp] = useState("");
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [batches, setBatches] = useState<ProductBatchRow[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchFormOpen, setBatchFormOpen] = useState(false);
  const [batchNo, setBatchNo] = useState("");
  const [batchExpiry, setBatchExpiry] = useState("");
  const [batchQty, setBatchQty] = useState("");
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const [detail, setDetail] = useState<ProductRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!businessId) return;
    void (async () => {
      const [{ data: businessRow }, { data: settingsRow }] = await Promise.all([
        supabase.from("businesses").select("type").eq("id", businessId).maybeSingle(),
        supabase
          .from("business_settings")
          .select("enable_batch_expiry, enable_prescription_flow")
          .eq("business_id", businessId)
          .maybeSingle(),
      ]);
      const batchExpiry = settingsRow?.enable_batch_expiry === true;
      const prescriptionFlow = settingsRow?.enable_prescription_flow === true;
      const isPharmacy = businessRow?.type === "pharmacy";
      setBatchExpiryMode(batchExpiry);
      setShowPharmacyFields(isPharmacy || batchExpiry || prescriptionFlow);
    })();
  }, [businessId]);

  const load = useCallback(async () => {
    if (!businessId || !user) {
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error: rpcErr } = await supabase.rpc("search_products", {
      p_business_id: businessId,
      p_query: debouncedQuery.length > 0 ? debouncedQuery : null,
      p_low_stock_only: lowStockOnly,
      p_limit: 100,
      p_offset: 0,
    });

    if (rpcErr) {
      setError(rpcErr.message);
      setRows([]);
    } else {
      const list = (data ?? []) as Record<string, unknown>[];
      setRows(list.map(normalizeProduct));
    }
    setLoading(false);
    setRefreshing(false);
  }, [businessId, user, debouncedQuery, lowStockOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (refreshGeneration === 0) return;
    void load();
  }, [refreshGeneration, load]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        headerRightWithSupport(
          <Pressable
            onPress={() => {
              setSaveError(null);
              setEditingId(null);
              setName("");
              setSku("");
              setCategory("");
              setBrand("");
              setUnit("pcs");
              setSalePrice("");
              setPurchasePrice("");
              setCurrentStock("0");
              setReorderLevel("0");
              setIsActive(true);
              setGenericName("");
              setExpiryDate("");
              setMrp("");
              setRequiresPrescription(false);
              setPendingImageUri(null);
              setPendingMimeType(null);
              setRemoveImage(false);
              setExistingImageUrl(null);
              setFormOpen(true);
            }}
            hitSlop={12}
            className="flex-row items-center rounded-full bg-brand-500/15 px-3 py-1.5 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Add product"
          >
            <Ionicons name="add" size={22} color={BRAND_ACCENT_HEX} />
            <Text className="ml-1 text-sm font-semibold text-brand-400">Add</Text>
          </Pressable>,
        ),
    });
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const openDetail = async (p: ProductRow) => {
    setDetail(p);
    if (!batchExpiryMode || !businessId) {
      setBatches([]);
      return;
    }
    setBatchesLoading(true);
    const { batches: list, error: batchErr } = await listProductBatches(supabase, businessId, p.id);
    setBatches(list);
    if (batchErr) setError(batchErr);
    setBatchesLoading(false);
  };

  const onSaveBatch = async () => {
    if (!businessId || !detail) return;
    const qty = Number(String(batchQty).replace(/,/g, ""));
    if (!batchNo.trim()) {
      setBatchError("Batch number is required.");
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setBatchError("Enter a valid quantity.");
      return;
    }
    setBatchSaving(true);
    setBatchError(null);
    const expiry = batchExpiry.trim();
    const res = await addProductBatch(supabase, businessId, detail.id, {
      batch_no: batchNo.trim(),
      expiry_date: /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? expiry : null,
      qty,
    });
    setBatchSaving(false);
    if (res.error) {
      setBatchError(res.error);
      return;
    }
    setBatchFormOpen(false);
    setBatchNo("");
    setBatchExpiry("");
    setBatchQty("");
    void load();
    const { batches: list } = await listProductBatches(supabase, businessId, detail.id);
    setBatches(list);
    const updated = rows.find((r) => r.id === detail.id);
    if (updated) setDetail(updated);
  };

  const openFormForEdit = (p: ProductRow) => {
    setSaveError(null);
    setDetail(null);
    setEditingId(p.id);
    setName(p.name);
    setSku(p.sku ?? "");
    setCategory(p.category ?? "");
    setBrand(p.brand ?? "");
    setUnit(p.unit);
    setSalePrice(String(p.sale_price));
    setPurchasePrice(String(p.purchase_price));
    setCurrentStock(String(p.current_stock));
    setReorderLevel(String(p.reorder_level));
    setIsActive(p.is_active);
    setGenericName(p.generic_name ?? "");
    setExpiryDate(p.expiry_date ?? "");
    setMrp(p.mrp != null ? String(p.mrp) : "");
    setRequiresPrescription(p.requires_prescription === true);
    setPendingImageUri(null);
    setPendingMimeType(null);
    setRemoveImage(false);
    setExistingImageUrl(p.image_url);
    setFormOpen(true);
  };

  const pickProductImage = async () => {
    setSaveError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setSaveError("Allow photo access in Settings to add product pictures.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    setPendingImageUri(a.uri);
    setPendingMimeType(a.mimeType ?? "image/jpeg");
    setRemoveImage(false);
  };

  const onSaveProduct = async () => {
    const n = name.trim();
    if (!n || !businessId) {
      setSaveError("Name is required.");
      return;
    }
    const sale = Number(String(salePrice).replace(/,/g, ""));
    const purchase = Number(String(purchasePrice).replace(/,/g, ""));
    const stock = Number(String(currentStock).replace(/,/g, ""));
    const reorder = Number(String(reorderLevel).replace(/,/g, ""));
    if (!Number.isFinite(sale) || sale < 0) {
      setSaveError("Enter a valid sale price.");
      return;
    }
    if (!Number.isFinite(purchase) || purchase < 0) {
      setSaveError("Enter a valid purchase price.");
      return;
    }
    if (!batchExpiryMode && (!Number.isFinite(stock) || stock < 0)) {
      setSaveError("Enter a valid current stock.");
      return;
    }
    if (!Number.isFinite(reorder) || reorder < 0) {
      setSaveError("Enter a valid reorder level.");
      return;
    }
    if (showPharmacyFields && !batchExpiryMode && expiryDate.trim() && !parseExpiryDateInput(expiryDate)) {
      setSaveError("Expiry date must be YYYY-MM-DD (e.g. 2026-12-31).");
      return;
    }
    const mrpNum = mrp.trim() ? Number(String(mrp).replace(/,/g, "")) : null;
    if (showPharmacyFields && mrp.trim() && (!Number.isFinite(mrpNum) || (mrpNum ?? 0) < 0)) {
      setSaveError("Enter a valid MRP.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const baseRow: Record<string, unknown> = {
      name: n,
      sku: sku.trim() || null,
      barcode: null,
      category: category.trim() || null,
      brand: brand.trim() || null,
      description: null,
      unit,
      purchase_price: roundMoney(purchase),
      sale_price: roundMoney(sale),
      current_stock: batchExpiryMode && !editingId ? 0 : stock,
      reorder_level: reorder,
      is_active: isActive,
    };
    if (showPharmacyFields) {
      baseRow.generic_name = genericName.trim() || null;
      if (!batchExpiryMode) {
        baseRow.expiry_date = parseExpiryDateInput(expiryDate);
      }
      baseRow.mrp = mrpNum != null ? roundMoney(mrpNum) : null;
      baseRow.requires_prescription = requiresPrescription;
    }

    if (editingId) {
      const { error: updErr } = await supabase
        .from("products")
        .update(baseRow)
        .eq("id", editingId)
        .eq("business_id", businessId);

      if (updErr) {
        setSaving(false);
        if (updErr.code === "23505") {
          setSaveError("SKU must be unique in your business.");
        } else {
          setSaveError(updErr.message);
        }
        return;
      }

      const prevUrl = existingImageUrl;

      if (removeImage && prevUrl) {
        await deleteProductImageByUrl(supabase, prevUrl);
        await supabase
          .from("products")
          .update({ image_url: null })
          .eq("id", editingId)
          .eq("business_id", businessId);
      } else if (pendingImageUri) {
        if (prevUrl) await deleteProductImageByUrl(supabase, prevUrl);
        const up = await uploadProductImageFromUri(
          supabase,
          businessId,
          editingId,
          pendingImageUri,
          pendingMimeType ?? "image/jpeg",
        );
        if ("error" in up) {
          setSaveError(up.error);
          setSaving(false);
          return;
        }
        await supabase
          .from("products")
          .update({ image_url: up.url })
          .eq("id", editingId)
          .eq("business_id", businessId);
      }
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("products")
        .insert({
          business_id: businessId,
          ...baseRow,
          created_by: session?.user?.id ?? null,
        })
        .select("id")
        .single();

      if (insErr || !inserted) {
        setSaving(false);
        if (insErr?.code === "23505") {
          setSaveError("SKU must be unique in your business.");
        } else {
          setSaveError(insErr?.message ?? "Could not save.");
        }
        return;
      }

      const productId = String((inserted as { id: string }).id);

      if (pendingImageUri) {
        const up = await uploadProductImageFromUri(
          supabase,
          businessId,
          productId,
          pendingImageUri,
          pendingMimeType ?? "image/jpeg",
        );
        if ("error" in up) {
          setSaveError(up.error);
          setSaving(false);
          return;
        }
        await supabase
          .from("products")
          .update({ image_url: up.url })
          .eq("id", productId)
          .eq("business_id", businessId);
      }
    }

    setSaving(false);
    setFormOpen(false);
    void load();
  };

  const lowCount = useMemo(() => rows.filter(isLowStock).length, [rows]);

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
        data={rows}
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
              placeholder="Search name, SKU, generic, or barcode"
              accessibilityLabel="Search products"
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
              {STOCK_FILTERS.map((f) => {
                const active = stockFilter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setStockFilter(f.key)}
                    className={`mr-2 rounded-full border px-3.5 py-2 ${
                      active ? "border-brand-500 bg-brand-500/15" : chipInactiveBorder(resolved)
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${active ? "text-brand-400" : chipInactiveText(resolved)}`}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-xs text-neutral-500">
                {rows.length} item{rows.length === 1 ? "" : "s"}
                {!lowStockOnly && rows.length > 0 && lowCount > 0
                  ? ` · ${lowCount} low`
                  : null}
              </Text>
              {loading && rows.length > 0 ? (
                <ActivityIndicator size="small" color={BRAND_ACCENT_HEX} />
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-4 py-12">
            <Ionicons name="cube-outline" size={48} color="#525252" />
            <Text className={`mt-4 text-center text-base font-medium ${textFieldLabelClass(resolved)}`}>
              {query.trim() || lowStockOnly ? "No products match" : "No products yet"}
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-neutral-500">
              {query.trim() || lowStockOnly
                ? "Try another search or filter."
                : "Tap Add to create a catalog item and track stock."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const low = isLowStock(item);
          return (
            <Pressable
              onPress={() => void openDetail(item)}
              className={listEntityCardClass(resolved)}
            >
              <View className="flex-row items-start justify-between gap-3">
                <ProductThumbnail imageUrl={item.image_url} size={56} />
                <View className="min-w-0 flex-1">
                  <Text className={`text-base font-semibold ${textStrongOnSurfaceClass(resolved)}`} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {showPharmacyFields && item.generic_name ? (
                    <Text className="mt-0.5 text-xs text-neutral-500" numberOfLines={1}>
                      {item.generic_name}
                    </Text>
                  ) : null}
                  {item.sku ? (
                    <Text className="mt-1 font-mono text-xs text-neutral-500">{item.sku}</Text>
                  ) : null}
                  <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    <Text className="text-xs text-neutral-500">{item.unit}</Text>
                    {!item.is_active ? (
                      <Text className="text-xs font-medium uppercase text-amber-500">Inactive</Text>
                    ) : null}
                  </View>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="items-end">
                    <Text
                      className={`text-lg font-semibold tabular-nums ${
                        low ? "text-amber-400" : "text-brand-400/95"
                      }`}
                    >
                      {item.current_stock}
                    </Text>
                    {low ? (
                      <Text className="mt-0.5 text-[10px] font-medium uppercase text-amber-500/90">
                        Low
                      </Text>
                    ) : null}
                    <Text className="mt-1 text-xs text-neutral-500">{formatPkr(item.sale_price)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#525252" />
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className={`max-h-[92%] px-4 pb-8 pt-4 ${bottomSheetContainerClass(resolved)}`}>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className={`text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>
                {editingId ? "Edit product" : "New product"}
              </Text>
              <Pressable onPress={() => setFormOpen(false)} hitSlop={12} accessibilityLabel="Close">
                <Ionicons name="close" size={26} color="#a3a3a3" />
              </Pressable>
            </View>
            <Text className="text-sm text-neutral-500">
              {editingId
                ? "Update details and photo. Saves to your catalog."
                : "Add to your catalog to sell and track inventory."}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" className="mt-4">
              <Text className={`mb-2 text-sm font-medium ${textFieldLabelClass(resolved)}`}>Photo</Text>
              <View className="mb-4 flex-row flex-wrap items-center gap-3">
                <ProductThumbnail
                  imageUrl={
                    pendingImageUri ??
                    (!removeImage ? existingImageUrl : null)
                  }
                  size={112}
                />
                <View className="min-w-0 flex-1 gap-2">
                  <Pressable
                    onPress={() => void pickProductImage()}
                    className={compactPressableFieldClass(resolved)}
                  >
                    <Text className="text-center text-sm font-medium text-brand-400">
                      {pendingImageUri || existingImageUrl ? "Change photo" : "Add photo"}
                    </Text>
                  </Pressable>
                  {(existingImageUrl || pendingImageUri) && !removeImage ? (
                    <Pressable
                      onPress={() => {
                        setRemoveImage(true);
                        setPendingImageUri(null);
                        setPendingMimeType(null);
                      }}
                      className="rounded-xl border border-neutral-800 py-2"
                    >
                      <Text className="text-center text-sm text-neutral-500">Remove photo</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <FormField label="Name" value={name} onChangeText={setName} placeholder="Product name" />
              <FormField
                label="SKU (optional)"
                value={sku}
                onChangeText={setSku}
                placeholder="Unique in your store"
                autoCapitalize="none"
              />
              <FormField
                label="Category (optional)"
                value={category}
                onChangeText={setCategory}
                placeholder="e.g. Beverages"
                autoCapitalize="words"
              />
              <FormField
                label="Brand (optional)"
                value={brand}
                onChangeText={setBrand}
                placeholder="e.g. Nestlé"
                autoCapitalize="words"
              />
              {showPharmacyFields ? (
                <>
                  <FormField
                    label="Generic name (optional)"
                    value={genericName}
                    onChangeText={setGenericName}
                    placeholder="e.g. Paracetamol"
                    autoCapitalize="words"
                  />
                  {!batchExpiryMode ? (
                    <FormField
                      label="Expiry date (optional)"
                      value={expiryDate}
                      onChangeText={setExpiryDate}
                      placeholder="YYYY-MM-DD"
                      autoCapitalize="none"
                    />
                  ) : null}
                  <FormField
                    label="MRP (optional)"
                    value={mrp}
                    onChangeText={setMrp}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                  <View className="mb-4 flex-row items-center justify-between rounded-xl border border-neutral-800 px-3 py-3">
                    <Text className={`text-sm font-medium ${textFieldLabelClass(resolved)}`}>
                      Requires prescription
                    </Text>
                    <Switch
                      value={requiresPrescription}
                      onValueChange={setRequiresPrescription}
                      trackColor={{ false: "#404040", true: BRAND_ACCENT_HEX }}
                    />
                  </View>
                </>
              ) : null}
              <Text className={`mb-2 text-sm font-medium ${textFieldLabelClass(resolved)}`}>Unit</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
              >
                {PRODUCT_UNITS.map((u) => {
                  const active = unit === u;
                  return (
                    <Pressable
                      key={u}
                      onPress={() => setUnit(u)}
                      className={`mr-2 rounded-full border px-3 py-2 ${
                        active ? "border-brand-500 bg-brand-500/15" : chipInactiveBorder(resolved)
                      }`}
                    >
                      <Text className={`text-sm ${active ? "text-brand-400" : chipInactiveText(resolved)}`}>
                        {u}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField
                    label="Sale price"
                    value={salePrice}
                    onChangeText={setSalePrice}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <FormField
                    label="Purchase price"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              {!batchExpiryMode ? (
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <FormField
                    label="Current stock"
                    value={currentStock}
                    onChangeText={setCurrentStock}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <FormField
                    label="Reorder at"
                    value={reorderLevel}
                    onChangeText={setReorderLevel}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              ) : (
                <FormField
                  label="Reorder at"
                  value={reorderLevel}
                  onChangeText={setReorderLevel}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              )}
              {saveError ? <ErrorBannerWithSupport message={saveError} variant="compact" /> : null}
              <PrimaryButton
                label={editingId ? "Save changes" : "Save product"}
                onPress={() => void onSaveProduct()}
                loading={saving}
              />
              <Pressable onPress={() => setFormOpen(false)} className="mt-3 py-3">
                <Text className={`text-center text-base ${textSubtleClass(resolved)}`}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={detail !== null} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className={`max-h-[88%] px-4 pb-10 pt-4 ${bottomSheetContainerClass(resolved)}`}>
            {detail ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="min-w-0 flex-1 flex-row items-start gap-3">
                    <ProductThumbnail imageUrl={detail.image_url} size={88} />
                    <Text className={`flex-1 text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>{detail.name}</Text>
                  </View>
                  <Pressable onPress={() => setDetail(null)} hitSlop={12} accessibilityLabel="Close">
                    <Ionicons name="close" size={26} color="#a3a3a3" />
                  </Pressable>
                </View>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <View
                    className={`rounded-full px-2.5 py-0.5 ${
                      detail.is_active
                        ? "bg-brand-950 text-brand-400"
                        : resolved === "dark"
                          ? "bg-neutral-800 text-neutral-400"
                          : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    <Text className="text-xs font-semibold">
                      {detail.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                  {isLowStock(detail) ? (
                    <View className="rounded-full bg-amber-950 px-2.5 py-0.5">
                      <Text className="text-xs font-semibold text-amber-400">Low stock</Text>
                    </View>
                  ) : null}
                </View>

                <Text className="mt-4 text-3xl font-semibold tabular-nums text-brand-400/95">
                  {detail.current_stock}{" "}
                  <Text className="text-lg font-medium text-neutral-500">{detail.unit}</Text>
                </Text>
                <Text className="mt-1 text-sm text-neutral-500">
                  Reorder when at or below {detail.reorder_level} {detail.unit}
                </Text>

                <View className="mt-6 gap-0">
                  <DetailRow label="SKU" value={detail.sku ?? "-"} />
                  <DetailRow label="Barcode" value={detail.barcode ?? "-"} />
                  <DetailRow label="Category" value={detail.category ?? "-"} />
                  <DetailRow label="Brand" value={detail.brand ?? "-"} />
                  {showPharmacyFields ? (
                    <>
                      <DetailRow label="Generic name" value={detail.generic_name ?? "-"} />
                      {!batchExpiryMode ? (
                        <DetailRow label="Expiry" value={formatExpiryDate(detail.expiry_date)} />
                      ) : null}
                      <DetailRow
                        label="MRP"
                        value={detail.mrp != null ? formatPkr(detail.mrp) : "-"}
                      />
                      <DetailRow
                        label="Prescription"
                        value={detail.requires_prescription ? "Required" : "Not required"}
                      />
                    </>
                  ) : null}
                  {batchExpiryMode ? (
                    <View className="mt-4">
                      <Text className={`text-sm font-semibold ${textStrongOnSurfaceClass(resolved)}`}>
                        Stock batches
                      </Text>
                      <Text className="mt-1 text-xs text-neutral-500">
                        Sales use oldest expiry first (FEFO).
                      </Text>
                      {batchesLoading ? (
                        <ActivityIndicator className="mt-3" size="small" color={BRAND_ACCENT_HEX} />
                      ) : batches.length === 0 ? (
                        <Text className="mt-2 text-sm text-neutral-500">No batches yet.</Text>
                      ) : (
                        <View className="mt-2 gap-2">
                          {batches.map((b) => (
                            <View
                              key={b.id}
                              className="flex-row items-center justify-between rounded-lg border border-neutral-800 px-3 py-2"
                            >
                              <View>
                                <Text className={`font-mono text-xs ${textStrongOnSurfaceClass(resolved)}`}>
                                  {b.batch_no}
                                </Text>
                                <Text className="text-xs text-neutral-500">
                                  Exp: {formatBatchExpiry(b.expiry_date)}
                                </Text>
                              </View>
                              <Text className="text-sm font-semibold tabular-nums text-brand-400/95">
                                {b.qty_on_hand}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <Pressable
                        onPress={() => {
                          setBatchError(null);
                          setBatchNo("");
                          setBatchExpiry("");
                          setBatchQty("");
                          setBatchFormOpen(true);
                        }}
                        className="mt-3 rounded-xl border border-brand-500/40 py-2.5"
                      >
                        <Text className="text-center text-sm font-medium text-brand-400">Add batch</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  <DetailRow label="Sale price" value={formatPkr(detail.sale_price)} />
                  <DetailRow label="Purchase price" value={formatPkr(detail.purchase_price)} />
                </View>

                <Pressable
                  onPress={() => openFormForEdit(detail)}
                  className="mt-6 rounded-xl bg-brand-600 py-3.5 active:opacity-90"
                >
                  <Text className="text-center text-base font-semibold text-white">Edit product</Text>
                </Pressable>
                <Pressable onPress={() => setDetail(null)} className="mt-3 rounded-xl bg-neutral-800 py-3">
                  <Text className={`text-center text-base font-medium ${textStrongOnSurfaceClass(resolved)}`}>Close</Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={batchFormOpen} animationType="slide" transparent onRequestClose={() => setBatchFormOpen(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className={`px-4 pb-10 pt-4 ${bottomSheetContainerClass(resolved)}`}>
            <Text className={`text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>Add batch</Text>
            <FormField label="Batch number" value={batchNo} onChangeText={setBatchNo} placeholder="e.g. B2401" />
            <FormField
              label="Expiry (YYYY-MM-DD)"
              value={batchExpiry}
              onChangeText={setBatchExpiry}
              placeholder="2026-12-31"
              autoCapitalize="none"
            />
            <FormField
              label="Quantity"
              value={batchQty}
              onChangeText={setBatchQty}
              placeholder="0"
              keyboardType="decimal-pad"
            />
            {batchError ? <ErrorBannerWithSupport message={batchError} variant="compact" /> : null}
            <PrimaryButton label="Save batch" onPress={() => void onSaveBatch()} loading={batchSaving} />
            <Pressable onPress={() => setBatchFormOpen(false)} className="mt-3 py-3">
              <Text className={`text-center text-base ${textSubtleClass(resolved)}`}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4 border-b border-neutral-800 py-3">
      <Text className="text-sm text-neutral-500">{label}</Text>
      <Text className="max-w-[60%] flex-shrink text-right text-sm text-neutral-200">{value}</Text>
    </View>
  );
}
