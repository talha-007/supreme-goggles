"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

export type AlertMode = "kitchen" | "waiter";

// ---------------------------------------------------------------------------
// Web Audio helpers — no external files needed
// ---------------------------------------------------------------------------

function beep(ctx: AudioContext, freq: number, duration: number, start: number, vol = 0.25) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.01);
  gain.gain.linearRampToValueAtTime(0, start + duration - 0.01);
  osc.start(start);
  osc.stop(start + duration);
}

/** Two quick high beeps — "new order in!" for chefs */
function playKitchenAlert(ctx: AudioContext) {
  const t = ctx.currentTime;
  beep(ctx, 880, 0.14, t);
  beep(ctx, 880, 0.14, t + 0.22);
}

/** Three ascending tones — "order ready!" for waiters */
function playWaiterAlert(ctx: AudioContext) {
  const t = ctx.currentTime;
  beep(ctx, 523, 0.10, t);
  beep(ctx, 659, 0.10, t + 0.14);
  beep(ctx, 784, 0.18, t + 0.28);
}

// ---------------------------------------------------------------------------

export function useOrderAlerts(businessId: string, mode: AlertMode) {
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(`order-alerts.${mode}`) !== "0";
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundOnRef  = useRef(soundOn);
  soundOnRef.current = soundOn;

  function getCtx(): AudioContext | null {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new AudioContext();
      } catch {
        return null;
      }
    }
    return audioCtxRef.current;
  }

  function fire() {
    const ctx = getCtx();
    if (!ctx) return;
    const play = () => {
      if (mode === "kitchen") playKitchenAlert(ctx);
      else playWaiterAlert(ctx);
    };
    if (ctx.state === "suspended") {
      ctx.resume().then(play).catch(() => {});
    } else {
      play();
    }
  }

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      localStorage.setItem(`order-alerts.${mode}`, next ? "1" : "0");
      if (next) {
        // Initialise AudioContext on explicit user interaction so browsers allow it.
        const ctx = getCtx();
        if (ctx?.state === "suspended") ctx.resume().catch(() => {});
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /** Play a test beep so the user can hear what the alert sounds like. */
  const testSound = useCallback(() => {
    fire();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const channel = supabase
      .channel(`alerts:${businessId}:${mode}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "restaurant_orders" },
        (payload) => {
          if (!active || !soundOnRef.current) return;
          const status = (payload.new as { status?: string }).status;
          if (mode === "kitchen" && status === "new") fire();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "restaurant_orders" },
        (payload) => {
          if (!active || !soundOnRef.current) return;
          const newStatus = (payload.new as { status?: string }).status;
          const oldStatus = (payload.old as { status?: string }).status;
          // Only alert when status changes *to* ready (not on other updates)
          if (mode === "waiter" && newStatus === "ready" && oldStatus !== "ready") fire();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, mode]);

  return { soundOn, toggleSound, testSound };
}
