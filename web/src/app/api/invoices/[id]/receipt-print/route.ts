import { buildInvoiceReceiptPrintHtml } from "@/lib/invoices/invoice-receipt-print-html";
import { loadInvoicePrintPayload } from "@/lib/invoices/load-invoice-print-payload";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const reqUrl = new URL(request.url);
  const copyParam = reqUrl.searchParams.get("copy");

  const result = await loadInvoicePrintPayload(id, copyParam);
  if (!result.ok) {
    const text =
      result.status === 401 ? "Unauthorized" : result.status === 403 ? "Forbidden" : "Not found";
    return new NextResponse(text, { status: result.status });
  }

  const html = buildInvoiceReceiptPrintHtml(result.data);
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
