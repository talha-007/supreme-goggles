"use client";

import type { SalesSnapshot } from "@/lib/analytics/sales-snapshot";
import { useMemo } from "react";
import {
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PIE_COLORS = [
  "#0d9488",
  "#10b981",
  "#14b8a6",
  "#2dd4bf",
  "#047857",
  "#0f766e",
  "#115e59",
  "#134e4a",
  "#64748b",
];

type Props = {
  snapshot: SalesSnapshot;
  /** BCP 47 tag (same as server `intlLocaleTag`) â€” used to build currency formatters on the client. */
  intlLocale: string;
  labels: {
    dailyTitle: string;
    dailySubtitle: string;
    topProductsTitle: string;
    topProductsSubtitle: string;
    revenue: string;
    qty: string;
    otherSlice: string;
  };
};

export function SalesAnalyticsCharts({ snapshot, intlLocale, labels }: Props) {
  const formatMoney = useMemo(() => {
    const pkr = new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return (n: number) => pkr.format(n);
  }, [intlLocale]);

  const lineData = snapshot.daily.map((d) => ({
    ...d,
    name: d.label,
  }));

  const productTotal = snapshot.productLineRevenueTotal;
  const pieData = useMemo(
    () =>
      snapshot.topProducts.map((p, i) => {
        const displayName = p.isOther
          ? labels.otherSlice
          : p.name.length > 32
            ? `${p.name.slice(0, 30)}â€¦`
            : p.name;
        return {
          key: p.isOther ? "__other__" : `p-${i}-${p.name}`,
          name: displayName,
          revenue: p.revenue,
          quantity: p.quantity,
          pct: productTotal > 0 ? (p.revenue / productTotal) * 100 : 0,
        };
      }),
    [snapshot.topProducts, labels.otherSlice, productTotal],
  );

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">{labels.dailyTitle}</h2>
        <p className="mt-1 text-xs text-zinc-500">{labels.dailySubtitle}</p>
        <div className="mt-4 h-[280px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-zinc-500" interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-zinc-500"
                tickFormatter={(v) => formatMoney(Number(v))}
                width={72}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--background, #0a0a0a)",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number | string) => [formatMoney(Number(value)), labels.revenue]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 2 }}
                name={labels.revenue}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {pieData.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">{labels.topProductsTitle}</h2>
          <p className="mt-1 text-xs text-zinc-500">{labels.topProductsSubtitle}</p>
          <div className="mt-4 h-[min(420px,70vh)] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <Pie
                  data={pieData}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius={40}
                  outerRadius={112}
                  paddingAngle={1}
                >
                  {pieData.map((d, i) => (
                    <Cell key={`${d.key}-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]!} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const p = payload[0].payload as {
                      name: string;
                      revenue: number;
                      quantity: number;
                      pct: number;
                    };
                    const v = Number(p.revenue);
                    const pct = typeof p.pct === "number" ? p.pct : 0;
                    return (
                      <div
                        className="max-w-sm rounded-md border border-zinc-800 bg-zinc-950/95 px-2.5 py-2 text-xs text-zinc-100 shadow-lg"
                        style={{ fontSize: 12 }}
                      >
                        <p className="font-medium text-zinc-50">{p.name}</p>
                        <p className="mt-0.5 text-zinc-300">
                          {labels.revenue}{" "}
                          <span className="text-brand-400">{formatMoney(v)}</span> (
                          {pct.toFixed(1)}% of line revenue)
                        </p>
                        <p className="text-zinc-500">
                          {labels.qty}{" "}
                          {p.quantity.toLocaleString(intlLocale, { maximumFractionDigits: 3 })}
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 10, lineHeight: 1.3 }}
                  formatter={(value) => (
                    <span className="text-zinc-700">{String(value)}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
