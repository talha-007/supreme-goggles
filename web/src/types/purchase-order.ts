export type PurchaseOrderStatus =
  | "draft"
  | "ordered"
  | "partial"
  | "received"
  | "cancelled";

export type SupplierRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrderRow = {
  id: string;
  business_id: string;
  supplier_id: string | null;
  po_number: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  notes: string | null;
  ordered_at: string | null;
  received_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseOrderItemRow = {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  product_name: string;
  qty_ordered: number;
  qty_received: number;
  unit_cost: number;
  line_total: number;
  created_at: string;
};

export type POLineDraft = {
  product_id: string | null;
  product_name: string;
  qty_ordered: number;
  unit_cost: number;
};

export type POFormValues = {
  supplier_id: string | null;
  notes: string | null;
  items: POLineDraft[];
};

export type ReceiveLineInput = {
  po_item_id: string;
  qty_received: number;
};

export type ReceiveItemsFormValues = {
  items: ReceiveLineInput[];
};
