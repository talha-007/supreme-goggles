import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router, useNavigation } from "expo-router";
import { BRAND_ACCENT_HEX } from "../../src/theme/brand";

import { useAuth } from "../../src/contexts/auth-context";
import { useRealtimeNotifications } from "../../src/contexts/realtime-notifications-context";
import { useTheme } from "../../src/contexts/theme-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import {
  getRangeStartForPreset,
  STATS_PERIOD_OPTIONS,
  type StatsDatePreset,
} from "../../src/lib/date-range-presets";
import { supabase } from "../../src/lib/supabase";
import {
  chipActiveBorder,
  chipActiveText,
  chipInactiveBorder,
  chipInactiveText,
  insightsPromoCardClass,
  insightsPromoHintClass,
  insightsPromoTitleClass,
  metricCardClass,
  quickSalePromoCardClass,
  rowLinkCardClass,
  screenCenterRootClass,
  scrollCanvasClass,
  textMutedClass,
  textSectionBodyClass,
  textStrongOnSurfaceClass,
  textSubtleClass,
} from "../../src/theme/semantic";

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
  const { resolved } = useTheme();
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
      <View className={screenCenterRootClass(resolved)}>
        <ActivityIndicator size="large" color={BRAND_ACCENT_HEX} />
      </View>
    );
  }

  return (
    <ScrollView
      className={scrollCanvasClass(resolved)}
      contentContainerClassName="px-4 pt-4"
      contentContainerStyle={{ paddingBottom: bottomPad }}
    >
      <Text className={`text-base ${textSectionBodyClass(resolved)}`}>
        Sales, stock, and purchasing at a glance.
      </Text>

      <Text className={`mt-4 text-xs font-semibold uppercase tracking-wide ${textMutedClass(resolved)}`}>
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
                active ? chipActiveBorder(resolved) : chipInactiveBorder(resolved)
              }`}
            >
              <Text className={`text-sm font-medium ${active ? chipActiveText(resolved) : chipInactiveText(resolved)}`}>
                {o.short}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/analysis")}
        className={insightsPromoCardClass(resolved)}
        accessibilityRole="button"
        accessibilityLabel="Open business insights"
      >
        <Text className={insightsPromoTitleClass(resolved)}>Business insights</Text>
        <Text className={insightsPromoHintClass(resolved)}>
          Sales by day and top products - same metrics as the web dashboard charts.
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/quick-sale")}
        className={quickSalePromoCardClass(resolved)}
        accessibilityRole="button"
        accessibilityLabel="Open quick sale"
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text
              className={
                resolved === "dark" ? "text-base font-semibold text-brand-300" : "text-base font-semibold text-brand-800"
              }
            >
              Quick sale
            </Text>
            <Text className={`mt-1 text-sm leading-5 ${textSubtleClass(resolved)}`}>
              Search products, tap to add, complete cash sale - receipt ready to share or print.
            </Text>
          </View>
          <Text className="text-2xl text-brand-400">→</Text>
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

      <Text className={`mt-8 text-sm font-semibold uppercase tracking-wide ${textMutedClass(resolved)}`}>
        Purchasing
      </Text>
      <View className="mt-3 gap-2">
        {MORE_LINKS.map((item) => (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href)}
            className={rowLinkCardClass(resolved)}
          >
            <Text className={`text-base font-medium ${textStrongOnSurfaceClass(resolved)}`}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  const { resolved } = useTheme();
  return (
    <View className={metricCardClass(resolved)}>
      <Text className={`text-xs ${textMutedClass(resolved)}`}>{label}</Text>
      <Text className={`mt-1 text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>{value}</Text>
    </View>
  );
}
