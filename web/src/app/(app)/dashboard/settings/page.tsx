import { InvoiceDefaultsForm } from "@/components/settings/invoice-defaults-form";
import { WhatsappSettingsForm } from "@/components/settings/whatsapp-settings-form";
import {
  canManageBusinessSettings,
  requireBusinessContext,
} from "@/lib/auth/business-context";
import { getBusinessInvoiceDefaults, getBusinessWhatsAppSettings } from "@/lib/settings/actions";
import { getTranslations } from "next-intl/server";

export default async function SettingsPage() {
  const ctx = await requireBusinessContext();
  const canEditSettings = canManageBusinessSettings(ctx.role);
  const defaults = await getBusinessInvoiceDefaults();
  const wa = await getBusinessWhatsAppSettings();
  const t = await getTranslations("settings");

  const initial = defaults ?? {
    default_tax_rate: 0,
    default_invoice_discount_amount: 0,
    default_line_discount_pct: 0,
    tax_label: null as string | null,
  };

  const waInitial = wa ?? {
    whatsapp_phone_e164: null as string | null,
    whatsapp_notify_daily: false,
    whatsapp_notify_po: false,
    whatsapp_notify_receive: false,
    whatsapp_notify_low_stock: false,
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t("subtitle")}</p>

      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t("invoiceSection")}</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("invoiceSectionDesc")}</p>
        <div className="mt-6">
          <InvoiceDefaultsForm initial={initial} canEdit={canEditSettings} />
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t("whatsappSection")}</h2>
        {/* <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t("whatsappSectionDesc", {
            phoneId: "WHATSAPP_PHONE_NUMBER_ID",
            token: "WHATSAPP_ACCESS_TOKEN",
            template: "shop_alert",
            varTitle: "{{alert_title}}",
            varBody: "{{alert_message}}",
            singleBody: "WHATSAPP_TEMPLATE_SINGLE_BODY=true",
            varBodyOnly: "{{alert_message}}",
            paramTitle: "WHATSAPP_TEMPLATE_PARAM_TITLE",
            paramBody: "WHATSAPP_TEMPLATE_PARAM_BODY",
            cronPath: "/api/cron/whatsapp-digest",
            cronSecret: "CRON_SECRET",
            serviceKey: "SUPABASE_SERVICE_ROLE_KEY",
          })}
        </p> */}
        <div className="mt-6">
          <WhatsappSettingsForm initial={waInitial} canEdit={canEditSettings} />
        </div>
      </section>
    </div>
  );
}
