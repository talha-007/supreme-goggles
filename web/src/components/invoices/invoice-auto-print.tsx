"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * After cash finalization the server redirects with ?print=1. We load the PDF in a hidden
 * iframe and call print(); if that fails, open the PDF in a new tab.
 */
export function InvoiceAutoPrint({ invoiceId }: { invoiceId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const printFlag = searchParams.get("print");

  useEffect(() => {
    if (printFlag !== "1") return;

    const dedupeKey = `invoice-print-${invoiceId}`;
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(dedupeKey)) {
        router.replace(`/dashboard/invoices/${invoiceId}`, { scroll: false });
        return;
      }
      sessionStorage.setItem(dedupeKey, "1");
      window.setTimeout(() => sessionStorage.removeItem(dedupeKey), 4000);
    }

    const pdfUrl = `/api/invoices/${invoiceId}/pdf`;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;inset:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
    iframe.src = pdfUrl;

    const fallbackOpen = () => {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      iframe.remove();
    };

    const fallbackTimer = window.setTimeout(fallbackOpen, 2500);

    iframe.onload = () => {
      window.clearTimeout(fallbackTimer);
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        fallbackOpen();
      }
      window.setTimeout(() => iframe.remove(), 60_000);
    };

    iframe.onerror = () => {
      window.clearTimeout(fallbackTimer);
      fallbackOpen();
    };

    document.body.appendChild(iframe);

    router.replace(`/dashboard/invoices/${invoiceId}`, { scroll: false });
  }, [invoiceId, printFlag, router]);

  return null;
}
