import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/types/product";
import { redirect } from "next/navigation";
import { cache } from "react";

export type BusinessContext = {
  userId: string;
  userEmail: string | null;
  businessId: string;
  role: MemberRole;
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

  return {
    userId: user.id,
    userEmail: user.email ?? null,
    businessId: row.business_id,
    role: row.role as MemberRole,
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
