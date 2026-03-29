"use server";

import { requireBusinessContext, canManageCustomers } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { CustomerType } from "@/types/customer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseMoney(value: FormDataEntryValue | null): number {
  if (value === null || value === "") return 0;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export type CustomerActionState = { error?: string };

export async function createCustomer(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageCustomers(ctx.role)) {
    return { error: "You do not have permission to add customers." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const type = String(formData.get("type") ?? "retail") as CustomerType;

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    business_id: ctx.businessId,
    name,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    type,
    credit_limit: parseMoney(formData.get("credit_limit")),
    notes: String(formData.get("notes") ?? "").trim() || null,
    is_active: formData.get("is_active") === "on",
    created_by: ctx.userId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}

export async function updateCustomer(
  customerId: string,
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageCustomers(ctx.role)) {
    return { error: "You do not have permission to edit customers." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Name is required." };
  }

  const type = String(formData.get("type") ?? "retail") as CustomerType;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("customers")
    .select("id, business_id")
    .eq("id", customerId)
    .maybeSingle();

  if (!existing || existing.business_id !== ctx.businessId) {
    return { error: "Customer not found." };
  }

  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      type,
      credit_limit: parseMoney(formData.get("credit_limit")),
      notes: String(formData.get("notes") ?? "").trim() || null,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", customerId)
    .eq("business_id", ctx.businessId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/customers");
  redirect("/dashboard/customers");
}
