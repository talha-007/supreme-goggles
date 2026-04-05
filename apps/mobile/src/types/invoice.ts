export type InvoiceStatus = "draft" | "unpaid" | "partial" | "paid" | "cancelled";

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
  notes: string | null;
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
