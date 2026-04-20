import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types/product";
import { redirect } from "next/navigation";
import { cache } from "react";

export type BusinessContext = {
  userId: string;
  userEmail: string | null;
  businessId: string;
  role: MemberRole;
  restaurantStaffRole: "waiter" | "chef" | "counter" | null;
};

const getBusinessContextCached = cache(async (): Promise<BusinessContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: rows, error: memErr } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .order("id", { ascending: true })
    .limit(1);

  const row = rows?.[0];
  if (memErr || !row?.business_id) return null;

  let restaurantStaffRole: BusinessContext["restaurantStaffRole"] = null;
  const { data: businessRow } = await supabase
    .from("businesses")
    .select("type")
    .eq("id", row.business_id)
    .maybeSingle();
  if (businessRow?.type === "restaurant") {
    const { data: staffRow } = await supabase
      .from("restaurant_staff")
      .select("role, is_active")
      .eq("business_id", row.business_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (staffRow?.role === "waiter" || staffRow?.role === "chef" || staffRow?.role === "counter") {
      restaurantStaffRole = staffRow.role;
    }
  }

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    businessId: row.business_id,
    role: row.role as MemberRole,
    restaurantStaffRole,
  };
});

export async function requireBusinessContext(): Promise<BusinessContext> {
  const ctx = await getBusinessContextCached();
  if (!ctx) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
    redirect("/onboarding");
  }
  return ctx;
}

/**
 * Role-based restrictions are disabled: any user with a `business_members` row
 * gets full app access. Supabase RLS still enforces business scoping.
 * Reintroduce per-role checks here when you add team management.
 */
export function canManageProducts(_role: MemberRole): boolean {
  return true;
}

export function canManageCustomers(_role: MemberRole): boolean {
  return true;
}

export function canManageInvoices(_role: MemberRole): boolean {
  return true;
}

export function canManageBusinessSettings(_role: MemberRole): boolean {
  return true;
}

export function restaurantRoleGuard(
  ctx: BusinessContext,
  allowed: Array<"waiter" | "chef" | "counter">,
): boolean {
  if (!ctx.restaurantStaffRole) return true;
  return allowed.includes(ctx.restaurantStaffRole);
}

export function isRestrictedRestaurantStaff(ctx: BusinessContext): boolean {
  return ctx.restaurantStaffRole === "waiter" || ctx.restaurantStaffRole === "chef" || ctx.restaurantStaffRole === "counter";
}

/** The home URL for a restricted restaurant staff member. */
export function getRestaurantStaffHomeUrl(ctx: BusinessContext): string {
  if (ctx.restaurantStaffRole === "waiter") return "/dashboard/restaurant/waiter-board";
  if (ctx.restaurantStaffRole === "chef") return "/dashboard/restaurant/kitchen";
  if (ctx.restaurantStaffRole === "counter") return "/dashboard/restaurant/counter";
  return "/dashboard";
}

/**
 * Call at the top of every "owner-only" page (invoices, products, settings, etc.).
 * Restaurant staff (waiter / chef / counter) are sent to their own board.
 */
export function guardOwnerPage(ctx: BusinessContext): void {
  if (isRestrictedRestaurantStaff(ctx)) {
    redirect(getRestaurantStaffHomeUrl(ctx));
  }
}
