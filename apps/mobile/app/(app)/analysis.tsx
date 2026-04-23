import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation } from "expo-router";

import { useAuth } from "../../src/contexts/auth-context";
import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import {
  getInsightsRangeStart,
  INSIGHTS_PERIOD_OPTIONS,
  type InsightsPeriod,
} from "../../src/lib/date-range-presets";
import { RevenueMixPie, REVENUE_MIX_SLICE_COLORS } from "../../src/components/RevenueMixPie";
import { formatPkr } from "../../src/lib/format-money";
import { fetchSalesSnapshot, type SalesSnapshot } from "../../src/lib/sales-analytics-client";
import { supabase } from "../../src/lib/supabase";

export default function AnalysisScreen() {
  const navigation = useNavigation();
  const bottomPad = useTabScreenBottomPadding();
  const { businessId, user } = useAuth();
  const [period, setPeriod] = useState<InsightsPeriod>("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SalesSnapshot | null>(null);

  const locale = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {
      return "en-PK";
    }
  }, []);

  const load = useCallback(async () => {
    if (!businessId || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const now = new Date();
    const start = getInsightsRangeStart(now, period);
    try {
      const data = await fetchSalesSnapshot(supabase, businessId, start, now, locale);
      setSnapshot(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load insights.");
      setSnapshot(null);
    }
    setLoading(false);
  }, [businessId, user, period, locale]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Insights" });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dailyMax = useMemo(() => {
    if (!snapshot?.daily.length) return 1;
    return Math.max(1, ...snapshot.daily.map((d) => d.revenue));
  }, [snapshot]);

  const productLineTotal = snapshot?.productLineRevenueTotal ?? 0;

  const pieSlices = useMemo(() => {
    if (!snapshot || productLineTotal <= 0) return [];
    const list = snapshot.topProducts;
    if (list.length === 0) return [];
    return list.map((p, i) => ({
      key: p.isOther ? `other-${i}` : `p-${i}-${p.name}`,
      revenue: p.revenue,
      color: REVENUE_MIX_SLICE_COLORS[i % REVENUE_MIX_SLICE_COLORS.length]!,
    }));
  }, [snapshot, productLineTotal]);

  if (loading && !snapshot) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <ActivityIndicator size="large" color="#34d399" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-neutral-950"
      contentContainerClassName="px-4 pt-3"
      contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
    >
      <Text className="text-sm leading-5 text-neutral-400">
        Sales trends and top products (paid, unpaid, partial invoices). Same idea as the web insights page.
      </Text>

      <Text className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Period</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-2"
        contentContainerStyle={{ flexDirection: "row", alignItems: "center", paddingVertical: 2 }}
      >
        {INSIGHTS_PERIOD_OPTIONS.map((o) => {
          const active = period === o.key;
          return (
            <Pressable
              key={o.key}
              onPress={() => setPeriod(o.key)}
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

      {error ? (
        <Text className="mt-4 text-sm text-red-400" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {snapshot ? (
        <>
          <View className="mt-4 flex-row flex-wrap gap-3">
            <View className="min-w-[46%] flex-1 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
              <Text className="text-[10px] uppercase text-neutral-500">Total sales</Text>
              <Text className="mt-1 text-lg font-semibold text-emerald-400" numberOfLines={1}>
                {formatPkr(snapshot.totalRevenue)}
              </Text>
            </View>
            <View className="min-w-[46%] flex-1 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
              <Text className="text-[10px] uppercase text-neutral-500">Orders</Text>
              <Text className="mt-1 text-lg font-semibold text-neutral-100">{snapshot.orderCount}</Text>
            </View>
            <View className="min-w-[46%] flex-1 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
              <Text className="text-[10px] uppercase text-neutral-500">Avg. order</Text>
              <Text className="mt-1 text-lg font-semibold text-neutral-100" numberOfLines={1}>
                {formatPkr(snapshot.averageOrder)}
              </Text>
            </View>
          </View>

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase text-neutral-500">Sales by day</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            className="max-h-40 border-b border-neutral-800 pb-1"
            contentContainerStyle={{ flexDirection: "row", alignItems: "flex-end", gap: 4, paddingHorizontal: 2 }}
          >
            {snapshot.daily.length > 0 ? (
              snapshot.daily.map((d) => {
                const h = Math.max(4, (d.revenue / dailyMax) * 120);
                return (
                  <View key={d.dateKey} className="w-9 items-center">
                    <View className="w-6 rounded-t bg-emerald-600/90" style={{ height: h }} />
                    <Text
                      className="mt-1.5 w-9 text-center text-[7px] leading-3 text-neutral-600"
                      numberOfLines={2}
                    >
                      {d.label}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text className="text-sm text-neutral-500">No days in range.</Text>
            )}
          </ScrollView>

          <Text className="mb-1 mt-6 text-xs font-semibold uppercase text-neutral-500">Revenue mix (line items)</Text>
          <Text className="mb-2 text-[11px] leading-4 text-neutral-600">
            Same as web: up to 8 top products; the rest are combined as &quot;All other products&quot;. Slices = share of
            all line revenue in this period.
          </Text>
          {snapshot.topProducts.length === 0 ? (
            <Text className="text-sm text-neutral-500">No line items in this period.</Text>
          ) : (
            <View>
              <View className="items-center py-2">
                <RevenueMixPie size={220} totalRevenue={productLineTotal} slices={pieSlices} />
              </View>
              <View className="mb-3 flex-row flex-wrap justify-center gap-x-3 gap-y-2">
                {snapshot.topProducts.map((p, i) => {
                  const displayName = p.isOther ? "All other products" : p.name;
                  const sharePct =
                    productLineTotal > 0 ? Math.round((p.revenue / productLineTotal) * 1000) / 10 : 0;
                  const c = REVENUE_MIX_SLICE_COLORS[i % REVENUE_MIX_SLICE_COLORS.length]!;
                  return (
                    <View key={p.isOther ? `other-${i}` : `${p.name}-${i}`} className="max-w-[100%] flex-row items-center gap-1.5">
                      <View
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: c }}
                        accessibilityElementsHidden
                      />
                      <Text className="max-w-[200px] text-xs text-neutral-300" numberOfLines={1}>
                        {displayName} · {sharePct}%
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View className="gap-3 border-t border-neutral-800 pt-3">
                {snapshot.topProducts.map((p, i) => {
                  const displayName = p.isOther ? "All other products" : p.name;
                  const sharePct =
                    productLineTotal > 0 ? Math.round((p.revenue / productLineTotal) * 1000) / 10 : 0;
                  return (
                    <View key={`detail-${p.isOther ? "o" : "p"}-${i}`} className="gap-0.5">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className="min-w-0 flex-1 text-sm text-neutral-200" numberOfLines={2}>
                          {displayName}
                        </Text>
                        <Text className="shrink-0 text-sm font-medium text-emerald-400">
                          {formatPkr(p.revenue)} ({sharePct}%)
                        </Text>
                      </View>
                      <Text className="text-[10px] text-neutral-600">Qty {p.quantity.toLocaleString()}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}
