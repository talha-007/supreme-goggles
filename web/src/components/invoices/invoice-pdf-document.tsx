import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { InvoicePdfLabels } from "@/lib/i18n/pdf-invoice-labels";
import { intlLocaleTag, isRtlLocale } from "@/lib/i18n/intl-locale";
import type { AppLocale } from "@/i18n/routing";
import type {
  BusinessInvoiceRow,
  CustomerInvoiceRow,
  InvoiceItemRow,
  InvoiceRow,
} from "@/types/invoice";

/**
 * PDF page size matches common thermal receipt printers (80mm roll).
 * Change RECEIPT_WIDTH_MM to 58 if your hardware uses 58mm paper.
 * Dimensions use points (PDF); 1 mm = 72/25.4 pt.
 */
export const RECEIPT_WIDTH_MM = 80;
const MM_TO_PT = 72 / 25.4;
/** Width of the printable page = paper width (thermal roll is typically 80mm). */
export const RECEIPT_WIDTH_PT = RECEIPT_WIDTH_MM * MM_TO_PT;
/**
 * For very long receipts, content is split across pages of this height (mm).
 * Kept short so each printed “slice” wastes less roll than A4-sized pages.
 */
export const THERMAL_WRAPPED_PAGE_HEIGHT_MM = 110;
/** If estimated content is below this, use a single page sized to ~content (saves paper). */
const MAX_SINGLE_PAGE_TIGHT_MM = 240;

/**
 * Rough height estimate so the PDF page length matches the receipt (thermal
 * printers often feed paper by PDF page height — tall pages waste blank roll).
 */
function estimateReceiptHeightMm(
  items: InvoiceItemRow[],
  hasLogo: boolean,
  notes: string | null,
  customer: CustomerInvoiceRow | null,
): number {
  let mm = 62;
  if (hasLogo) mm += 12;
  if (customer) {
    mm += 10;
    if (customer.phone) mm += 4;
    if (customer.address) {
      mm += Math.min(18, 5 + Math.ceil(customer.address.length / 38) * 3.5);
    }
  } else {
    mm += 3;
  }
  for (const it of items) {
    const nameLen = it.product_name?.length ?? 0;
    const nameLines = Math.max(1, Math.ceil(nameLen / 26));
    mm += 12 + (nameLines - 1) * 4.5;
  }
  if (notes?.trim()) {
    mm += Math.min(42, 9 + Math.ceil(notes.length / 42) * 3.5);
  }
  mm += 10;
  return Math.max(48, mm);
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 10,
    fontSize: 7,
    fontFamily: "Helvetica",
    color: "#000",
  },
  center: { textAlign: "center" },
  storeName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  storeMeta: { fontSize: 6.5, color: "#333", marginBottom: 1 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderStyle: "dashed",
    marginVertical: 6,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#999",
    marginVertical: 4,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  labelSm: { fontSize: 6, color: "#444", textTransform: "uppercase" },
  invNum: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  sectionTitle: {
    fontSize: 6,
    color: "#444",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  body: { fontSize: 7, lineHeight: 1.35 },
  bold: { fontFamily: "Helvetica-Bold" },
  itemBlock: { marginBottom: 5 },
  itemName: { fontSize: 7, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  itemLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
  },
  itemLeft: { flex: 1, paddingRight: 4 },
  itemRight: { fontFamily: "Helvetica-Bold", fontSize: 7 },
  totalsSection: { marginTop: 6 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    fontSize: 7,
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#000",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  notesBox: {
    marginTop: 8,
    padding: 6,
    borderWidth: 0.5,
    borderColor: "#ccc",
    fontSize: 6.5,
  },
  footer: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 6,
    color: "#666",
  },
  logo: { width: 36, height: 36, objectFit: "contain", alignSelf: "center" },
});

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

type Props = {
  invoice: InvoiceRow;
  business: BusinessInvoiceRow;
  customer: CustomerInvoiceRow | null;
  items: InvoiceItemRow[];
  labels: InvoicePdfLabels;
  locale: AppLocale;
  copyLabel?: string | null;
};

