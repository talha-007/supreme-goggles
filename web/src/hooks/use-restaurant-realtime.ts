"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Subscribes to `restaurant_orders` via Supabase Realtime (WebSocket).
 * On any INSERT / UPDATE / DELETE the page is refreshed once (debounced 2 s,
 * only while the tab is visible, at most one refresh in-flight at a time).
 *
 * RLS already restricts the stream to the user's own business — no client-side
 * filter needed. The table has REPLICA IDENTITY FULL so every column is present
 * in change payloads.
 */
export function useRestaurantRealtime(businessId: string) {
  const router = useRouter();
  // Stable ref so the effect never needs router as a dependency.
  const routerRef = useRef(router);
  routerRef.current = router;

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshPending = useRef(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    function scheduleRefresh() {
      if (!active || document.hidden || refreshPending.current) return;
      refreshPending.current = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        refreshPending.current = false;
        routerRef.current.refresh();
      }, 2000);
    }

    const channel = supabase
      .channel(`ro:${businessId}`)
      .on(
        "postgres_changes",
        // No filter here — RLS scopes events to the signed-in user's business.
        { event: "*", schema: "public", table: "restaurant_orders" },
        () => scheduleRefresh(),
      )
      .subscribe();

    return () => {
      active = false;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshPending.current = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);
}
