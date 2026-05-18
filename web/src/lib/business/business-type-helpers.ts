import type { BusinessType } from "@/lib/business/capabilities";

export function isSparePartsBusinessType(type: BusinessType): boolean {
  return type === "spare_parts";
}
