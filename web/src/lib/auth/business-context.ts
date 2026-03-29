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

  const { data: row } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row?.business_id) {
    redirect("/onboarding");
  }

  return {
    userId: user.id,
    businessId: row.business_id,
    role: row.role as MemberRole,
  };
}

export function canManageProducts(role: MemberRole): boolean {
  return role !== "viewer";
}

/** Same RLS rule as products: viewers read-only. */
export function canManageCustomers(role: MemberRole): boolean {
  return role !== "viewer";
}

export function canManageInvoices(role: MemberRole): boolean {
  return role !== "viewer";
}
