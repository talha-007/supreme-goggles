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

import { CustomerEditBottomSheet } from "../../src/components/CustomerEditBottomSheet";
import { ErrorBannerWithSupport } from "../../src/components/ErrorBannerWithSupport";
import { headerRightWithSupport } from "../../src/components/SupportHeaderButton";
import { FormField } from "../../src/components/FormField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SearchBar } from "../../src/components/SearchBar";
import { useAuth } from "../../src/contexts/auth-context";
import { useRealtimeNotifications } from "../../src/contexts/realtime-notifications-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import { normalizeCustomer, roundMoney } from "../../src/lib/customers-normalize";
import { formatPkr } from "../../src/lib/format-money";
import { pickPhoneFromContacts } from "../../src/lib/contact-picker";
import { supabase } from "../../src/lib/supabase";
import { normalizeWhatsAppPhone } from "../../src/lib/whatsapp-alerts";
import {
  bottomSheetContainerClass,
  chipInactiveBorder,
  chipInactiveText,
  listEntityCardClass,
  screenCenterRootClass,
  scrollCanvasClass,
  textFieldLabelClass,
  textMutedClass,
  textStrongOnSurfaceClass,
  textSubtleClass,
} from "../../src/theme/semantic";
import { useTheme } from "../../src/contexts/theme-context";
import {
  CUSTOMER_TYPES,
  type CustomerRow,
  type CustomerType,
  customerTypeLabel,
} from "../../src/types/customer";

function matchesQuery(row: CustomerRow, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return (
    row.name.toLowerCase().includes(s) ||
    (row.phone?.toLowerCase().includes(s) ?? false) ||
    (row.email?.toLowerCase().includes(s) ?? false)
  );
}

