"use client";

import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { GoogleOauthButton } from "@/components/auth/google-oauth-button";
import { createClient } from "@/lib/supabase/client";
import { isValidEmailFormat } from "@/lib/auth/credential-validation";
import { getLoginErrorTranslationId } from "@/lib/auth/map-login-error";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

/**
 * OnChange: don’t show “invalid email” for very short or incomplete input while the user is still typing the local part.
 */
function loginEmailFieldMessage(
  email: string,
  fieldStarted: boolean,
  t: (key: string) => string,
): string | null {
  if (!fieldStarted) return null;
  const s = email.trim();
  if (s.length === 0) return t("loginFieldEmailRequired");
  if (s.length < 4) return null;
  if (!s.includes("@") && s.length < 8) return null;
  if (!isValidEmailFormat(email)) return t("invalidEmail");
  return null;
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const formId = useId();
  const emailErrorId = `${formId}-email-err`;
  const passwordErrorId = `${formId}-pw-err`;
  const credentialsFailId = `${formId}-cred-fail`;
  const serverErrorId = `${formId}-server-err`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldStarted, setFieldStarted] = useState({ email: false, password: false });
  const [credentialsRejected, setCredentialsRejected] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearAuthFeedback = () => {
    setServerError(null);
    setCredentialsRejected(false);
  };

  const emailFieldError = loginEmailFieldMessage(email, fieldStarted.email, t);
  const passwordFieldError: string | null = fieldStarted.password && password.length === 0
    ? t("loginFieldPasswordRequired")
    : null;

  const setEmailValue = (value: string) => {
    setEmail(value);
    clearAuthFeedback();
    setFieldStarted((f) => ({ ...f, email: true }));
  };

  const setPasswordValue = (value: string) => {
    setPassword(value);
    clearAuthFeedback();
    setFieldStarted((f) => ({ ...f, password: true }));
  };

  function applyServerErrorFromSupabase(mapped: ReturnType<typeof getLoginErrorTranslationId>) {
    if (mapped.id === "unknown" && "params" in mapped) {
      setCredentialsRejected(false);
      setServerError(t("loginError.unknown", { message: mapped.params.message }));
      return;
    }
    switch (mapped.id) {
      case "wrongEmailOrPassword":
        setServerError(null);
        setCredentialsRejected(true);
        return;
      case "emailNotConfirmed":
        setCredentialsRejected(false);
        setServerError(t("loginError.emailNotConfirmed"));
        return;
      case "rateLimited":
        setCredentialsRejected(false);
        setServerError(t("loginError.rateLimited"));
        return;
      case "network":
        setCredentialsRejected(false);
        setServerError(t("loginError.network"));
        return;
      case "userBanned":
        setCredentialsRejected(false);
        setServerError(t("loginError.userBanned"));
        return;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldStarted({ email: true, password: true });
    setCredentialsRejected(false);
    setServerError(null);
    if (!isValidEmailFormat(email) || email.trim() === "" || password.length === 0) {
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      applyServerErrorFromSupabase(getLoginErrorTranslationId(err));
      return;
    }
    router.push("/");
    router.refresh();
  }

  const hasEmailFormatError = Boolean(emailFieldError);
  const hasPasswordEmptyError = Boolean(passwordFieldError);
  const emailDescribedBy = hasEmailFormatError ? emailErrorId : undefined;
  const passwordDescribedBy = hasPasswordEmptyError ? passwordErrorId : undefined;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-3">
        <GoogleOauthButton
          label={t("googleContinue")}
          disabled={loading}
          onError={(msg) => {
            setCredentialsRejected(false);
            setServerError(msg);
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
          onChange={(e) => setEmailValue(e.target.value)}
          onBlur={() => setFieldStarted((f) => ({ ...f, email: true }))}
          aria-invalid={hasEmailFormatError}
          aria-describedby={emailDescribedBy || undefined}
          className={`rounded-lg border bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 ${
            hasEmailFormatError
              ? "border-red-500 focus:ring-red-400/40"
              : "border-zinc-200"
          }`}
        />
        {emailFieldError ? (
          <p
            id={emailErrorId}
            className="text-sm text-red-600"
            role="status"
            aria-live="polite"
          >
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPasswordValue(e.target.value);
          }}
          onBlur={() => setFieldStarted((f) => ({ ...f, password: true }))}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          hasError={hasPasswordEmptyError}
          aria-invalid={hasPasswordEmptyError}
          aria-describedby={passwordDescribedBy || undefined}
        />
        {passwordFieldError ? (
          <p
            id={passwordErrorId}
            className="text-sm text-red-600"
            role="status"
            aria-live="polite"
          >
            {passwordFieldError}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-zinc-600 underline"
          >
            {t("forgotPasswordLink")}
          </Link>
        </div>
      </div>
      {credentialsRejected ? (
        <p
          id={credentialsFailId}
          className="text-sm text-amber-800"
          role="status"
          aria-live="polite"
        >
          {t("loginFailedCredentials")}
        </p>
      ) : null}
      {serverError ? (
        <p id={serverErrorId} className="text-sm text-red-600" role="alert" aria-live="assertive">
          {serverError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? t("signingIn") : t("signIn")}
      </button>
      <p className="text-center text-sm text-zinc-600">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-medium text-zinc-900 underline">
          {t("signUp")}
        </Link>
      </p>
    </form>
  );
}
