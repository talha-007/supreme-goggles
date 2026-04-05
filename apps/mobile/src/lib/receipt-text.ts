import { formatPkr } from "./format-money";

/** Character width for ~80mm thermal (plain text / 12cpi-style layout). */
export const THERMAL_CHARS = 42;

export type ReceiptLine = {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
};

/** ASCII-only rule line (thermal-safe). */
function lineSep(char = "-"): string {
  return char.repeat(THERMAL_CHARS);
}

/**
 * Truncate to max length using ASCII "..." only (Unicode ellipsis breaks monospace).
 */
function fitAscii(s: string, maxLen: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (maxLen < 1) return "";
  if (t.length <= maxLen) return t;
  if (maxLen <= 3) return t.slice(0, maxLen);
  return `${t.slice(0, maxLen - 3)}...`;
}

/** Normalize Intl currency strings for fixed-width thermal (NBSP -> space). */
function asciiMoney(s: string): string {
  return s.replace(/\u00A0|\u202F/g, " ").replace(/\s+/g, " ").trim();
}

/** Label left, amount right; total line length never exceeds `width`. */
function rowLeftRight(left: string, right: string, width: number): string {
  const rRaw = asciiMoney(right);
  /** Amount-only rows (e.g. line totals): allow full width for long PKR strings. */
  const maxR =
    left.trim().length === 0 ? width - 1 : Math.min(26, Math.floor(width * 0.5));
  const r = fitAscii(rRaw, maxR);
  const maxL = Math.max(0, width - r.length - 1);
  const l = fitAscii(left.replace(/\s+/g, " ").trim(), maxL);
  const spaces = width - l.length - r.length;
  return `${l}${" ".repeat(Math.max(0, spaces))}${r}`;
}

function rowCenter(s: string, width: number): string {
  const t = fitAscii(s, width);
  if (t.length >= width) return t.slice(0, width);
  const pad = width - t.length;
  const left = Math.floor(pad / 2);
  return `${" ".repeat(left)}${t}${" ".repeat(pad - left)}`;
}

function wrapLines(text: string, width: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  if (words.length === 0) return [""];
  const out: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= width) cur = next;
    else {
      if (cur) out.push(cur);
      if (word.length > width) {
        for (let i = 0; i < word.length; i += width) {
          out.push(word.slice(i, i + width));
        }
        cur = "";
      } else {
        cur = word;
      }
    }
  }
  if (cur) out.push(cur);
  return out;
}

function formatReceiptDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${y}-${mo}-${day} ${h12}:${m} ${ampm}`;
}

/**
 * Plain-text receipt for ~80mm thermal printers. All lines are ASCII and <= THERMAL_CHARS.
 */
export function formatReceiptText(params: {
  businessName: string;
  invoiceNumber: string;
  createdAt: string;
  customerName: string | null;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  taxLabel?: string | null;
  invoiceStatus?: string | null;
}): string {
  const {
    businessName,
    invoiceNumber,
    createdAt,
    customerName,
    lines,
    subtotal,
    discount,
    tax,
    total,
    taxLabel,
    invoiceStatus,
  } = params;

  const w = THERMAL_CHARS;
  const out: string[] = [];
  const taxWord = ((taxLabel && taxLabel.trim()) || "Tax").replace(/[^\x20-\x7E]/g, "");
  const dateTime = formatReceiptDate(createdAt);

  out.push(lineSep("="));
  out.push(rowCenter(businessName.toUpperCase().replace(/[^\x20-\x7E]/g, ""), w));
  out.push(lineSep("-"));
  out.push(rowCenter("SALES RECEIPT", w));
  out.push(lineSep("-"));
  out.push(rowLeftRight("Receipt", invoiceNumber, w));
  out.push(rowLeftRight("Date/Time", dateTime, w));
  out.push(rowLeftRight("Customer", customerName?.trim() || "Walk-in", w));
  out.push(lineSep("-"));

  for (const l of lines) {
    for (const nl of wrapLines(l.name, w)) {
      out.push(fitAscii(nl, w));
    }
    /** Detail and amount on separate lines so long "qty @ unit" never fights the price column. */
    const detail = `  ${l.qty} ${l.unit} @ ${formatPkr(l.unitPrice)}`;
    out.push(fitAscii(detail, w));
    out.push(rowLeftRight("", formatPkr(l.lineTotal), w));
  }

  out.push(lineSep("-"));
  out.push(rowLeftRight("Subtotal", formatPkr(subtotal), w));
  if (discount > 0.009) {
    out.push(rowLeftRight("Discount", `-${formatPkr(discount)}`, w));
  }
  if (tax > 0.009) {
    out.push(rowLeftRight(taxWord || "Tax", formatPkr(tax), w));
  }
  out.push(lineSep("="));
  out.push(rowLeftRight("TOTAL", formatPkr(total), w));
  out.push(lineSep("="));

  const st = invoiceStatus ?? "";
  if (st === "cancelled") {
    out.push(rowCenter("VOID - CANCELLED", w));
  } else if (st === "paid" || st === "partial") {
    out.push(rowCenter(st === "paid" ? "PAID" : "PARTIAL PAYMENT", w));
  } else if (st === "draft") {
    out.push(rowCenter("DRAFT - NOT FOR PAYMENT", w));
  }

  out.push(rowCenter("Thank you", w));
  out.push(lineSep("="));

  return out.join("\n");
}
