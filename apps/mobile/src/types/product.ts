/** Matches DB enum `product_unit` (same as web). */
export const PRODUCT_UNITS = [
  "pcs",
  "kg",
  "g",
  "dozen",
  "ltr",
  "mtr",
  "box",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

/** Row from `products` / `search_products` RPC. */
export type ProductRow = {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  brand: string | null;
  /** Spare parts (optional; from DB when column exists). */
  oem_part_number?: string | null;
  alternate_part_numbers?: string | null;
  application_notes?: string | null;
  manufacturer?: string | null;
  description: string | null;
  unit: ProductUnit;
  purchase_price: number;
  sale_price: number;
  current_stock: number;
  reorder_level: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};
