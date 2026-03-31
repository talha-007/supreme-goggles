"use client";

import {
  updateBusinessWhatsAppSettings,
  type BusinessWhatsAppSettings,
} from "@/lib/settings/actions";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

type Props = {
  initial: BusinessWhatsAppSettings;
  canEdit: boolean;
};

export function WhatsappSettingsForm({ initial, canEdit }: Props) {
  const [state, action, pending] = useActionState(updateBusinessWhatsAppSettings, {});
  const t = useTranslations("whatsappSettings");
  const tc = useTranslations("common");

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="whatsapp_phone_e164" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("phoneLabel")}
        </label>
        <input
          id="whatsapp_phone_e164"
          name="whatsapp_phone_e164"
          type="tel"
          placeholder={t("phonePlaceholder")}
          defaultValue={initial.whatsapp_phone_e164 ?? ""}
          disabled={!canEdit}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("phoneHint")}</p>
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("whatToSend")}</legend>
        <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            name="whatsapp_notify_daily"
            defaultChecked={initial.whatsapp_notify_daily}
            className="size-4 rounded border-zinc-300"
          />
          {t("notifyDaily")}
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            name="whatsapp_notify_low_stock"
            defaultChecked={initial.whatsapp_notify_low_stock}
            className="size-4 rounded border-zinc-300"
          />
          {t("notifyLowStock")}
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            name="whatsapp_notify_po"
            defaultChecked={initial.whatsapp_notify_po}
            className="size-4 rounded border-zinc-300"
          />
          {t("notifyPo")}
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            name="whatsapp_notify_receive"
            defaultChecked={initial.whatsapp_notify_receive}
            className="size-4 rounded border-zinc-300"
          />
          {t("notifyReceive")}
        </label>
      </fieldset>

      {canEdit ? (
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? tc("saving") : t("saveButton")}
        </button>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{tc("onlyOwnersManagers")}</p>
      )}

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
