/** Matches DB enum `product_unit`. */
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

export type MemberRole = "owner" | "manager" | "cashier" | "viewer";

export type ProductRow = {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: string | null;
  /** Brand / manufacturer (optional; used with category for filtering). */
  brand: string | null;
  description: string | null;
  unit: ProductUnit;
  purchase_price: number;
  sale_price: number;
  current_stock: number;
  reorder_level: number;
  /** Pharmacy flow: product requires prescription to sell. */
  requires_prescription: boolean;
  /** Pharmacy flow: optional MRP (maximum retail price). */
  mrp: number | null;
  /** Restaurant flow: true when this product is sold as a menu item. */
  is_menu_item: boolean;
  is_active: boolean;
  /** Public URL from Supabase Storage (`product-images` bucket). */
  image_url: string | null;
  created_at: string;
  updated_at: string;
};
