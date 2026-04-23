import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router, useNavigation } from "expo-router";

import { useAuth } from "../../src/contexts/auth-context";
import { useRealtimeNotifications } from "../../src/contexts/realtime-notifications-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import {
  getRangeStartForPreset,
  STATS_PERIOD_OPTIONS,
  type StatsDatePreset,
} from "../../src/lib/date-range-presets";
import { supabase } from "../../src/lib/supabase";

const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const MORE_LINKS = [
  { href: "/purchase-orders", label: "Purchase orders" },
  { href: "/suppliers", label: "Suppliers" },
] as const;

export default function DashboardScreen() {
  const navigation = useNavigation();
  const bottomPad = useTabScreenBottomPadding();
  const { businessId, user } = useAuth();
  const { refreshGeneration } = useRealtimeNotifications();
  const [statsPeriod, setStatsPeriod] = useState<StatsDatePreset>("month");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    products: number;
    customers: number;
    drafts: number;
    periodSales: number;
    outstanding: number;
  } | null>(null);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const load = useCallback(async () => {
    if (!businessId || !user) {
      setLoading(false);
      return;
    }
    if (statsRef.current === null) setLoading(true);
    const now = new Date();
    const rangeStart = getRangeStartForPreset(now, statsPeriod)!;

    const [
      productsRes,
      customersRes,
      draftsRes,
      receivableRes,
      periodRes,
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("is_active", true),
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("is_active", true),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "draft"),
      supabase
        .from("invoices")
        .select("total_amount, paid_amount, status")
        .eq("business_id", businessId)
        .in("status", ["unpaid", "partial"]),
      supabase
        .from("invoices")
        .select("total_amount, status, created_at")
        .eq("business_id", businessId)
        .gte("created_at", rangeStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(3000),
    ]);

    const sumMoney = (
      rows: { total_amount: unknown; status?: string }[],
      pred: (r: { total_amount: unknown; status?: string }) => boolean,
    ) => {
      let s = 0;
      for (const r of rows) {
        if (pred(r)) s += Number(r.total_amount);
      }
      return Math.round(s * 100) / 100;
    };

    const outstandingPk = (
      rows: { total_amount: unknown; paid_amount: unknown; status?: string }[],
    ) => {
      let s = 0;
      for (const r of rows) {
        if (r.status === "unpaid" || r.status === "partial") {
          s += Number(r.total_amount) - Number(r.paid_amount);
        }
      }
      return Math.round(s * 100) / 100;
    };

    const periodRows = (periodRes.data ?? []) as { total_amount: unknown; status?: string }[];
    const receivableRows = (receivableRes.data ?? []) as {
      total_amount: unknown;
      paid_amount: unknown;
      status?: string;
    }[];

    setStats({
      products: productsRes.count ?? 0,
      customers: customersRes.count ?? 0,
      drafts: draftsRes.count ?? 0,
      periodSales: sumMoney(
        periodRows,
        (inv) => inv.status !== "draft" && inv.status !== "cancelled",
      ),
      outstanding: outstandingPk(receivableRows),
    });
    setLoading(false);
  }, [businessId, user, statsPeriod]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Home",
      headerBackVisible: false,
      gestureEnabled: false,
    });
  }, [navigation]);

  useLayoutEffect(() => {
    setStats(null);
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (refreshGeneration === 0) return;
    void load();
  }, [refreshGeneration, load]);

  if (loading || !stats) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <ActivityIndicator size="large" color="#34d399" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-neutral-950"
      contentContainerClassName="px-4 pt-4"
      contentContainerStyle={{ paddingBottom: bottomPad }}
    >
      <Text className="text-base text-neutral-200">
        Sales, stock, and purchasing at a glance.
      </Text>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Sales period
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-2"
        contentContainerStyle={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 2,
        }}
      >
        {STATS_PERIOD_OPTIONS.map((o) => {
          const active = statsPeriod === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => setStatsPeriod(o.key)}
              className={`mr-2 rounded-full border px-3.5 py-2 ${
                active ? "border-emerald-500 bg-emerald-500/15" : "border-neutral-700 bg-neutral-900"
              }`}
            >
              <Text className={`text-sm font-medium ${active ? "text-emerald-400" : "text-neutral-400"}`}>
                {o.short}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/analysis")}
        className="mt-4 rounded-xl border border-sky-600/40 bg-sky-950/25 px-4 py-3.5 active:opacity-90"
        accessibilityRole="button"
        accessibilityLabel="Open business insights"
      >
        <Text className="text-center text-base font-semibold text-sky-300">Business insights</Text>
        <Text className="mt-1 text-center text-xs text-neutral-500">
          Sales by day and top products — same metrics as the web dashboard charts.
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/quick-sale")}
        className="mt-6 rounded-2xl border border-emerald-600/40 bg-emerald-950/35 px-4 py-4 active:opacity-90"
        accessibilityRole="button"
        accessibilityLabel="Open quick sale"
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-emerald-300">Quick sale</Text>
            <Text className="mt-1 text-sm leading-5 text-neutral-400">
              Search products, tap to add, complete cash sale — receipt ready to share or print.
            </Text>
          </View>
          <Text className="text-2xl text-emerald-400">→</Text>
        </View>
      </Pressable>

      <View className="mt-6 flex-row flex-wrap gap-3">
        <StatCard
          label={`Sales (${STATS_PERIOD_OPTIONS.find((x) => x.key === statsPeriod)?.label ?? "Period"})`}
          value={pkr.format(stats.periodSales)}
        />
        <StatCard label="Outstanding (open bills)" value={pkr.format(stats.outstanding)} />
        <StatCard label="Draft invoices" value={String(stats.drafts)} />
        <StatCard label="Products" value={String(stats.products)} />
        <StatCard label="Customers" value={String(stats.customers)} />
      </View>

      <Text className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Purchasing
      </Text>
      <View className="mt-3 gap-2">
        {MORE_LINKS.map((item) => (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href)}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 active:opacity-90"
          >
            <Text className="text-base font-medium text-neutral-100">{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[46%] flex-1 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
      <Text className="text-xs text-neutral-500">{label}</Text>
      <Text className="mt-1 text-lg font-semibold text-neutral-100">{value}</Text>
    </View>
  );
}
