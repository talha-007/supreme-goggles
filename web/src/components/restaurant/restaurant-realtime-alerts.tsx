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
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioEnabledKey = `restaurant.audio.${mode}.${businessId}`;

  useEffect(() => {
    const saved = window.localStorage.getItem(audioEnabledKey);
    if (saved === "1") setAudioEnabled(true);
  }, [audioEnabledKey]);

  useEffect(() => {
    window.localStorage.setItem(audioEnabledKey, audioEnabled ? "1" : "0");
  }, [audioEnabled, audioEnabledKey]);

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
            if (audioEnabled) {
              try {
                const ctx = new window.AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = "sine";
                osc.frequency.value = 880;
                gain.gain.value = 0.03;
                osc.start();
                window.setTimeout(() => {
                  osc.stop();
                  ctx.close();
                }, 180);
              } catch {
                // no-op
              }
            }
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
  }, [audioEnabled, businessId, channelName, mode, router]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  if (!notice) {
    return (
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setAudioEnabled((v) => !v)}
          className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {audioEnabled ? "Sound on" : "Sound off"}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
      <span>{notice.text}</span>
      <button
        type="button"
        onClick={() => setAudioEnabled((v) => !v)}
        className="rounded-md border border-sky-300 bg-white px-2 py-0.5 text-xs text-sky-900 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
      >
        {audioEnabled ? "Sound on" : "Sound off"}
      </button>
    </div>
  );
}
