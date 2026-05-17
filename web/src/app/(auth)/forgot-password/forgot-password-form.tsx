"use client";

import { createPasswordResetRequestClient } from "@/lib/supabase/email-auth-client";
import { isValidEmailFormat } from "@/lib/auth/credential-validation";
import { getLoginErrorTranslationId } from "@/lib/auth/map-login-error";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const emailError = started && (() => {
    const s = email.trim();
    if (s.length === 0) return t("loginFieldEmailRequired");
    if (!isValidEmailFormat(email)) return t("invalidEmail");
    return null;
  })();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStarted(true);
    setError(null);
    if (!isValidEmailFormat(email) || email.trim() === "") return;
    setLoading(true);
    const supabase = createPasswordResetRequestClient();
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const next = encodeURIComponent("/update-password");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin.replace(/\/$/, "")}/auth/callback?next=${next}`,
    });
    setLoading(false);
    if (err) {
      const mapped = getLoginErrorTranslationId(err);
      if (mapped.id === "unknown" && "params" in mapped) {
        setError(t("loginError.unknown", { message: mapped.params.message }));
        return;
      }
      switch (mapped.id) {
        case "rateLimited":
        case "network":
          setError(t(`loginError.${mapped.id}`));
          return;
        default:
          setError(t("loginError.unknown", { message: err.message.slice(0, 120) }));
          return;
      }
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-brand-700" role="status">
          {t("forgotPasswordCheckEmail")}
        </p>
        <Link
          href="/login"
          className="text-center text-sm font-medium text-zinc-900 underline"
        >
          {t("forgotPasswordBackToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="forgot-email" className="text-sm font-medium text-zinc-700">
          {t("email")}
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
            if (!started) setStarted(true);
          }}
          className={`rounded-lg border bg-white px-3 py-2 text-zinc-900 outline-none focus:ring-2 ${
            emailError
              ? "border-red-500 focus:ring-red-400/40"
              : "border-zinc-200"
          }`}
        />
        {emailError ? (
          <p className="text-sm text-red-600" role="status" aria-live="polite">
            {emailError}
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
        {loading ? t("forgotPasswordSending") : t("forgotPasswordSend")}
      </button>
      <Link
        href="/login"
        className="text-center text-sm text-zinc-600 underline"
      >
        {t("forgotPasswordBackToLogin")}
      </Link>
    </form>
  );
}
