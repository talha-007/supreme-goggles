"use client";

import { updateBusinessProfileSettings, type BusinessProfileSettings } from "@/lib/settings/actions";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useActionState } from "react";

type Props = {
  initial: BusinessProfileSettings;
  canEdit: boolean;
};

export function BusinessProfileForm({ initial, canEdit }: Props) {
  const [state, action, pending] = useActionState(updateBusinessProfileSettings, {});
  const t = useTranslations("businessProfile");
  const tc = useTranslations("common");

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("businessName")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial.name}
          disabled={!canEdit}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="logo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("logo")}
        </label>
        {initial.logo_url ? (
          <div className="inline-flex w-fit items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900">
            <Image
              src={initial.logo_url}
              alt={t("logoAlt")}
              width={56}
              height={56}
              className="rounded object-contain"
            />
            <span className="text-xs text-zinc-600 dark:text-zinc-300">{t("logoPreview")}</span>
          </div>
        ) : null}
        <input
          id="logo"
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          disabled={!canEdit}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:file:bg-zinc-800"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("logoHint")}</p>
        {initial.logo_url ? (
          <label className="inline-flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
            <input type="checkbox" name="remove_logo" disabled={!canEdit} className="size-4 rounded border-zinc-300" />
            {t("removeLogo")}
          </label>
        ) : null}
      </div>

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
