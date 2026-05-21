"use server";

import {
  requireBusinessContext,
  canManageCustomers,
  canDeleteCustomers,
} from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import type { CustomerType } from "@/types/customer";
import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseMoney(value: FormDataEntryValue | null): number {
  if (value === null || value === "") return 0;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function moneyCents(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100);
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

  const outstandingRaw = formData.get("outstanding_balance");
  const outstandingUpdate =
    typeof outstandingRaw === "string" ? parseMoney(outstandingRaw) : undefined;

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
      ...(outstandingUpdate !== undefined ? { outstanding_balance: outstandingUpdate } : {}),
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

export async function deleteCustomer(
  customerId: string,
  _prev: CustomerActionState,
  _formData: FormData,
): Promise<CustomerActionState> {
  const t = await getTranslations("customers");
  const ctx = await requireBusinessContext();
  if (!canDeleteCustomers(ctx.role)) {
    return { error: t("deleteOwnerOnly") };
  }
  if (!canManageCustomers(ctx.role)) {
    return { error: t("deletePermissionDenied") };
  }

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("customers")
    .select("id, business_id, outstanding_balance")
    .eq("id", customerId)
    .maybeSingle();

  if (!row || row.business_id !== ctx.businessId) {
    return { error: t("deleteNotFound") };
  }

  if (moneyCents(row.outstanding_balance) !== 0) {
    return {
      error: t("deleteBlockedOutstanding"),
    };
  }

  const { error: unlinkErr } = await supabase
    .from("invoices")
    .update({ customer_id: null })
    .eq("business_id", ctx.businessId)
    .eq("customer_id", customerId);

  if (unlinkErr) {
    return { error: unlinkErr.message };
  }

  const { error: delErr } = await supabase
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("business_id", ctx.businessId);

  if (delErr) {
    return { error: delErr.message };
  }

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${customerId}/edit`);
  redirect("/dashboard/customers");
}
