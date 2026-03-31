import { sanitizeProductSearchQuery } from "@/lib/products/search-query";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

/**
 * GET /api/dashboard/products/search?q=&stock=low&limit=50
 * Server-side search for large catalogs (uses search_products RPC).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.business_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawQ = searchParams.get("q") ?? "";
  const q = sanitizeProductSearchQuery(rawQ);
  const lowStockOnly = searchParams.get("stock") === "low";
  const limitRaw = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT));

  const { data, error } = await supabase.rpc("search_products", {
    p_business_id: member.business_id,
    p_query: q.length > 0 ? q : null,
    p_low_stock_only: lowStockOnly,
    p_limit: limit,
    p_offset: 0,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}
