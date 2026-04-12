"use server";

import { assertSuperadmin } from "@/lib/admin/gate";
import {
  defaultActiveBillingPeriodEndsAtIso,
  defaultTrialEndsAtIso,
} from "@/lib/admin/subscription-display";
import type { AdminBusinessRow, AdminListState, SubscriptionStatus } from "@/lib/admin/subscription-types";
import { SUBSCRIPTION_STATUSES } from "@/lib/admin/subscription-types";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

function revalidateAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/businesses");
}

export async function listBusinessesForAdmin(): Promise<AdminListState> {
  const gate = await assertSuperadmin();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("businesses")
      .select("id, name, type, subscription_status, subscription_ends_at, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, rows: (data ?? []) as AdminBusinessRow[] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not load businesses.";
    return { ok: false, error: msg };
  }
}

export async function updateBusinessSubscription(
  businessId: string,
  subscriptionStatus: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertSuperadmin();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }
  const normalized = subscriptionStatus.trim().toLowerCase();
  if (!SUBSCRIPTION_STATUSES.includes(normalized as SubscriptionStatus)) {
    return { ok: false, error: "Invalid subscription status." };
  }
  try {
    const admin = createServiceRoleClient();
    const { data: row, error: fetchErr } = await admin
      .from("businesses")
      .select("subscription_status, subscription_ends_at, created_at")
      .eq("id", businessId)
      .maybeSingle();

    if (fetchErr) {
      return { ok: false, error: fetchErr.message };
    }
    if (!row) {
      return { ok: false, error: "Business not found." };
    }

    const cur = row as {
      subscription_status: string | null;
      subscription_ends_at: string | null;
      created_at: string;
    };
    const prevStatus = String(cur.subscription_status ?? "active").toLowerCase();
    const endsMissing =
      cur.subscription_ends_at == null || String(cur.subscription_ends_at).trim() === "";

    const now = new Date();
    const endsAtDate = cur.subscription_ends_at ? new Date(cur.subscription_ends_at) : null;
    const endsInPast =
      endsAtDate != null &&
      !Number.isNaN(endsAtDate.getTime()) &&
      endsAtDate < now;

    const payload: Record<string, unknown> = {
      subscription_status: normalized,
      updated_at: new Date().toISOString(),
    };

    if (normalized === "active") {
      const wasActive = prevStatus === "active";
      // New or renewed paid period: first activation, legacy row without end, or expired period.
      if (!wasActive || endsMissing || (wasActive && endsInPast)) {
        payload.subscription_ends_at = defaultActiveBillingPeriodEndsAtIso(now);
      }
    } else if (normalized === "trial" && endsMissing) {
      payload.subscription_ends_at = defaultTrialEndsAtIso(cur.created_at);
    }

    const { error } = await admin.from("businesses").update(payload).eq("id", businessId);
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidateAdminPaths();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed.";
    return { ok: false, error: msg };
  }
}

export async function updateBusinessSubscriptionEndsAt(
  businessId: string,
  endsAtIso: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertSuperadmin();
  if (!gate.ok) {
    return { ok: false, error: gate.error };
  }
  let parsed: string | null = null;
  if (endsAtIso != null && String(endsAtIso).trim() !== "") {
    const d = new Date(endsAtIso);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: "Invalid end date." };
    }
    parsed = d.toISOString();
  }
  try {
    const admin = createServiceRoleClient();
    const { error } = await admin
      .from("businesses")
      .update({
        subscription_ends_at: parsed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);
    if (error) {
      return { ok: false, error: error.message };
    }
    revalidateAdminPaths();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed.";
    return { ok: false, error: msg };
  }
}
