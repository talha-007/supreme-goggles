"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type RealtimeMode = "kitchen" | "counter" | "waiter";

type Notice = {
  id: string;
  text: string;
};

export function RestaurantRealtimeAlerts({
  businessId,
  mode,
}: {
  businessId: string;
  mode: RealtimeMode;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const channelName = useMemo(
    () => `restaurant-realtime-${mode}-${businessId}`,
    [mode, businessId],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoices",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const nextStatus = String((payload.new as { restaurant_order_status?: string } | null)?.restaurant_order_status ?? "");
          const prevStatus = String((payload.old as { restaurant_order_status?: string } | null)?.restaurant_order_status ?? "");

          let message: string | null = null;
          if (mode === "kitchen") {
            if (nextStatus === "new") message = "New order received.";
          } else if (mode === "counter") {
            if (nextStatus === "served" && prevStatus !== "served") message = "Served order ready for billing.";
          } else if (mode === "waiter") {
            if (nextStatus === "ready" && prevStatus !== "ready") message = "Order is ready to serve.";
          }

          if (message) {
            setNotice({ id: crypto.randomUUID(), text: message });
          }

          if (refreshTimer.current != null) {
            window.clearTimeout(refreshTimer.current);
          }
          refreshTimer.current = window.setTimeout(() => {
            router.refresh();
          }, 250);
        },
      )
      .subscribe();

    return () => {
      if (refreshTimer.current != null) {
        window.clearTimeout(refreshTimer.current);
      }
      supabase.removeChannel(channel);
    };
  }, [businessId, channelName, mode, router]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!notice) return null;

  return (
    <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
      {notice.text}
    </div>
  );
}
