import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { UpdatePasswordForm } from "./update-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("updatePasswordTitle"),
    description: t("updatePasswordSubtitle"),
  };
}

export default async function UpdatePasswordPage() {
  const t = await getTranslations("auth");

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t("updatePasswordTitle")}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("updatePasswordSubtitle")}</p>
      <div className="mt-6">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
