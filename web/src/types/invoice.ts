export type InvoiceStatus = "draft" | "unpaid" | "partial" | "paid" | "cancelled";

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "jazzcash"
  | "easypaisa"
  | "credit"
  | "cheque";

export type InvoiceRow = {
  id: string;
  business_id: string;
  invoice_number: string;
  customer_id: string | null;
  status: InvoiceStatus;
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  due_date: string | null;
  restaurant_table_id?: string | null;
  waiter_id?: string | null;
  service_mode?: "counter" | "dine_in" | "takeaway" | "delivery";
  restaurant_order_status?: "new" | "preparing" | "served" | "settled";
  notes: string | null;
  /** Set when stock was deducted at finalize; void restores inventory when this or sale stock movements exist. */
  stock_deducted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  product_id: string | null;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  line_total: number;
};

export type BusinessInvoiceRow = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  currency: string;
  /** Shown on PDF instead of the word "Tax", e.g. GST, VAT. */
  tax_label?: string | null;
};

/** Applied when creating a new invoice (from Settings). */
export type InvoiceEditorDefaults = {
  defaultTaxRate: number;
  defaultInvoiceDiscountAmount: number;
  defaultLineDiscountPct: number;
};

export type CustomerInvoiceRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};