export function InvoicePdfDocument({
  invoice,
  business,
  customer,
  items,
  labels,
  locale,
  copyLabel,
}: Props) {
  const intlTag = intlLocaleTag(locale);
  const dash = "—";
  const statusLabel =
    invoice.status === "paid"
      ? labels.statusPaid
      : invoice.status === "draft"
        ? labels.statusDraft
        : invoice.status === "cancelled"
          ? labels.statusCancelled
          : labels.statusDue;
  const rtl = isRtlLocale(locale);

  const estimatedMm = estimateReceiptHeightMm(
    items,
    Boolean(business.logo_url),
    invoice.notes,
    customer,
  );
  const useTightSinglePage = estimatedMm <= MAX_SINGLE_PAGE_TIGHT_MM;
  const pageHeightMm = useTightSinglePage
    ? estimatedMm + 8
    : THERMAL_WRAPPED_PAGE_HEIGHT_MM;
  const pageHeightPt = pageHeightMm * MM_TO_PT;

  return (
    <Document>
      <Page
        size={[RECEIPT_WIDTH_PT, pageHeightPt]}
        style={[styles.page, rtl ? { direction: "rtl" } : {}]}
        wrap
      >
        {business.logo_url ? (
          <Image src={business.logo_url} style={styles.logo} />
        ) : null}
        <Text style={[styles.storeName, styles.center]}>{business.name}</Text>
        {business.address ? (
          <Text style={[styles.storeMeta, styles.center]}>{business.address}</Text>
        ) : null}
        {business.phone ? (
          <Text style={[styles.storeMeta, styles.center]}>
            {labels.ph} {business.phone}
          </Text>
        ) : null}

        <Text style={[styles.center, { fontSize: 7, fontFamily: "Helvetica-Bold", marginTop: 6 }]}>
          {labels.taxInvoiceTitle}
        </Text>
        {copyLabel ? (
          <Text style={[styles.center, { fontSize: 7, fontFamily: "Helvetica-Bold", marginTop: 2 }]}>
            {copyLabel}
          </Text>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.labelSm}>{labels.invoiceHash}</Text>
            <Text style={styles.invNum}>{invoice.invoice_number}</Text>
          </View>
          <View style={{ alignItems: rtl ? "flex-start" : "flex-end" }}>
            <Text style={styles.labelSm}>{labels.status}</Text>
            <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold" }}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.body}>
          {labels.datePrefix} {formatDate(invoice.created_at, intlTag, dash)}
          {invoice.due_date
            ? `  |  ${labels.duePrefix} ${formatDate(invoice.due_date, intlTag, dash)}`
            : ""}
        </Text>

        <View style={styles.thinDivider} />

        <Text style={styles.sectionTitle}>{labels.billTo}</Text>
        {customer ? (
          <>
            <Text style={[styles.body, styles.bold]}>{customer.name}</Text>
            {customer.phone ? <Text style={styles.body}>{customer.phone}</Text> : null}
            {customer.address ? (
              <Text style={[styles.body, { marginTop: 2 }]}>{customer.address}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.body}>{labels.walkIn}</Text>
        )}

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>{labels.items}</Text>
        {items.map((it, i) => (
          <View key={it.id || i} style={styles.itemBlock} wrap={false}>
            <Text style={styles.itemName}>{it.product_name}</Text>
            <View style={styles.itemLine}>
              <Text style={styles.itemLeft}>
                {String(it.quantity)} {it.unit} ×{" "}
                {formatMoney(Number(it.unit_price), business.currency, intlTag)}
                {Number(it.discount_pct) > 0 ? ` (−${it.discount_pct}%)` : ""}
              </Text>
              <Text style={styles.itemRight}>
                {formatMoney(Number(it.line_total), business.currency, intlTag)}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text>{labels.subtotal}</Text>
            <Text>{formatMoney(Number(invoice.subtotal), business.currency, intlTag)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>{labels.discount}</Text>
            <Text>− {formatMoney(Number(invoice.discount_amount), business.currency, intlTag)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>
              {(business.tax_label?.trim() || labels.tax) + " "}(
              {Number(invoice.tax_rate).toFixed(2)}%)
            </Text>
            <Text>{formatMoney(Number(invoice.tax_amount), business.currency, intlTag)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text>{labels.total}</Text>
            <Text>{formatMoney(Number(invoice.total_amount), business.currency, intlTag)}</Text>
          </View>
          {Number(invoice.paid_amount) > 0 ? (
            <View style={styles.totalRow}>
              <Text>{labels.paid}</Text>
              <Text>{formatMoney(Number(invoice.paid_amount), business.currency, intlTag)}</Text>
            </View>
          ) : null}
          {Number(invoice.total_amount) - Number(invoice.paid_amount) > 0.001 &&
          invoice.status !== "draft" ? (
            <View style={[styles.totalRow, { marginTop: 4 }]}>
              <Text style={styles.bold}>{labels.balanceDue}</Text>
              <Text style={styles.bold}>
                {formatMoney(
                  Number(invoice.total_amount) - Number(invoice.paid_amount),
                  business.currency,
                  intlTag,
                )}
              </Text>
            </View>
          ) : null}
        </View>

        {invoice.notes ? (
          <View style={styles.notesBox}>
            <Text style={[styles.labelSm, { marginBottom: 2 }]}>{labels.notes}</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  );
}
