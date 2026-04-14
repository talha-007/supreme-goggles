import type { SupabaseClient } from "@supabase/supabase-js";

function truthyEnv(v: string | undefined): boolean {
  if (!v?.trim()) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function parseCsvEnv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.split("#")[0]?.trim() ?? "")
    .filter((s) => s.length > 0);
}

/**
 * Billing is enforced by default.
 * Use `NEXT_PUBLIC_SUBSCRIPTION_BYPASS=true` only for local/manual testing.
 */
export function subscriptionGateSkippedByEnv(): boolean {
  if (truthyEnv(process.env.NEXT_PUBLIC_SUBSCRIPTION_BYPASS)) {
    return true;
  }
  return false;
}

/**
 * Whether this business may use paid features.
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

/** Superadmin bypass by env-configured user IDs/emails. */
export function isSuperAdminByEnv(userId: string, email: string | null | undefined): boolean {
  const idList = parseCsvEnv(process.env.SUPERADMIN_USER_IDS);
  if (idList.includes(userId)) return true;

  const emailList = parseCsvEnv(process.env.SUPERADMIN_EMAILS).map((e) => e.toLowerCase());
  const normalizedEmail = (email ?? "").trim().toLowerCase();
  if (!normalizedEmail) return false;
  return emailList.includes(normalizedEmail);
}
