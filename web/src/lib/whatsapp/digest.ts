import type { SupabaseClient } from "@supabase/supabase-js";

/** Yesterday 00:00:00.000 – 23:59:59.999 UTC */
function yesterdayUtcRange(): { start: string; end: string } {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  end.setUTCHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function buildDailyDigestText(
  supabase: SupabaseClient,
  businessId: string,
  includeLowStock: boolean,
): Promise<{ title: string; body: string } | null> {
  const { start, end } = yesterdayUtcRange();

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("total_amount, status")
    .eq("business_id", businessId)
    .gte("created_at", start)
    .lte("created_at", end);

  if (invErr) {
    return {
      title: "Daily digest (error)",
      body: `Could not load invoices: ${invErr.message}`,
    };
  }

  const rows = inv ?? [];
  let sales = 0;
  let count = 0;
  for (const r of rows) {
    const st = r.status as string;
    if (st === "draft" || st === "cancelled") continue;
    sales += Number(r.total_amount);
    count += 1;
  }
  sales = Math.round(sales * 100) / 100;

  let body = `Date (UTC): ${start.slice(0, 10)}\n`;
  body += `Invoices (excl. draft/cancelled): ${count}\n`;
  body += `Sales total: ${sales.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} PKR`;

  if (includeLowStock) {
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("name, current_stock, reorder_level")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .gt("reorder_level", 0);

    if (!pErr && products) {
      const low = products.filter(
        (p) => Number(p.current_stock) <= Number(p.reorder_level),
      );
      body += `\n\nLow stock (${low.length}):\n`;
      const lines = low.slice(0, 15).map(
        (p) =>
          `• ${p.name}: ${Number(p.current_stock).toLocaleString("en-PK")} (reorder ≤ ${Number(p.reorder_level).toLocaleString("en-PK")})`,
      );
      body += lines.length ? lines.join("\n") : "None.";
      if (low.length > 15) body += `\n…+${low.length - 15} more`;
    }
  }

  return {
    title: `Daily · ${start.slice(0, 10)}`,
    body,
  };
}

export async function buildLowStockOnlyText(
  supabase: SupabaseClient,
  businessId: string,
): Promise<{ title: string; body: string }> {
  const { data: products, error } = await supabase
    .from("products")
    .select("name, current_stock, reorder_level")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .gt("reorder_level", 0);

  if (error) {
    return { title: "Low stock (error)", body: error.message };
  }

  const low = (products ?? []).filter(
    (p) => Number(p.current_stock) <= Number(p.reorder_level),
  );
  const lines = low.slice(0, 20).map(
    (p) =>
      `• ${p.name}: ${Number(p.current_stock).toLocaleString("en-PK")} (reorder ≤ ${Number(p.reorder_level).toLocaleString("en-PK")})`,
  );
  const body =
    lines.length > 0
      ? `${low.length} SKU(s) at or below reorder:\n${lines.join("\n")}${low.length > 20 ? `\n…+${low.length - 20} more` : ""}`
      : "No low-stock items right now.";

  return { title: "Low stock alert", body };
}
