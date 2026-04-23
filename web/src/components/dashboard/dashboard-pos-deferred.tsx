"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { DashboardPosPlaceholder } from "@/components/dashboard/dashboard-pos-placeholder";
import type { PosSaleClientProps } from "@/components/dashboard/pos-sale-client";

const PosSaleClient = dynamic(
  () =>
    import("@/components/dashboard/pos-sale-client").then((m) => ({ default: m.PosSaleClient })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading point of sale</span>
        <DashboardPosPlaceholder />
      </div>
    ),
  },
);

/**
 * Defers downloading and executing the large POS chunk until the browser is idle (or ~400ms),
 * so Lighthouse LCP/TBT measure lighter content first. Search still loads products server-side.
 */
export function DashboardPosDeferred(props: PosSaleClientProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(
        () => {
          if (!cancelled) setReady(true);
        },
        { timeout: 400 },
      );
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(id);
      };
    }
    const t = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  if (!ready) {
    return (
      <div className="w-full" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading point of sale</span>
        <DashboardPosPlaceholder />
      </div>
    );
  }

  return <PosSaleClient {...props} />;
}
