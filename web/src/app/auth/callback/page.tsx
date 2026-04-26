"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Same-origin relative paths only (avoid open redirects). */
function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  // Legacy: forgot password used a non-existent /auth/* path; real route is /update-password.
  if (next === "/auth/update-password") {
    return "/update-password";
  }
  return next;
}

function recoveryDefaultPath(url: URL): string | null {
  const t = url.searchParams.get("type");
  if (t === "recovery") return "/update-password";
  const hash = url.hash?.replace(/^#/, "") ?? "";
  if (hash) {
    const h = new URLSearchParams(hash);
    if (h.get("type") === "recovery") return "/update-password";
  }
  return null;
}

function tryHashSession(url: URL) {
  const hash = window.location.hash?.replace(/^#/, "") ?? "";
  if (!hash) return null;
  const hp = new URLSearchParams(hash);
  const access_token = hp.get("access_token");
  const refresh_token = hp.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token, cleanPath: `${url.pathname}${url.search}` };
}

/**
 * React 18 Strict Mode in development runs `useEffect` twice. PKCE
 * `exchangeCodeForSession` is not idempotent: the second call can log
 * AuthPKCECodeVerifierMissingError even when the first run succeeded and you
 * end up logged in.
 */
const authCallbackInFlight = new Map<string, Promise<void>>();

function runCallbackOnce(key: string, work: () => Promise<void>): Promise<void> {
  const existing = authCallbackInFlight.get(key);
  if (existing) return existing;
  const p = work().finally(() => {
    authCallbackInFlight.delete(key);
  });
  authCallbackInFlight.set(key, p);
  return p;
}

/**
 * Email confirmation and OAuth run in the browser. Hash fragments (#access_token=…)
 * are not sent to the server.
 *
 * Order matters: implicit / mobile sign-up uses hash tokens; PKCE `?code=` needs the
 * same browser that started sign-up (verifier). Process hash before `code`.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"working" | "done">("working");

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const oauthError = url.searchParams.get("error");
      const oauthDescription = url.searchParams.get("error_description");

      if (oauthError) {
        const login = new URL("/login", url.origin);
        login.searchParams.set("error", "oauth");
        if (oauthDescription) {
          login.searchParams.set("details", oauthDescription.slice(0, 200));
        }
        window.location.replace(login.toString());
        return;
      }

      const nextRaw = url.searchParams.get("next");
      const nextPath =
        nextRaw != null && nextRaw !== ""
          ? safeNextPath(nextRaw)
          : recoveryDefaultPath(url) ?? safeNextPath(null);
      const code = url.searchParams.get("code");
      const token_hash = url.searchParams.get("token_hash");
      const otpType = url.searchParams.get("type");

      const fromHash = tryHashSession(url);
      if (fromHash) {
        const { error } = await supabase.auth.setSession({
          access_token: fromHash.access_token,
          refresh_token: fromHash.refresh_token,
        });
        if (!error) {
          window.history.replaceState(null, "", fromHash.cleanPath);
          setStatus("done");
          router.replace(nextPath);
          return;
        }
        console.error("[auth/callback] setSession (hash)", error);
      }

      if (token_hash && otpType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: otpType as import("@supabase/supabase-js").EmailOtpType,
        });
        if (!error) {
          setStatus("done");
          router.replace(nextPath);
          return;
        }
        console.error("[auth/callback] verifyOtp", error);
        router.replace("/login?error=auth");
        return;
      }

      if (code) {
        await runCallbackOnce(`code:${code}`, async () => {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            setStatus("done");
            router.replace(nextPath);
            return;
          }
          console.error("[auth/callback] exchangeCodeForSession", error);
          const name = error.name ?? "";
          const isPkce =
            name.includes("PKCE") ||
            (typeof error.message === "string" && error.message.includes("code verifier"));
          if (isPkce) {
            router.replace(
              "/login?error=auth&reason=crossdevice",
            );
            return;
          }
          router.replace("/login?error=auth");
        });
        return;
      }

      router.replace("/login?error=auth");
    };

    void run();
  }, [router]);

  if (status === "done") {
    return null;
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Signing you in…</p>
    </div>
  );
}
