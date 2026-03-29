"use server";

import {
  requireBusinessContext,
  canManageBusinessSettings,
} from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BusinessInvoiceDefaults = {
  default_tax_rate: number;
  default_invoice_discount_amount: number;
  default_line_discount_pct: number;
  tax_label: string | null;
};

export type SettingsActionState = { error?: string };

function parseMoney(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parsePct(raw: FormDataEntryValue | null): number {
  const n = Number(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export async function getBusinessInvoiceDefaults(): Promise<BusinessInvoiceDefaults | null> {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "default_tax_rate, default_invoice_discount_amount, default_line_discount_pct, tax_label",
    )
    .eq("id", ctx.businessId)
    .maybeSingle();

  if (error) {
    return null;
  }
  if (!data) return null;
  return {
    default_tax_rate: Number(data.default_tax_rate ?? 0),
    default_invoice_discount_amount: Number(data.default_invoice_discount_amount ?? 0),
    default_line_discount_pct: Number(data.default_line_discount_pct ?? 0),
    tax_label: data.tax_label as string | null,
  };
}

export async function updateBusinessInvoiceDefaults(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageBusinessSettings(ctx.role)) {
    return { error: "Only owners and managers can change these settings." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("update_business_invoice_defaults", {
    p_default_tax_rate: parsePct(formData.get("default_tax_rate")),
    p_default_invoice_discount_amount: parseMoney(formData.get("default_invoice_discount_amount")),
    p_default_line_discount_pct: parsePct(formData.get("default_line_discount_pct")),
    p_tax_label: String(formData.get("tax_label") ?? "").trim(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/invoices/new");
  return {};
}
