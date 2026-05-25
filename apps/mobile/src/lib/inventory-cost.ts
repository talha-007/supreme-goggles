import type { SupabaseClient } from "@supabase/supabase-js";

type RpcResult = {
  data: unknown;
  error: { message: string } | null;
};

/** Uses RPC when it succeeds; otherwise sums active products in pages (no RPC dependency). */
export async function resolveInventoryCost(
  supabase: SupabaseClient,
  businessId: string,
  rpcResult: RpcResult,
): Promise<number> {
  if (!rpcResult.error && rpcResult.data != null) {
    return Math.round(Number(rpcResult.data) * 100) / 100;
  }

  let total = 0;
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data: rows, error: qErr } = await supabase
      .from("products")
      .select("current_stock, purchase_price")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .range(from, from + pageSize - 1);

    if (qErr) break;
    if (!rows?.length) break;

    for (const r of rows) {
      total += Number(r.current_stock ?? 0) * Number(r.purchase_price ?? 0);
    }
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return Math.round(total * 100) / 100;
}
