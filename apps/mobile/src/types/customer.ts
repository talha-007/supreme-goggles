/** Matches DB enum `customer_type`. */
export const CUSTOMER_TYPES = [
  { value: "retail" as const, label: "Retail" },
  { value: "wholesale" as const, label: "Wholesale" },
  { value: "walkin" as const, label: "Walk-in" },
];

export type CustomerType = (typeof CUSTOMER_TYPES)[number]["value"];

export type CustomerRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: CustomerType;
  credit_limit: number;
  outstanding_balance: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function customerTypeLabel(type: CustomerType): string {
  const row = CUSTOMER_TYPES.find((t) => t.value === type);
  return row?.label ?? type;
}
