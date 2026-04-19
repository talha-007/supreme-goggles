export type BusinessType =
  | "shop"
  | "retailer"
  | "wholesaler"
  | "general_store"
  | "restaurant"
  | "pharmacy";

export type BusinessSettings = {
  enable_table_service: boolean;
  enable_batch_expiry: boolean;
  enable_prescription_flow: boolean;
  enable_kot_printing: boolean;
  enable_quick_service_mode: boolean;
  default_tax_mode: "inclusive" | "exclusive";
  rounding_rule: "none" | "nearest_0_01" | "nearest_0_05" | "nearest_1";
};

export type BusinessCapabilities = {
  type: BusinessType;
  tableService: boolean;
  batchExpiry: boolean;
  prescriptionFlow: boolean;
  kotPrinting: boolean;
  quickServiceMode: boolean;
  taxMode: "inclusive" | "exclusive";
  roundingRule: "none" | "nearest_0_01" | "nearest_0_05" | "nearest_1";
};

const FALLBACK_SETTINGS: BusinessSettings = {
  enable_table_service: false,
  enable_batch_expiry: false,
  enable_prescription_flow: false,
  enable_kot_printing: false,
  enable_quick_service_mode: true,
  default_tax_mode: "exclusive",
  rounding_rule: "nearest_0_01",
};

export function resolveBusinessCapabilities(
  type: BusinessType,
  settings: Partial<BusinessSettings> | null | undefined,
): BusinessCapabilities {
  const merged = { ...FALLBACK_SETTINGS, ...(settings ?? {}) };
  return {
    type,
    tableService: merged.enable_table_service,
    batchExpiry: merged.enable_batch_expiry,
    prescriptionFlow: merged.enable_prescription_flow,
    kotPrinting: merged.enable_kot_printing,
    quickServiceMode: merged.enable_quick_service_mode,
    taxMode: merged.default_tax_mode,
    roundingRule: merged.rounding_rule,
  };
}
