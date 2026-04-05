import { Ionicons } from "@expo/vector-icons";
import { router, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { FormField } from "../../src/components/FormField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { ProductThumbnail } from "../../src/components/ProductThumbnail";
import { ReceiptShareSheet } from "../../src/components/ReceiptShareSheet";
import { SearchBar } from "../../src/components/SearchBar";
import { useAuth } from "../../src/contexts/auth-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import { invoiceTotals, lineTotal } from "../../src/lib/invoice-calc";
import { createAndFinalizeCashSale } from "../../src/lib/invoice-workflow";
import { fetchReceiptTextForInvoice } from "../../src/lib/receipt-fetch";
import { formatPkr } from "../../src/lib/format-money";
import { supabase } from "../../src/lib/supabase";
import type { CustomerRow } from "../../src/types/customer";

type CatalogRow = { id: string; name: string; unit: string; sale_price: number; image_url: string | null };

type CartLine = {
  product_id: string;
  product_name: string;
  unit: string;
  unit_price: number;
  quantity: number;
  image_url: string | null;
};

function normalizeCatalog(row: Record<string, unknown>): CatalogRow {
  return {
    id: String(row.id),
    name: String(row.name),
    unit: String(row.unit ?? "pcs"),
    sale_price: Number(row.sale_price),
    image_url: row.image_url != null ? String(row.image_url) : null,
  };
}

export default function QuickSaleScreen() {
  const navigation = useNavigation();
  const bottomPad = useTabScreenBottomPadding();
  const { businessId, user } = useAuth();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="ml-1 flex-row items-center py-1"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color="#fafafa" />
        </Pressable>
      ),
    });
  }, [navigation]);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [customers, setCustomers] = useState<Pick<CustomerRow, "id" | "name">[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [taxRateStr, setTaxRateStr] = useState("0");
  const [invoiceDiscountStr, setInvoiceDiscountStr] = useState("0");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptText, setReceiptText] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  const loadDefaults = useCallback(async () => {
    if (!businessId) return;
    const [{ data: cust }, { data: biz }] = await Promise.all([
      supabase
        .from("customers")
        .select("id, name")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name")
        .limit(200),
      supabase
        .from("businesses")
        .select("default_tax_rate, default_invoice_discount_amount")
        .eq("id", businessId)
        .maybeSingle(),
    ]);
    setCustomers((cust ?? []) as Pick<CustomerRow, "id" | "name">[]);
    if (biz) {
      const b = biz as { default_tax_rate?: number; default_invoice_discount_amount?: number };
      setTaxRateStr(String(b.default_tax_rate ?? 0));
      setInvoiceDiscountStr(String(b.default_invoice_discount_amount ?? 0));
    }
  }, [businessId]);

  useEffect(() => {
    void loadDefaults();
  }, [loadDefaults]);

  const loadCatalog = useCallback(async () => {
    if (!businessId || !user) return;
    setCatalogLoading(true);
    const { data, error } = await supabase.rpc("search_products", {
      p_business_id: businessId,
      p_query: debouncedQuery.length > 0 ? debouncedQuery : null,
      p_low_stock_only: false,
      p_limit: 80,
      p_offset: 0,
    });
    setCatalogLoading(false);
    if (error) {
      setCatalog([]);
      return;
    }
    setCatalog(
      (data ?? []).map((r: Record<string, unknown>) => normalizeCatalog(r)),
    );
  }, [businessId, user, debouncedQuery]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const addToCart = (p: CatalogRow) => {
    setSaleError(null);
    setCart((prev) => {
      const i = prev.findIndex((c) => c.product_id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          product_id: p.id,
          product_name: p.name,
          unit: p.unit,
          unit_price: p.sale_price,
          quantity: 1,
          image_url: p.image_url,
        },
      ];
    });
  };

  const setQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const next = prev
        .map((c) =>
          c.product_id === productId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c,
        )
        .filter((c) => c.quantity > 0);
      return next;
    });
  };

  const totals = useMemo(() => {
    const lineTotals = cart.map((c) =>
      lineTotal(c.quantity, c.unit_price, 0),
    );
    const tax = Number(String(taxRateStr).replace(",", ".")) || 0;
    const disc = Number(String(invoiceDiscountStr).replace(",", ".")) || 0;
    return invoiceTotals(lineTotals, disc, tax);
  }, [cart, taxRateStr, invoiceDiscountStr]);

  const onCompleteSale = async () => {
    if (!businessId || cart.length === 0) {
      setSaleError("Add at least one product.");
      return;
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setSaleError("Sign in required.");
      return;
    }
    const tax = Number(String(taxRateStr).replace(",", "."));
    const disc = Number(String(invoiceDiscountStr).replace(",", "."));
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      setSaleError("Invalid tax %.");
      return;
    }
    if (!Number.isFinite(disc) || disc < 0) {
      setSaleError("Invalid discount.");
      return;
    }

    setSaving(true);
    setSaleError(null);

    const { error: err, invoiceId } = await createAndFinalizeCashSale(supabase, businessId, uid, {
      customerId: customerId,
      notes: null,
      discount_amount: Math.round(disc * 100) / 100,
      tax_rate: Math.round(tax * 100) / 100,
      lines: cart.map((c) => ({
        product_id: c.product_id,
        product_name: c.product_name,
        unit: c.unit,
        quantity: c.quantity,
        unit_price: c.unit_price,
        discount_pct: 0,
      })),
    });

    setSaving(false);
    if (err || !invoiceId) {
      setSaleError(err ?? "Sale failed.");
      return;
    }

    const receipt = await fetchReceiptTextForInvoice(supabase, businessId, invoiceId);
    if ("error" in receipt) {
      setReceiptText(`Sale completed.\nInvoice ID: ${invoiceId}\n(${receipt.error})`);
    } else {
      setReceiptText(receipt.text);
    }
    setReceiptOpen(true);
    setCart([]);
    setQuery("");
    void loadDefaults();
  };

  const closeReceipt = () => {
    setReceiptOpen(false);
    setReceiptText("");
  };

  return (
    <View className="flex-1 bg-neutral-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="px-4 pt-2 text-sm text-neutral-500">
          Search products, tap to add. Adjust quantities, then complete the sale — one step, cash in full.
        </Text>

        <View className="px-4 pt-3">
          <Text className="mb-2 text-xs font-medium uppercase text-neutral-600">Customer (optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
          >
            <Pressable
              onPress={() => setCustomerId(null)}
              className={`mr-2 rounded-full border px-3 py-2 ${
                customerId === null ? "border-emerald-500 bg-emerald-500/15" : "border-neutral-700 bg-neutral-900"
              }`}
            >
              <Text className="text-sm text-neutral-200">Walk-in</Text>
            </Pressable>
            {customers.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCustomerId(c.id)}
                className={`mr-2 rounded-full border px-3 py-2 ${
                  customerId === c.id ? "border-emerald-500 bg-emerald-500/15" : "border-neutral-700 bg-neutral-900"
                }`}
              >
                <Text className="max-w-[140px] text-sm text-neutral-200" numberOfLines={1}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View className="px-4 pt-4">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search products by name, SKU, barcode"
            accessibilityLabel="Search products to sell"
          />
        </View>

        {catalogLoading ? (
          <View className="py-8">
            <ActivityIndicator color="#34d399" />
          </View>
        ) : catalog.length === 0 ? (
          <Text className="px-4 py-6 text-center text-sm text-neutral-500">
            No products. Add stock under Stock or adjust search.
          </Text>
        ) : (
          catalog.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => addToCart(item)}
              className="border-b border-neutral-800 px-4 py-3.5 active:bg-neutral-900"
            >
              <View className="flex-row items-center justify-between gap-2">
                <ProductThumbnail imageUrl={item.image_url} size={48} />
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-medium text-neutral-100">{item.name}</Text>
                  <Text className="mt-0.5 text-sm text-neutral-500">
                    {item.unit} · {formatPkr(item.sale_price)}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={28} color="#34d399" />
              </View>
            </Pressable>
          ))
        )}

        <View className="mt-4 px-4">
          <Text className="text-xs font-medium uppercase text-neutral-600">Cart</Text>
          {cart.length === 0 ? (
            <Text className="mt-2 text-sm text-neutral-500">Tap products above to build the sale.</Text>
          ) : (
            cart.map((c) => (
              <View
                key={c.product_id}
                className="mt-2 flex-row items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-3"
              >
                <ProductThumbnail imageUrl={c.image_url} size={44} />
                <View className="min-w-0 flex-1">
                  <Text className="text-base text-neutral-100" numberOfLines={2}>
                    {c.product_name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-neutral-500">
                    {formatPkr(c.unit_price)} / {c.unit}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable
                    onPress={() => setQty(c.product_id, -1)}
                    className="h-9 w-9 items-center justify-center rounded-lg bg-neutral-800"
                    accessibilityLabel="Decrease quantity"
                  >
                    <Text className="text-lg text-neutral-200">−</Text>
                  </Pressable>
                  <Text className="min-w-[28px] text-center text-base font-semibold text-neutral-100">
                    {c.quantity}
                  </Text>
                  <Pressable
                    onPress={() => setQty(c.product_id, 1)}
                    className="h-9 w-9 items-center justify-center rounded-lg bg-neutral-800"
                    accessibilityLabel="Increase quantity"
                  >
                    <Text className="text-lg text-neutral-200">+</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <View className="mt-4 px-4">
          <Text className="mb-2 text-xs text-neutral-500">
            Defaults load from your store settings; change for this sale only if needed.
          </Text>
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
                label="Discount (PKR)"
                value={invoiceDiscountStr}
                onChangeText={setInvoiceDiscountStr}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        className="border-t border-neutral-800 bg-neutral-950 px-4 pt-3"
        style={{ paddingBottom: bottomPad + 12 }}
      >
        <View className="mb-3 flex-row items-end justify-between">
          <View>
            <Text className="text-xs uppercase text-neutral-500">Total</Text>
            <Text className="text-2xl font-bold text-emerald-400">{formatPkr(totals.total_amount)}</Text>
            <Text className="text-xs text-neutral-600">
              Subtotal {formatPkr(totals.subtotal)} · Tax {formatPkr(totals.tax_amount)}
            </Text>
          </View>
        </View>
        {saleError ? (
          <Text className="mb-2 text-sm text-red-400" accessibilityRole="alert">
            {saleError}
          </Text>
        ) : null}
        <PrimaryButton
          label={saving ? "Processing…" : "Complete sale (cash)"}
          onPress={() => void onCompleteSale()}
          loading={saving}
          disabled={cart.length === 0}
        />
        <Text className="mt-2 text-center text-[11px] text-neutral-600">
          Records payment in full and updates stock. Receipt opens to share or print.
        </Text>
      </View>

      <ReceiptShareSheet visible={receiptOpen} receiptText={receiptText} onClose={closeReceipt} />
    </View>
  );
}
