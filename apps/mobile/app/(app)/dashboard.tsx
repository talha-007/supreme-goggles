import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router, useNavigation } from "expo-router";

import { useAuth } from "../../src/contexts/auth-context";
import { supabase } from "../../src/lib/supabase";

const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const LINKS = [
  { href: "/products", label: "Products" },
  { href: "/customers", label: "Customers" },
  { href: "/invoices", label: "Invoices" },
  { href: "/purchase-orders", label: "Purchase orders" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/settings", label: "Settings" },
] as const;

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { businessId, user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    products: number;
    customers: number;
    drafts: number;
    todaySales: number;
    monthSales: number;
    outstanding: number;
  } | null>(null);

  const load = useCallback(async () => {
    if (!businessId || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      productsRes,
      customersRes,
      draftsRes,
      receivableRes,
      monthRes,
      todayRes,
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
        .gte("created_at", startOfMonth.toISOString()),
      supabase
        .from("invoices")
        .select("total_amount, status, created_at")
        .eq("business_id", businessId)
        .gte("created_at", startOfDay.toISOString()),
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

    const monthRows = (monthRes.data ?? []) as { total_amount: unknown; status?: string }[];
    const todayRows = (todayRes.data ?? []) as { total_amount: unknown; status?: string }[];
    const receivableRows = (receivableRes.data ?? []) as {
      total_amount: unknown;
      paid_amount: unknown;
      status?: string;
    }[];

    setStats({
      products: productsRes.count ?? 0,
      customers: customersRes.count ?? 0,
      drafts: draftsRes.count ?? 0,
      todaySales: sumMoney(
        todayRows,
        (inv) => inv.status !== "draft" && inv.status !== "cancelled",
      ),
      monthSales: sumMoney(
        monthRows,
        (inv) => inv.status !== "draft" && inv.status !== "cancelled",
      ),
      outstanding: outstandingPk(receivableRows),
    });
    setLoading(false);
  }, [businessId, user]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Dashboard",
      headerRight: () => (
        <Pressable onPress={() => signOut()} hitSlop={12} className="px-2 py-1">
          <Text className="text-sm font-medium text-emerald-400">Sign out</Text>
        </Pressable>
      ),
    });
  }, [navigation, signOut]);

  useEffect(() => {
    void load();
  }, [load]);

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
      contentContainerClassName="px-4 pb-10 pt-4"
    >
      <Text className="text-base text-neutral-200">
        Sales, stock, and purchasing in one place — same metrics as the web dashboard.
      </Text>

      <View className="mt-6 flex-row flex-wrap gap-3">
        <StatCard label="Today (sales)" value={pkr.format(stats.todaySales)} />
        <StatCard label="This month" value={pkr.format(stats.monthSales)} />
        <StatCard label="Outstanding" value={pkr.format(stats.outstanding)} />
        <StatCard label="Draft invoices" value={String(stats.drafts)} />
        <StatCard label="Products" value={String(stats.products)} />
        <StatCard label="Customers" value={String(stats.customers)} />
      </View>

      <Text className="mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Navigate
      </Text>
      <View className="mt-3 gap-2">
        {LINKS.map((item) => (
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
