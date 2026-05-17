"use client";

import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { GoogleOauthButton } from "@/components/auth/google-oauth-button";
import { createSignUpClient } from "@/lib/supabase/signup-client";
import { PasswordRuleChecklist } from "@/components/auth/password-rule-checklist";
import {
  getPasswordRulesStatus,
  getSignUpPasswordIssue,
  getSignupEmailIssue,
} from "@/lib/auth/credential-validation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

const PASSWORD_ERROR_KEY = {
  minLength: "passwordError.minLength",
  letter: "passwordError.letter",
  number: "passwordError.number",
  symbol: "passwordError.symbol",
} as const;

export function SignupForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldStarted, setFieldStarted] = useState({ email: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const emailIssue = fieldStarted.email ? getSignupEmailIssue(email) : null;
  const emailFieldError = emailIssue
    ? emailIssue === "empty"
      ? t("loginFieldEmailRequired")
      : emailIssue === "format"
        ? t("invalidEmail")
        : t("disposableEmailBlocked")
    : null;

  const rules = getPasswordRulesStatus(password);
  const passwordIssue = fieldStarted.password && password.length > 0 ? getSignUpPasswordIssue(password) : null;
  const passwordFieldError =
    fieldStarted.password && password.length === 0
      ? t("loginFieldPasswordRequired")
      : fieldStarted.password && passwordIssue
        ? t(PASSWORD_ERROR_KEY[passwordIssue])
        : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldStarted({ email: true, password: true });
    setError(null);
    setMessage(null);
    const eIssue = getSignupEmailIssue(email);
    if (eIssue) {
      setError(
        eIssue === "empty"
          ? t("loginFieldEmailRequired")
          : eIssue === "format"
            ? t("invalidEmail")
            : t("disposableEmailBlocked"),
      );
      return;
    }
    const pw = getSignUpPasswordIssue(password);
    if (pw) {
      setError(t(PASSWORD_ERROR_KEY[pw]));
      return;
    }
    setLoading(true);
    const supabase = createSignUpClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });
    setLoading(false);
    if (err) {
      const m = err.message.toLowerCase();
      if (
        m.includes("already") ||
        m.includes("registered") ||
        m.includes("exists") ||
        m.includes("user already")
      ) {
        setError(t("emailAlreadyRegistered"));
      } else {
        setError(err.message);
      }
      return;
    }
    if (!data.user) {
      setError(t("emailAlreadyRegistered"));
      return;
    }
    const identities = data.user.identities ?? [];
    if (identities.length === 0) {
      setError(t("emailAlreadyRegistered"));
      return;
    }
    setMessage(t("checkEmail"));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-3">
        <GoogleOauthButton
          label={t("googleContinue")}
          disabled={loading}
          onError={(msg) => {
            setError(msg);
            setMessage(null);
          }}
        />
        <p className="text-center text-xs text-zinc-500" aria-hidden>
          {t("continueWithEmail")}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldStarted((f) => ({ ...f, email: true }));
          }}
          onBlur={() => setFieldStarted((f) => ({ ...f, email: true }))}
          className={`rounded-lg border bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 ${
            emailFieldError
              ? "border-red-500 focus:ring-red-400/40"
              : "border-zinc-200"
          }`}
        />
        {emailFieldError ? (
          <p className="text-sm text-red-600" role="status" aria-live="polite">
            {emailFieldError}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          {t("password")}
        </label>
        <AuthPasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldStarted((f) => ({ ...f, password: true }));
          }}
          onBlur={() => setFieldStarted((f) => ({ ...f, password: true }))}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          hasError={Boolean(passwordFieldError)}
          aria-invalid={Boolean(passwordFieldError)}
        />
        <PasswordRuleChecklist status={rules} />
        {passwordFieldError ? (
          <p className="text-sm text-red-600" role="status" aria-live="polite">
            {passwordFieldError}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-brand-700" role="status">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? t("creatingAccount") : t("createAccount")}
      </button>
      <p className="text-center text-sm text-zinc-600">
        {t("hasAccount")}{" "}
        <Link href="/login" className="font-medium text-zinc-900 underline">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
