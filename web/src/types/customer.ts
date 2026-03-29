/** Matches DB enum `customer_type`. */
export const CUSTOMER_TYPES = [
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "walkin", label: "Walk-in" },
] as const;

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
