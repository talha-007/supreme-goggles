import type { ProductRow } from "@/types/product";

/**
 * When spare-parts POS is active, bias search results toward exact / prefix
 * matches on barcode, SKU, then OEM (plan: barcode → SKU → OEM → name → brand).
 */
export function sortProductsForPosSearch(
  rawQuery: string,
  products: ProductRow[],
  sparePartsMode: boolean,
): ProductRow[] {
  const sq = rawQuery.trim().toLowerCase();
  if (!sparePartsMode || sq.length === 0) return products;

  const score = (p: ProductRow): number => {
    const b = (p.barcode ?? "").trim().toLowerCase();
    const sk = (p.sku ?? "").trim().toLowerCase();
    const oem = (p.oem_part_number ?? "").trim().toLowerCase();
    if (b === sq) return 0;
    if (b.startsWith(sq)) return 2;
    if (sk === sq) return 4;
    if (sk.startsWith(sq)) return 6;
    if (oem === sq) return 8;
    if (oem.startsWith(sq)) return 10;
    return 50;
  };

  return [...products].sort((a, b) => {
    const d = score(a) - score(b);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name);
  });
}
