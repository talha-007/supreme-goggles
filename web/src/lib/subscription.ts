import type { SupabaseClient } from "@supabase/supabase-js";

function truthyEnv(v: string | undefined): boolean {
  if (!v?.trim()) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/**
 * When true, billing checks are skipped and everyone is treated as subscribed.
 * - `next dev` — always skip (full feature testing).
 * - `NEXT_PUBLIC_SUBSCRIPTION_BYPASS=true` — skip (e.g. `next build && next start` locally).
 * - `NEXT_PUBLIC_BILLING_ENFORCE` unset/false — skip until you turn on enforcement.
 */
export function subscriptionGateSkippedByEnv(): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  if (truthyEnv(process.env.NEXT_PUBLIC_SUBSCRIPTION_BYPASS)) {
    return true;
  }
  if (!truthyEnv(process.env.NEXT_PUBLIC_BILLING_ENFORCE)) {
    return true;
  }
  return false;
}

/**
 * Whether this business may use paid features. Call from server layouts/actions when you add gates.
 * With default env (no enforce), always true. When enforcement is on, reads `businesses.subscription_status`.
 */
export async function hasSubscriptionAccess(
  supabase: SupabaseClient,
  businessId: string,
): Promise<boolean> {
  if (subscriptionGateSkippedByEnv()) {
    return true;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("subscription_status, subscription_ends_at")
    .eq("id", businessId)
    .maybeSingle();

  if (error || !data) {
    return true;
  }

  const row = data as {
    subscription_status?: string;
    subscription_ends_at?: string | null;
  };
  const status = String(row.subscription_status ?? "active").toLowerCase();
  const endsAt = row.subscription_ends_at ? new Date(row.subscription_ends_at) : null;
  const now = new Date();

  if (status === "cancelled") {
    return false;
  }
  if (status === "past_due") {
    return false;
  }
  if (status === "active") {
    if (endsAt && !Number.isNaN(endsAt.getTime()) && endsAt < now) {
      return false;
    }
    return true;
  }
  if (status === "trial" || status === "trialing") {
    if (!endsAt || Number.isNaN(endsAt.getTime())) {
      return true;
    }
    return endsAt >= now;
  }
  return false;
}
