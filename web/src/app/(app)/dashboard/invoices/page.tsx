import { InvoicesClient, type InvoiceClientRow } from "@/components/invoices/invoices-client";
import { resolveBusinessCapabilities, type BusinessType } from "@/lib/business/capabilities";
import { requireBusinessContext, canManageInvoices, guardOwnerPage } from "@/lib/auth/business-context";
import { intlLocaleTag } from "@/lib/i18n/intl-locale";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";

export default async function InvoicesPage() {
  const ctx = await requireBusinessContext();
  guardOwnerPage(ctx);
  const canEdit = canManageInvoices(ctx.role);
  const supabase = await createClient();
  const t = await getTranslations("invoices");
  const tc = await getTranslations("common");
  const tStatus = await getTranslations("invoiceStatus");
  const locale = await getLocale();

  const [{ data: businessRow }, { data: settingsRow }] = await Promise.all([
    supabase.from("businesses").select("type").eq("id", ctx.businessId).maybeSingle(),
    supabase
      .from("business_settings")
      .select(
        "enable_table_service, enable_batch_expiry, enable_prescription_flow, enable_kot_printing, enable_quick_service_mode, default_tax_mode, rounding_rule",
      )
      .eq("business_id", ctx.businessId)
      .maybeSingle(),
  ]);
  const caps = resolveBusinessCapabilities(
    (businessRow?.type as BusinessType | null) ?? "shop",
    settingsRow,
  );
  const isRestaurant = caps.type === "restaurant";

  const { data: rows, error } = await supabase
    .from("invoices")
    .select(
      `*, customers ( name ), restaurant_tables ( name ), restaurant_staff!invoices_waiter_id_fkey ( name )`,
    )
    .eq("business_id", ctx.businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    draft:     tStatus("draft"),
    unpaid:    tStatus("unpaid"),
    partial:   tStatus("partial"),
    paid:      tStatus("paid"),
    cancelled: tStatus("cancelled"),
  };

  return (
    <InvoicesClient
      invoices={(rows ?? []) as InvoiceClientRow[]}
      canEdit={canEdit}
      isRestaurant={isRestaurant}
      currencyLocale={intlLocaleTag(locale)}
      statusLabels={statusLabels}
      viewLabel={t("view")}
      editLabel={tc("edit")}
      voidLabel="Void"
      newInvoiceHref="/dashboard/invoices/new"
      newInvoiceLabel={t("new")}
      title={t("title")}
      subtitle={t("subtitle")}
      emptyLabel={t("empty")}
    />
  );
}
