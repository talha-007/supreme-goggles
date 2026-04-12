/** Matches Postgres enum `subscription_status` — use `trial`, not `trialing`. */
export const SUBSCRIPTION_STATUSES = [
  "active",
  "trial",
  "past_due",
  "cancelled",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Legacy rows may say `trialing`; DB enum uses `trial`. */
export function canonicalSubscriptionStatus(raw: string | null | undefined): SubscriptionStatus {
  const s = String(raw ?? "active").trim().toLowerCase();
  if (s === "trialing") return "trial";
  if (SUBSCRIPTION_STATUSES.includes(s as SubscriptionStatus)) {
    return s as SubscriptionStatus;
  }
  return "active";
}

export type AdminBusinessRow = {
  id: string;
  name: string;
  type: string;
  subscription_status: string;
  /** ISO timestamp or null (trial / plan end). */
  subscription_ends_at: string | null;
  created_at: string;
};

export type AdminListState =
  | { ok: true; rows: AdminBusinessRow[] }
  | { ok: false; error: string };
