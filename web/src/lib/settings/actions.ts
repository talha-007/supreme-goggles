"use server";

import {
  requireBusinessContext,
  canManageBusinessSettings,
} from "@/lib/auth/business-context";
import { deleteBusinessLogoByUrl, uploadBusinessLogo } from "@/lib/storage/business-logos";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BusinessInvoiceDefaults = {
  default_tax_rate: number;
  default_invoice_discount_amount: number;
  default_line_discount_pct: number;
  tax_label: string | null;
};

export type BusinessWhatsAppSettings = {
  whatsapp_phone_e164: string | null;
  whatsapp_notify_daily: boolean;
  whatsapp_notify_po: boolean;
  whatsapp_notify_receive: boolean;
  whatsapp_notify_low_stock: boolean;
};

export type BusinessProfileSettings = {
  name: string;
  logo_url: string | null;
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

export async function getBusinessWhatsAppSettings(): Promise<BusinessWhatsAppSettings | null> {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "whatsapp_phone_e164, whatsapp_notify_daily, whatsapp_notify_po, whatsapp_notify_receive, whatsapp_notify_low_stock",
    )
    .eq("id", ctx.businessId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    whatsapp_phone_e164: data.whatsapp_phone_e164 as string | null,
    whatsapp_notify_daily: Boolean(data.whatsapp_notify_daily),
    whatsapp_notify_po: Boolean(data.whatsapp_notify_po),
    whatsapp_notify_receive: Boolean(data.whatsapp_notify_receive),
    whatsapp_notify_low_stock: Boolean(data.whatsapp_notify_low_stock),
  };
}

export async function getBusinessProfileSettings(): Promise<BusinessProfileSettings | null> {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("name, logo_url")
    .eq("id", ctx.businessId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    name: String(data.name ?? ""),
    logo_url: (data.logo_url as string | null) ?? null,
  };
}

export async function updateBusinessWhatsAppSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageBusinessSettings(ctx.role)) {
    return { error: "Only owners and managers can change these settings." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_business_whatsapp_settings", {
    p_phone_e164: String(formData.get("whatsapp_phone_e164") ?? "").trim(),
    p_notify_daily: formData.get("whatsapp_notify_daily") === "on",
    p_notify_po: formData.get("whatsapp_notify_po") === "on",
    p_notify_receive: formData.get("whatsapp_notify_receive") === "on",
    p_notify_low_stock: formData.get("whatsapp_notify_low_stock") === "on",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return {};
}

export async function updateBusinessProfileSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const ctx = await requireBusinessContext();
  if (!canManageBusinessSettings(ctx.role)) {
    return { error: "Only owners and managers can change these settings." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("businesses")
    .select("logo_url")
    .eq("id", ctx.businessId)
    .maybeSingle();
  const oldLogoUrl = (existing?.logo_url as string | null) ?? null;

  let nextLogoUrl: string | null = oldLogoUrl;
  const removeLogo = formData.get("remove_logo") === "on";
  const logoFile = formData.get("logo");

  if (logoFile instanceof File && logoFile.size > 0) {
    const up = await uploadBusinessLogo(supabase, ctx.businessId, logoFile);
    if ("error" in up) return { error: up.error };
    nextLogoUrl = up.url;
  } else if (removeLogo) {
    nextLogoUrl = null;
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Business name is required." };

  const { error } = await supabase.rpc("update_business_profile_settings", {
    p_name: name,
    p_logo_url: nextLogoUrl ?? "",
  });

  if (error) {
    if (nextLogoUrl && nextLogoUrl !== oldLogoUrl) {
      await deleteBusinessLogoByUrl(supabase, nextLogoUrl);
    }
    return { error: error.message };
  }

  if (oldLogoUrl && oldLogoUrl !== nextLogoUrl) {
    await deleteBusinessLogoByUrl(supabase, oldLogoUrl);
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard", "layout");
  return {};
}
