"use client";

import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { PasswordRuleChecklist } from "@/components/auth/password-rule-checklist";
import { createClient } from "@/lib/supabase/client";
import {
  getPasswordRulesStatus,
  getSignUpPasswordIssue,
} from "@/lib/auth/credential-validation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

const PASSWORD_ERROR_KEY = {
  minLength: "passwordError.minLength",
  letter: "passwordError.letter",
  number: "passwordError.number",
  symbol: "passwordError.symbol",
} as const;

export function UpdatePasswordForm() {
  const t = useTranslations("auth");
  const [ready, setReady] = useState<"check" | "no" | "yes">("check");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let c = true;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!c) return;
      if (data.session) setReady("yes");
      else setReady("no");
    })();
    return () => {
      c = false;
    };
  }, []);

  const rules = getPasswordRulesStatus(password);
  const passwordIssue = started && password.length > 0 ? getSignUpPasswordIssue(password) : null;
  const passwordError =
    started && (password.length === 0
      ? t("loginFieldPasswordRequired")
      : passwordIssue
        ? t(PASSWORD_ERROR_KEY[passwordIssue])
        : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStarted(true);
    setError(null);
    const issue = getSignUpPasswordIssue(password);
    if (!password || issue) return;
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    void createClient().auth.signOut();
  }

  if (ready === "check") {
    return <p className="text-sm text-zinc-600">Loadingâ€¦</p>;
  }

  if (ready === "no") {
    return (
      <p className="text-sm text-red-600" role="alert">
        {t("updatePasswordNoSession")}{" "}
        <Link href="/forgot-password" className="font-medium underline">
          {t("forgotPasswordTitle")}
        </Link>
        {" Â· "}
        <Link href="/login" className="font-medium underline">
          {t("signIn")}
        </Link>
      </p>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-brand-700" role="status">
          {t("updatePasswordSuccess")}
        </p>
        <Link
          href="/login?reset=1"
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white"
        >
          {t("updatePasswordGoToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-zinc-600">{t("updatePasswordSubtitle")}</p>
      <div>
        <label
          htmlFor="new-password"
          className="text-sm font-medium text-zinc-700"
        >
          {t("password")}
        </label>
        <div className="mt-1">
          <AuthPasswordField
            id="new-password"
            name="new_password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (!started) setStarted(true);
            }}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
            hasError={Boolean(passwordError)}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "new-pw-err" : undefined}
          />
        </div>
        <PasswordRuleChecklist status={rules} />
        {passwordError ? (
          <p id="new-pw-err" className="mt-2 text-sm text-red-600" role="status">
            {passwordError}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? t("updatePasswordSaving") : t("updatePasswordSave")}
      </button>
    </form>
  );
}
