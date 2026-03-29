"use server";

import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type SupplierActionState = { error?: string };

export async function createSupplier(
  _prev: SupplierActionState,
  formData: FormData,
): Promise<SupplierActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "You do not have permission to add suppliers." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert({
    business_id: ctx.businessId,
    name,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/suppliers");
  revalidatePath("/dashboard/purchase-orders");
  redirect("/dashboard/suppliers");
}
