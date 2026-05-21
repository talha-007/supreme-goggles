import type { CustomerRow, CustomerType } from "../types/customer";

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function moneyCents(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100);
}

export function normalizeCustomer(row: Record<string, unknown>): CustomerRow {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    name: String(row.name),
    phone: row.phone != null ? String(row.phone) : null,
    email: row.email != null ? String(row.email) : null,
    address: row.address != null ? String(row.address) : null,
    type: (String(row.type ?? "retail") || "retail") as CustomerType,
    credit_limit: Number(row.credit_limit),
    outstanding_balance: Number(row.outstanding_balance),
    notes: row.notes != null ? String(row.notes) : null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
