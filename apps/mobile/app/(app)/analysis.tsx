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

import { BRAND_ACCENT_HEX } from "../../src/theme/brand";

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
import {
  chipActiveBorder,
  chipActiveText,
  chipInactiveBorder,
  chipInactiveText,
  hairlineBorderBClass,
  hairlineBorderTClass,
  metricCardCompactClass,
  screenCenterRootClass,
  scrollCanvasClass,
  textMutedClass,
  textSectionBodyClass,
  textStrongOnSurfaceClass,
  textSubtleClass,
} from "../../src/theme/semantic";
import { useTheme } from "../../src/contexts/theme-context";

export default function AnalysisScreen() {
  const navigation = useNavigation();
  const bottomPad = useTabScreenBottomPadding();
  const { businessId, user } = useAuth();
  const { resolved } = useTheme();
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
      <View className={screenCenterRootClass(resolved)}>
        <ActivityIndicator size="large" color={BRAND_ACCENT_HEX} />
      </View>
    );
  }

  return (
    <ScrollView
      className={scrollCanvasClass(resolved)}
      contentContainerClassName="px-4 pt-3"
      contentContainerStyle={{ paddingBottom: bottomPad + 16 }}
    >
      <Text className={`text-sm leading-5 ${textSubtleClass(resolved)}`}>
        Sales trends and top products (paid, unpaid, partial invoices). Same idea as the web insights page.
      </Text>

      <Text className={`mt-4 text-xs font-semibold uppercase tracking-wide ${textMutedClass(resolved)}`}>Period</Text>
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

      {error ? (
        <Text className="mt-4 text-sm text-red-400" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {snapshot ? (
        <>
          <View className="mt-4 flex-row flex-wrap gap-3">
            <View className={metricCardCompactClass(resolved)}>
              <Text className={`text-[10px] uppercase ${textMutedClass(resolved)}`}>Total sales</Text>
              <Text className="mt-1 text-lg font-semibold text-brand-400" numberOfLines={1}>
                {formatPkr(snapshot.totalRevenue)}
              </Text>
            </View>
            <View className={metricCardCompactClass(resolved)}>
              <Text className={`text-[10px] uppercase ${textMutedClass(resolved)}`}>Orders</Text>
              <Text className={`mt-1 text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`}>{snapshot.orderCount}</Text>
            </View>
            <View className={metricCardCompactClass(resolved)}>
              <Text className={`text-[10px] uppercase ${textMutedClass(resolved)}`}>Avg. order</Text>
              <Text className={`mt-1 text-lg font-semibold ${textStrongOnSurfaceClass(resolved)}`} numberOfLines={1}>
                {formatPkr(snapshot.averageOrder)}
              </Text>
            </View>
          </View>

          <Text className={`mb-2 mt-6 text-xs font-semibold uppercase ${textMutedClass(resolved)}`}>Sales by day</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            className={`max-h-40 pb-1 ${hairlineBorderBClass(resolved)}`}
            contentContainerStyle={{ flexDirection: "row", alignItems: "flex-end", gap: 4, paddingHorizontal: 2 }}
          >
            {snapshot.daily.length > 0 ? (
              snapshot.daily.map((d) => {
                const h = Math.max(4, (d.revenue / dailyMax) * 120);
                return (
                  <View key={d.dateKey} className="w-9 items-center">
                    <View className="w-6 rounded-t bg-brand-600/90" style={{ height: h }} />
                    <Text
                      className={`mt-1.5 w-9 text-center text-[7px] leading-3 ${textSubtleClass(resolved)}`}
                      numberOfLines={2}
                    >
                      {d.label}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text className={`text-sm ${textMutedClass(resolved)}`}>No days in range.</Text>
            )}
          </ScrollView>

          <Text className={`mb-1 mt-6 text-xs font-semibold uppercase ${textMutedClass(resolved)}`}>
            Revenue mix (line items)
          </Text>
          <Text className={`mb-2 text-[11px] leading-4 ${textSubtleClass(resolved)}`}>
            Same as web: up to 8 top products; the rest are combined as &quot;All other products&quot;. Slices = share of
            all line revenue in this period.
          </Text>
          {snapshot.topProducts.length === 0 ? (
            <Text className={`text-sm ${textMutedClass(resolved)}`}>No line items in this period.</Text>
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
                      <Text className={`max-w-[200px] text-xs ${textSectionBodyClass(resolved)}`} numberOfLines={1}>
                        {displayName} · {sharePct}%
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View className={`gap-3 pt-3 ${hairlineBorderTClass(resolved)}`}>
                {snapshot.topProducts.map((p, i) => {
                  const displayName = p.isOther ? "All other products" : p.name;
                  const sharePct =
                    productLineTotal > 0 ? Math.round((p.revenue / productLineTotal) * 1000) / 10 : 0;
                  return (
                    <View key={`detail-${p.isOther ? "o" : "p"}-${i}`} className="gap-0.5">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text className={`min-w-0 flex-1 text-sm ${textSectionBodyClass(resolved)}`} numberOfLines={2}>
                          {displayName}
                        </Text>
                        <Text className="shrink-0 text-sm font-medium text-brand-400">
                          {formatPkr(p.revenue)} ({sharePct}%)
                        </Text>
                      </View>
                      <Text className={`text-[10px] ${textSubtleClass(resolved)}`}>Qty {p.quantity.toLocaleString()}</Text>
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