export default function CustomersScreen() {
  const navigation = useNavigation();
  const bottomPad = useTabScreenBottomPadding();
  const { businessId, user, memberRole } = useAuth();
  const { refreshGeneration } = useRealtimeNotifications();
  const { resolved } = useTheme();
  const isOwner = memberRole === "owner";

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<CustomerType>("retail");
  const [creditLimit, setCreditLimit] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [pickingPhone, setPickingPhone] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [detail, setDetail] = useState<CustomerRow | null>(null);

  const filtered = useMemo(() => rows.filter((r) => matchesQuery(r, query)), [rows, query]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        headerRightWithSupport(
          <Pressable
            onPress={() => {
              setSaveError(null);
              setName("");
              setPhone("");
              setEmail("");
              setAddress("");
              setType("retail");
              setCreditLimit("");
              setNotes("");
              setAddOpen(true);
            }}
            hitSlop={12}
            className="flex-row items-center rounded-full bg-brand-500/15 px-3 py-1.5 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Add customer"
          >
            <Ionicons name="add" size={22} color={BRAND_ACCENT_HEX} />
            <Text className="ml-1 text-sm font-semibold text-brand-400">Add</Text>
          </Pressable>,
        ),
    });
  }, [navigation]);

  const load = useCallback(async () => {
    if (!businessId || !user) {
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: fetchErr } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", businessId)
      .order("name", { ascending: true })
      .limit(500);

    if (fetchErr) {
      setError(fetchErr.message);
      setRows([]);
    } else {
      const list = (data ?? []) as Record<string, unknown>[];
      setRows(list.map(normalizeCustomer));
    }
    setLoading(false);
    setRefreshing(false);
  }, [businessId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (refreshGeneration === 0) return;
    void load();
  }, [refreshGeneration, load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const onSaveCustomer = async () => {
    const n = name.trim();
    if (!n || !businessId) {
      setSaveError("Name is required.");
      return;
    }
    const rawPhone = phone.trim();
    const normalizedPhone = rawPhone.length > 0 ? normalizeWhatsAppPhone(rawPhone) : null;
    if (rawPhone.length > 0 && !normalizedPhone) {
      setSaveError("Enter a valid phone number.");
      return;
    }
    const creditRaw = creditLimit.trim();
    const credit = creditRaw === "" ? 0 : Number(String(creditRaw).replace(/,/g, ""));
    if (!Number.isFinite(credit) || credit < 0) {
      setSaveError("Enter a valid credit limit.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error: insErr } = await supabase.from("customers").insert({
      business_id: businessId,
      name: n,
      phone: normalizedPhone,
      email: email.trim() || null,
      address: address.trim() || null,
      type,
      credit_limit: roundMoney(credit),
      notes: notes.trim() || null,
      is_active: true,
      created_by: session?.user?.id ?? null,
    });

    setSaving(false);
    if (insErr) {
      setSaveError(insErr.message);
      return;
    }
    setAddOpen(false);
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
              placeholder="Search name, phone, or email"
              accessibilityLabel="Search customers"
            />
            <Text className={`mt-2 text-xs ${textMutedClass(resolved)}`}>
              {filtered.length === rows.length
                ? `${rows.length} contact${rows.length === 1 ? "" : "s"}`
                : `${filtered.length} of ${rows.length} shown`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-4 py-12">
            <Ionicons name="people-outline" size={48} color="#525252" />
            <Text className={`mt-4 text-center text-base font-medium ${textFieldLabelClass(resolved)}`}>
              {query.trim() ? "No matches" : "No customers yet"}
            </Text>
            <Text className={`mt-2 text-center text-sm leading-5 ${textMutedClass(resolved)}`}>
              {query.trim()
                ? "Try a different search."
                : "Tap Add to save someone you sell to on credit or at the counter."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const outstanding = item.outstanding_balance > 0.009;
          return (
            <Pressable
              onPress={() => setDetail(item)}
              className={listEntityCardClass(resolved)}
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className={`text-base font-semibold ${textStrongOnSurfaceClass(resolved)}`}>{item.name}</Text>
                  {item.phone ? (
                    <Text className={`mt-1 text-sm ${textSubtleClass(resolved)}`}>{item.phone}</Text>
                  ) : null}
                  <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    <Text className={`text-xs ${textMutedClass(resolved)}`}>{customerTypeLabel(item.type)}</Text>
                    {!item.is_active ? (
                      <Text className="text-xs font-medium uppercase text-amber-500">Inactive</Text>
                    ) : null}
                  </View>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="items-end">
                    <Text
                      className={`text-base font-semibold tabular-nums ${
                        outstanding ? "text-amber-400" : textMutedClass(resolved)
                      }`}
                    >
                      {formatPkr(item.outstanding_balance)}
                    </Text>
                    <Text className={`mt-0.5 text-[10px] uppercase ${textSubtleClass(resolved)}`}>Due</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#525252" />
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className={`max-h-[92%] px-4 pb-8 pt-4 ${bottomSheetContainerClass(resolved)}`}>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className={`text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>New customer</Text>
              <Pressable onPress={() => setAddOpen(false)} hitSlop={12} accessibilityLabel="Close">
                <Ionicons name="close" size={26} color="#a3a3a3" />
              </Pressable>
            </View>
            <Text className={`text-sm ${textMutedClass(resolved)}`}>
              Track who buys from you, credit limits, and what they owe.
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled" className="mt-4">
              <FormField label="Name" value={name} onChangeText={setName} placeholder="Customer name" />
              <FormField
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Optional"
                keyboardType="phone-pad"
              />
              <Pressable
                onPress={() => {
                  void (async () => {
                    setPickingPhone(true);
                    const result = await pickPhoneFromContacts();
                    setPickingPhone(false);
                    if (result.phone) {
                      setPhone(result.phone);
                      return;
                    }
                    if (result.error) {
                      setSaveError(result.error);
                    }
                  })();
                }}
                disabled={saving || pickingPhone}
                className={`mb-3 flex-row items-center justify-center rounded-xl border py-2.5 active:opacity-90 disabled:opacity-50 ${
                  resolved === "dark" ? "border-neutral-700 bg-neutral-900" : "border-zinc-300 bg-zinc-100"
                }`}
                accessibilityRole="button"
                accessibilityLabel="Pick phone from contacts"
              >
                <Ionicons name="person-circle-outline" size={18} color={BRAND_ACCENT_HEX} />
                <Text className={`ml-1.5 text-sm font-medium ${textSubtleClass(resolved)}`}>
                  {pickingPhone ? "Opening contacts..." : "Pick from contacts"}
                </Text>
              </Pressable>
              <FormField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Optional"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormField
                label="Address"
                value={address}
                onChangeText={setAddress}
                placeholder="Optional"
                multiline
              />
              <Text className={`mb-2 text-sm font-medium ${textFieldLabelClass(resolved)}`}>Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
              >
                {CUSTOMER_TYPES.map((t) => {
                  const active = type === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setType(t.value)}
                      className={`mr-2 rounded-full border px-3 py-2 ${
                        active ? "border-brand-500 bg-brand-500/15" : chipInactiveBorder(resolved)
                      }`}
                    >
                      <Text className={`text-sm ${active ? "text-brand-400" : chipInactiveText(resolved)}`}>
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <FormField
                label="Credit limit (PKR)"
                value={creditLimit}
                onChangeText={setCreditLimit}
                placeholder="0"
                keyboardType="decimal-pad"
              />
              <FormField
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional"
                multiline
              />
              {saveError ? <ErrorBannerWithSupport message={saveError} variant="compact" /> : null}
              <PrimaryButton label="Save customer" onPress={() => void onSaveCustomer()} loading={saving} />
              <Pressable onPress={() => setAddOpen(false)} className="mt-3 py-3">
                <Text className={`text-center text-base ${textSubtleClass(resolved)}`}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CustomerEditBottomSheet
        visible={detail !== null}
        customer={detail}
        businessId={businessId}
        isOwner={isOwner}
        onClose={() => setDetail(null)}
        onCustomerUpdated={(row) => {
          setDetail(row);
          setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)));
        }}
        onCustomerDeleted={() => {
          void load();
        }}
      />
    </View>
  );
}
