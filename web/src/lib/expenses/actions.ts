"use server";

import { requireBusinessContext, canManageProducts } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ExpenseActionState = { error?: string };

function parseMoney(value: FormDataEntryValue | null): number {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export async function createExpense(
  _prev: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageProducts(ctx.role)) {
    return { error: "You do not have permission to add expenses." };
  }

  const description = String(formData.get("description") ?? "").trim();
  if (!description) return { error: "Description is required." };

  const amount = parseMoney(formData.get("amount"));
  if (amount <= 0) return { error: "Amount must be greater than zero." };

  const expenseDate = String(formData.get("expense_date") ?? "").trim();
  const dateValue = expenseDate || new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const { error } = await supabase.from("business_expenses").insert({
    business_id: ctx.businessId,
    expense_date: dateValue,
    category: String(formData.get("category") ?? "").trim() || "general",
    description,
    amount,
    payment_method: String(formData.get("payment_method") ?? "").trim() || null,
    vendor_name: String(formData.get("vendor_name") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: ctx.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/expenses");
  redirect("/dashboard/expenses");
}
