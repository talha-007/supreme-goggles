import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return {
    title: t("forgotPasswordTitle"),
    description: t("forgotPasswordSubtitle"),
  };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
        {t("forgotPasswordTitle")}
      </h1>
      <p className="mt-1 text-sm text-zinc-600">{t("forgotPasswordSubtitle")}</p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
     
    </div>
  );
}
