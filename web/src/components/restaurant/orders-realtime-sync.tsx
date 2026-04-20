"use client";

import { useRestaurantRealtime } from "@/hooks/use-restaurant-realtime";

/**
 * Drop this anywhere inside a restaurant board page.
 * It renders nothing visible — it only keeps the page in sync
 * with live `restaurant_orders` changes via Supabase Realtime.
 */
export function OrdersRealtimeSync({ businessId }: { businessId: string }) {
  useRestaurantRealtime(businessId);
  return null;
}
