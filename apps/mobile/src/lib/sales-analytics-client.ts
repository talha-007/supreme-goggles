import type { SupabaseClient } from "@supabase/supabase-js";

const SALE_STATUSES = ["paid", "unpaid", "partial"] as const;

/** Must match `PRODUCT_MIX_MAX_NAMED_SLICES` in web `sales-snapshot.ts`. */
const PRODUCT_MIX_MAX_NAMED_SLICES = 8;

export type ProductMixRow = {
  name: string;
  revenue: number;
  quantity: number;
  isOther?: boolean;
};

export type SalesSnapshot = {
  totalRevenue: number;
  orderCount: number;
  averageOrder: number;
  daily: { dateKey: string; label: string; revenue: number }[];
  topProducts: ProductMixRow[];
  productLineRevenueTotal: number;
};

function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Same rules as web `getSalesSnapshot` (invoices + line items for top products).
 */
export async function fetchSalesSnapshot(
  supabase: SupabaseClient,
  businessId: string,
  start: Date,
  end: Date,
  dateLocale: string,
): Promise<SalesSnapshot> {
  const { data: invRows, error: invErr } = await supabase
    .from("invoices")
    .select("id, total_amount, created_at, status")
    .eq("business_id", businessId)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .in("status", [...SALE_STATUSES]);

  if (invErr) {
    throw new Error(invErr.message);
  }
  const invoices = invRows ?? [];

  const dailyMap = new Map<string, number>();
  let totalRevenue = 0;
  for (const inv of invoices) {
    const t = Number(inv.total_amount) || 0;
    totalRevenue += t;
    const c = new Date(String(inv.created_at));
    if (!Number.isNaN(c.getTime())) {
      const key = localYmd(c);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + t);
    }
  }
  totalRevenue = Math.round(totalRevenue * 100) / 100;
  const orderCount = invoices.length;
  const averageOrder = orderCount > 0 ? Math.round((totalRevenue / orderCount) * 100) / 100 : 0;

  const endCap = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const startCap = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const daily: { dateKey: string; label: string; revenue: number }[] = [];
  for (let d = new Date(startCap); d <= endCap; d.setDate(d.getDate() + 1)) {
    const k = localYmd(d);
    daily.push({
      dateKey: k,
      label: d.toLocaleDateString(dateLocale, { month: "short", day: "numeric" }),
      revenue: Math.round((dailyMap.get(k) ?? 0) * 100) / 100,
    });
  }

  const ids = invoices.map((i) => i.id);
  const itemRows: {
    product_id: string | null;
    product_name: string;
    quantity: unknown;
    line_total: unknown;
  }[] = [];

  for (let o = 0; o < ids.length; o += 100) {
    const chunk = ids.slice(o, o + 100);
    if (chunk.length === 0) break;
    const { data, error: itErr } = await supabase
      .from("invoice_items")
      .select("product_id, product_name, quantity, line_total")
      .in("invoice_id", chunk);
    if (itErr) {
      throw new Error(itErr.message);
    }
    for (const r of data ?? []) {
      itemRows.push(
        r as { product_id: string | null; product_name: string; quantity: unknown; line_total: unknown },
      );
    }
  }

  const byKey = new Map<string, { name: string; revenue: number; quantity: number }>();
  for (const it of itemRows) {
    const key = it.product_id != null && String(it.product_id).length > 0 ? `p:${it.product_id}` : `n:${it.product_name}`;
    const name = (it.product_name && String(it.product_name).trim()) || "—";
    const r = Number(it.line_total) || 0;
    const q = Number(it.quantity) || 0;
    const cur = byKey.get(key) ?? { name, revenue: 0, quantity: 0 };
    if (name !== "—") cur.name = name;
    cur.revenue += r;
    cur.quantity += q;
    byKey.set(key, cur);
  }

  const allProducts = [...byKey.values()]
    .map((o) => ({
      name: o.name,
      revenue: Math.round(o.revenue * 100) / 100,
      quantity: Math.round(o.quantity * 1000) / 1000,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const productLineRevenueTotal =
    Math.round(allProducts.reduce((s, r) => s + r.revenue, 0) * 100) / 100;

  const topProducts: ProductMixRow[] = [];
  if (allProducts.length === 0) {
    // empty
  } else if (allProducts.length <= PRODUCT_MIX_MAX_NAMED_SLICES) {
    for (const p of allProducts) topProducts.push({ ...p });
  } else {
    for (let i = 0; i < PRODUCT_MIX_MAX_NAMED_SLICES; i++) {
      topProducts.push({ ...allProducts[i]! });
    }
    const rest = allProducts.slice(PRODUCT_MIX_MAX_NAMED_SLICES);
    const otherRevenue = Math.round(rest.reduce((s, r) => s + r.revenue, 0) * 100) / 100;
    const otherQty = Math.round(rest.reduce((s, r) => s + r.quantity, 0) * 1000) / 1000;
    topProducts.push({
      name: "",
      revenue: otherRevenue,
      quantity: otherQty,
      isOther: true,
    });
  }

  return { totalRevenue, orderCount, averageOrder, daily, topProducts, productLineRevenueTotal };
}
