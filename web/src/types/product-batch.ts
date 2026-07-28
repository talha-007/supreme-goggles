export type ProductBatchRow = {
  id: string;
  business_id: string;
  product_id: string;
  batch_no: string;
  expiry_date: string | null;
  qty_on_hand: number;
  unit_cost: number | null;
  purchase_order_id: string | null;
  purchase_order_item_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
