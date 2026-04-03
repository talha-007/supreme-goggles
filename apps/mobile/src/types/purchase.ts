export type PurchaseOrderStatus =
  | "draft"
  | "ordered"
  | "partial"
  | "received"
  | "cancelled";

export type SupplierListRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

export type PurchaseOrderListRow = {
  id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  created_at: string;
  supplier: { id: string; name: string; phone: string | null } | null;
};

export type PoItemDetail = {
  id: string;
  /** Required before placing order or receiving stock (matches web rules). */
  product_id: string | null;
  product_name: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number;
  line_total: number;
};

export type PurchaseOrderDetail = PurchaseOrderListRow & {
  notes: string | null;
  items: PoItemDetail[];
};
