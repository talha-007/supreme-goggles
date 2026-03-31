import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; details?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t("signInTitle")}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("signInSubtitle")}</p>
      {params.error === "auth" ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {t("authError", { callback: t("callbackPath") })}
        </p>
      ) : null}
      {params.error === "oauth" && params.details ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {params.details}
        </p>
      ) : null}
      <div className="mt-6">
        <LoginForm />
      </div>
    </div>
  );
}
