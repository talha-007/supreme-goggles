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

import { FormField } from "../../src/components/FormField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SearchBar } from "../../src/components/SearchBar";
import { useAuth } from "../../src/contexts/auth-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import { formatPkr } from "../../src/lib/format-money";
import { supabase } from "../../src/lib/supabase";
import {
  CUSTOMER_TYPES,
  type CustomerRow,
  type CustomerType,
  customerTypeLabel,
} from "../../src/types/customer";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeCustomer(row: Record<string, unknown>): CustomerRow {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    name: String(row.name),
    phone: row.phone != null ? String(row.phone) : null,
    email: row.email != null ? String(row.email) : null,
    address: row.address != null ? String(row.address) : null,
    type: (String(row.type ?? "retail") || "retail") as CustomerType,
    credit_limit: Number(row.credit_limit),
    outstanding_balance: Number(row.outstanding_balance),
    notes: row.notes != null ? String(row.notes) : null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

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
  const { businessId, user } = useAuth();

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
  const [saveError, setSaveError] = useState<string | null>(null);

  const [detail, setDetail] = useState<CustomerRow | null>(null);

  const filtered = useMemo(() => rows.filter((r) => matchesQuery(r, query)), [rows, query]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
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
          className="mr-1 flex-row items-center rounded-full bg-emerald-500/15 px-3 py-1.5 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel="Add customer"
        >
          <Ionicons name="add" size={22} color="#34d399" />
          <Text className="ml-1 text-sm font-semibold text-emerald-400">Add</Text>
        </Pressable>
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
      phone: phone.trim() || null,
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
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <ActivityIndicator size="large" color="#34d399" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-950">
      {error ? (
        <Text className="px-4 pt-3 text-sm text-red-400" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPad + 8, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#34d399" />
        }
        ListHeaderComponent={
          <View className="pb-2 pt-2">
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Search name, phone, or email"
              accessibilityLabel="Search customers"
            />
            <Text className="mt-2 text-xs text-neutral-500">
              {filtered.length === rows.length
                ? `${rows.length} contact${rows.length === 1 ? "" : "s"}`
                : `${filtered.length} of ${rows.length} shown`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-4 py-12">
            <Ionicons name="people-outline" size={48} color="#525252" />
            <Text className="mt-4 text-center text-base font-medium text-neutral-300">
              {query.trim() ? "No matches" : "No customers yet"}
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-neutral-500">
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
              className="mb-2 rounded-2xl border border-neutral-800 bg-neutral-900/90 px-4 py-4 active:opacity-90"
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-neutral-100">{item.name}</Text>
                  {item.phone ? (
                    <Text className="mt-1 text-sm text-neutral-400">{item.phone}</Text>
                  ) : null}
                  <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    <Text className="text-xs text-neutral-500">{customerTypeLabel(item.type)}</Text>
                    {!item.is_active ? (
                      <Text className="text-xs font-medium uppercase text-amber-500">Inactive</Text>
                    ) : null}
                  </View>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="items-end">
                    <Text
                      className={`text-base font-semibold tabular-nums ${
                        outstanding ? "text-amber-400" : "text-neutral-500"
                      }`}
                    >
                      {formatPkr(item.outstanding_balance)}
                    </Text>
                    <Text className="mt-0.5 text-[10px] uppercase text-neutral-600">Due</Text>
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
          <View className="max-h-[92%] rounded-t-2xl bg-neutral-950 px-4 pb-8 pt-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-neutral-100">New customer</Text>
              <Pressable onPress={() => setAddOpen(false)} hitSlop={12} accessibilityLabel="Close">
                <Ionicons name="close" size={26} color="#a3a3a3" />
              </Pressable>
            </View>
            <Text className="text-sm text-neutral-500">
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
              <Text className="mb-2 text-sm font-medium text-neutral-300">Type</Text>
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
                        active ? "border-emerald-500 bg-emerald-500/15" : "border-neutral-700 bg-neutral-900"
                      }`}
                    >
                      <Text className={`text-sm ${active ? "text-emerald-400" : "text-neutral-300"}`}>
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
              {saveError ? (
                <Text className="mb-2 text-sm text-red-400" accessibilityRole="alert">
                  {saveError}
                </Text>
              ) : null}
              <PrimaryButton label="Save customer" onPress={() => void onSaveCustomer()} loading={saving} />
              <Pressable onPress={() => setAddOpen(false)} className="mt-3 py-3">
                <Text className="text-center text-base text-neutral-400">Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={detail !== null} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[90%] rounded-t-2xl bg-neutral-950 px-4 pb-10 pt-4">
            {detail ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 text-lg font-semibold text-neutral-100">{detail.name}</Text>
                  <Pressable onPress={() => setDetail(null)} hitSlop={12} accessibilityLabel="Close">
                    <Ionicons name="close" size={26} color="#a3a3a3" />
                  </Pressable>
                </View>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <View
                    className={`rounded-full px-2.5 py-0.5 ${
                      detail.is_active ? "bg-emerald-950" : "bg-neutral-800"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        detail.is_active ? "text-emerald-400" : "text-neutral-400"
                      }`}
                    >
                      {detail.is_active ? "Active" : "Inactive"}
                    </Text>
                  </View>
                  <View className="rounded-full bg-neutral-800 px-2.5 py-0.5">
                    <Text className="text-xs font-semibold text-neutral-300">
                      {customerTypeLabel(detail.type)}
                    </Text>
                  </View>
                </View>

                <Text className="mt-5 text-3xl font-semibold tabular-nums text-amber-400/95">
                  {formatPkr(detail.outstanding_balance)}
                </Text>
                <Text className="mt-1 text-sm text-neutral-500">Outstanding balance</Text>
                <Text className="mt-0.5 text-sm text-neutral-500">
                  Credit limit {formatPkr(detail.credit_limit)}
                </Text>

                <View className="mt-6 gap-0">
                  <DetailRow label="Phone" value={detail.phone ?? "—"} />
                  <DetailRow label="Email" value={detail.email ?? "—"} />
                  <DetailRow label="Address" value={detail.address?.trim() ? detail.address : "—"} />
                  <DetailRow label="Notes" value={detail.notes?.trim() ? detail.notes : "—"} />
                </View>

                <Pressable onPress={() => setDetail(null)} className="mt-6 rounded-xl bg-neutral-800 py-3">
                  <Text className="text-center text-base font-medium text-neutral-100">Close</Text>
                </Pressable>
              </ScrollView>
            ) : null}
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
      <Text className="max-w-[65%] flex-shrink text-right text-sm leading-5 text-neutral-200">
        {value}
      </Text>
    </View>
  );
}
