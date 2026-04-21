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

import { ErrorBannerWithSupport } from "../../src/components/ErrorBannerWithSupport";
import { headerRightWithSupport } from "../../src/components/SupportHeaderButton";
import { FormField } from "../../src/components/FormField";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { SearchBar } from "../../src/components/SearchBar";
import { useAuth } from "../../src/contexts/auth-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import { supabase } from "../../src/lib/supabase";
import type { SupplierListRow } from "../../src/types/purchase";

function matchesQuery(row: SupplierListRow, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return (
    row.name.toLowerCase().includes(s) ||
    (row.phone?.toLowerCase().includes(s) ?? false) ||
    (row.email?.toLowerCase().includes(s) ?? false)
  );
}

export default function SuppliersScreen() {
  const navigation = useNavigation();
  const bottomPad = useTabScreenBottomPadding();
  const { businessId, user } = useAuth();
  const [rows, setRows] = useState<SupplierListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [detail, setDetail] = useState<SupplierListRow | null>(null);

  const filtered = useMemo(() => rows.filter((r) => matchesQuery(r, query)), [rows, query]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        headerRightWithSupport(
          <Pressable
            onPress={() => {
              setSaveError(null);
              setAddOpen(true);
            }}
            hitSlop={12}
            className="flex-row items-center rounded-full bg-emerald-500/15 px-3 py-1.5 active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Add supplier"
          >
            <Ionicons name="add" size={22} color="#34d399" />
            <Text className="ml-1 text-sm font-semibold text-emerald-400">Add</Text>
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
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, phone, email, is_active")
      .eq("business_id", businessId)
      .order("name");

    if (error) {
      setError(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as SupplierListRow[]);
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

  const onSaveSupplier = async () => {
    const n = name.trim();
    if (!n || !businessId) {
      setSaveError("Name is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const { error: insErr } = await supabase.from("suppliers").insert({
      business_id: businessId,
      name: n,
      phone: phone.trim() || null,
      email: email.trim() || null,
      is_active: true,
    });
    setSaving(false);
    if (insErr) {
      setSaveError(insErr.message);
      return;
    }
    setAddOpen(false);
    setName("");
    setPhone("");
    setEmail("");
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
      {error ? <ErrorBannerWithSupport message={error} /> : null}

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
              placeholder="Search by name, phone, or email"
              accessibilityLabel="Search suppliers"
            />
            <Text className="mt-2 text-xs text-neutral-500">
              {filtered.length === rows.length
                ? `${rows.length} vendor${rows.length === 1 ? "" : "s"}`
                : `${filtered.length} of ${rows.length} shown`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-4 py-12">
            <Ionicons name="people-outline" size={48} color="#525252" />
            <Text className="mt-4 text-center text-base font-medium text-neutral-300">
              {query.trim() ? "No matches" : "No suppliers yet"}
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-neutral-500">
              {query.trim()
                ? "Try a different search."
                : "Tap Add to register a vendor you buy stock from."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
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
                {!item.is_active ? (
                  <Text className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-500">
                    Inactive
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#525252" />
            </View>
          </Pressable>
        )}
      />

      <Modal visible={addOpen} animationType="slide" transparent onRequestClose={() => setAddOpen(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[90%] rounded-t-2xl bg-neutral-950 px-4 pb-8 pt-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-neutral-100">New supplier</Text>
              <Pressable onPress={() => setAddOpen(false)} hitSlop={12} accessibilityLabel="Close">
                <Ionicons name="close" size={26} color="#a3a3a3" />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" className="mt-2">
              <FormField label="Name" value={name} onChangeText={setName} placeholder="Vendor name" />
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
              {saveError ? <ErrorBannerWithSupport message={saveError} variant="compact" /> : null}
              <PrimaryButton label="Save supplier" onPress={() => void onSaveSupplier()} loading={saving} />
              <Pressable onPress={() => setAddOpen(false)} className="mt-3 py-3">
                <Text className="text-center text-base text-neutral-400">Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={detail !== null} animationType="fade" transparent onRequestClose={() => setDetail(null)}>
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={() => setDetail(null)} accessibilityLabel="Dismiss" />
          {detail ? (
            <View className="rounded-t-2xl bg-neutral-950 px-4 pb-10 pt-4">
              <Text className="text-lg font-semibold text-neutral-100">{detail.name}</Text>
              <View className="mt-4 gap-2">
                <Row label="Phone" value={detail.phone ?? "—"} />
                <Row label="Email" value={detail.email ?? "—"} />
                <Row label="Status" value={detail.is_active ? "Active" : "Inactive"} />
              </View>
              <Pressable onPress={() => setDetail(null)} className="mt-6 rounded-xl bg-neutral-800 py-3">
                <Text className="text-center text-base font-medium text-neutral-100">Close</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4 border-b border-neutral-800 py-2">
      <Text className="text-sm text-neutral-500">{label}</Text>
      <Text className="max-w-[65%] flex-shrink text-right text-sm text-neutral-200">{value}</Text>
    </View>
  );
}
