import { intlLocaleTag, isRtlLocale } from "@/lib/i18n/intl-locale";
import type { InvoicePrintPayload } from "@/lib/invoices/load-invoice-print-payload";
import { RECEIPT_WIDTH_MM } from "@/lib/invoices/invoice-receipt-dimensions";

function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(n: number, currency: string, intlTag: string) {
  const sym = currency === "PKR" ? "Rs." : `${currency}`;
  return `${sym} ${n.toLocaleString(intlTag, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null, intlTag: string, dash: string) {
  if (!iso) return dash;
  try {
    return new Date(iso).toLocaleDateString(intlTag, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Standalone HTML receipt for `window.print()`.
 * `@page` uses thermal width so the browser print dialog matches 80mm roll
 * instead of defaulting PDF output to A4.
 */
export function buildInvoiceReceiptPrintHtml(p: InvoicePrintPayload): string {
  const { invoice, business, customer, items, labels, locale, copyLabel } = p;
  const intlTag = intlLocaleTag(locale);
  const dash = "—";
  const rtl = isRtlLocale(locale);
  const statusLabel =
    invoice.status === "paid"
      ? labels.statusPaid
      : invoice.status === "draft"
        ? labels.statusDraft
        : invoice.status === "cancelled"
          ? labels.statusCancelled
          : labels.statusDue;

  const taxWord = (business.tax_label?.trim() || labels.tax) + ` (${Number(invoice.tax_rate).toFixed(2)}%)`;
  const balance = Number(invoice.total_amount) - Number(invoice.paid_amount);

  const itemsHtml = items
    .map((it) => {
      const disc =
        Number(it.discount_pct) > 0 ? ` (−${esc(String(it.discount_pct))}%)` : "";
      return `
        <div class="item">
          <div class="item-name">${esc(it.product_name)}</div>
          <div class="item-row">
            <span>${esc(String(it.quantity))} ${esc(it.unit)} × ${esc(formatMoney(Number(it.unit_price), business.currency, intlTag))}${disc}</span>
            <span class="bold">${esc(formatMoney(Number(it.line_total), business.currency, intlTag))}</span>
          </div>
        </div>`;
    })
    .join("");

  const logoBlock = business.logo_url
    ? `<div class="logo-wrap"><img class="logo" src="${esc(business.logo_url)}" alt="" /></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${esc(locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(labels.taxInvoiceTitle)} ${esc(invoice.invoice_number)}</title>
  <style>
    @page { size: ${RECEIPT_WIDTH_MM}mm auto; margin: 2mm; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111; }
    @media screen {
      body { background: #e4e4e7; padding: 12px 0; }
      .sheet { box-shadow: 0 1px 3px rgb(0 0 0 / 0.12); }
    }
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 10px;
      line-height: 1.35;
    }
    .sheet {
      box-sizing: border-box;
      width: 100%;
      max-width: ${RECEIPT_WIDTH_MM - 6}mm;
      margin: 0 auto;
      padding: 2mm 2.5mm 3mm;
      background: #fff;
    }
    .center { text-align: center; }
    .logo-wrap { text-align: center; margin-bottom: 4px; }
    .logo { width: 36px; height: 36px; object-fit: contain; display: inline-block; }
    .store { font-size: 12px; font-weight: 700; margin: 0 0 2px; }
    .meta { font-size: 8px; color: #333; margin: 0 0 1px; }
    .title { font-size: 10px; font-weight: 700; margin: 8px 0 2px; }
    .copy { font-size: 10px; font-weight: 700; margin: 0 0 4px; }
    .dash { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
    .thin { border: 0; border-top: 0.5px solid #999; margin: 4px 0; }
    .row2 { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .lbl { font-size: 7px; color: #444; text-transform: uppercase; margin: 0; }
    .inv { font-size: 9px; font-weight: 700; margin: 0; }
    .section { font-size: 7px; color: #444; text-transform: uppercase; margin: 0 0 2px; }
    .body { font-size: 10px; margin: 0; }
    .bold { font-weight: 700; }
    .item { margin-bottom: 6px; page-break-inside: avoid; }
    .item-name { font-size: 10px; font-weight: 700; margin: 0 0 2px; }
    .item-row { display: flex; justify-content: space-between; gap: 6px; font-size: 9px; }
    .tot { margin-top: 6px; }
    .tot-row { display: flex; justify-content: space-between; margin: 0 0 3px; font-size: 10px; }
    .grand {
      display: flex; justify-content: space-between;
      margin-top: 6px; padding-top: 6px; border-top: 1px solid #000;
      font-size: 11px; font-weight: 700;
    }
    .notes {
      margin-top: 8px; padding: 6px; border: 0.5px solid #ccc; font-size: 9px;
      white-space: pre-wrap; word-break: break-word;
    }
    .foot { margin-top: 10px; text-align: center; font-size: 8px; color: #666; }
  </style>
</head>
<body dir="${rtl ? "rtl" : "ltr"}">
  <div class="sheet">
    ${logoBlock}
    <p class="store center">${esc(business.name)}</p>
    ${business.address ? `<p class="meta center">${esc(business.address)}</p>` : ""}
    ${business.phone ? `<p class="meta center">${esc(labels.ph)} ${esc(business.phone)}</p>` : ""}

    <p class="title center">${esc(labels.taxInvoiceTitle)}</p>
    ${copyLabel ? `<p class="copy center">${esc(copyLabel)}</p>` : ""}

    <hr class="dash" />

    <div class="row2">
      <div>
        <p class="lbl">${esc(labels.invoiceHash)}</p>
        <p class="inv">${esc(invoice.invoice_number)}</p>
      </div>
      <div style="text-align: ${rtl ? "left" : "right"}">
        <p class="lbl">${esc(labels.status)}</p>
        <p class="inv">${esc(statusLabel)}</p>
      </div>
    </div>
    <p class="body">
      ${esc(labels.datePrefix)} ${esc(formatDate(invoice.created_at, intlTag, dash))}
      ${
        invoice.due_date
          ? ` &nbsp;|&nbsp; ${esc(labels.duePrefix)} ${esc(formatDate(invoice.due_date, intlTag, dash))}`
          : ""
      }
    </p>

    <hr class="thin" />

    <p class="section">${esc(labels.billTo)}</p>
    ${
      customer
        ? `<p class="body bold">${esc(customer.name)}</p>
           ${customer.phone ? `<p class="body">${esc(customer.phone)}</p>` : ""}
           ${customer.address ? `<p class="body" style="margin-top:2px;white-space:pre-wrap">${esc(customer.address)}</p>` : ""}`
        : `<p class="body">${esc(labels.walkIn)}</p>`
    }

    <hr class="dash" />

    <p class="section" style="margin-bottom:4px">${esc(labels.items)}</p>
    ${itemsHtml}

    <hr class="dash" />

    <div class="tot">
      <div class="tot-row"><span>${esc(labels.subtotal)}</span><span>${esc(formatMoney(Number(invoice.subtotal), business.currency, intlTag))}</span></div>
      <div class="tot-row"><span>${esc(labels.discount)}</span><span>− ${esc(formatMoney(Number(invoice.discount_amount), business.currency, intlTag))}</span></div>
      <div class="tot-row"><span>${esc(taxWord)}</span><span>${esc(formatMoney(Number(invoice.tax_amount), business.currency, intlTag))}</span></div>
      <div class="grand"><span>${esc(labels.total)}</span><span>${esc(formatMoney(Number(invoice.total_amount), business.currency, intlTag))}</span></div>
      ${
        Number(invoice.paid_amount) > 0
          ? `<div class="tot-row" style="margin-top:4px"><span>${esc(labels.paid)}</span><span>${esc(formatMoney(Number(invoice.paid_amount), business.currency, intlTag))}</span></div>`
          : ""
      }
      ${
        balance > 0.001 && invoice.status !== "draft"
          ? `<div class="tot-row" style="margin-top:4px"><span class="bold">${esc(labels.balanceDue)}</span><span class="bold">${esc(formatMoney(balance, business.currency, intlTag))}</span></div>`
          : ""
      }
    </div>

    ${
      invoice.notes?.trim()
        ? `<div class="notes"><span class="lbl" style="display:block;margin-bottom:2px">${esc(labels.notes)}</span>${esc(invoice.notes)}</div>`
        : ""
    }

    <p class="foot">${esc(labels.footer)}</p>
  </div>
</body>
</html>`;
}
