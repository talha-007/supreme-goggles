import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types/product";
import { redirect } from "next/navigation";

export type BusinessContext = {
  userId: string;
  businessId: string;
  role: MemberRole;
};

export async function requireBusinessContext(): Promise<BusinessContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rows, error: memErr } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .order("id", { ascending: true })
    .limit(1);

  const row = rows?.[0];
  if (memErr || !row?.business_id) {
    redirect("/onboarding");
  }

  return {
    userId: user.id,
    businessId: row.business_id,
    role: row.role as MemberRole,
  };
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
