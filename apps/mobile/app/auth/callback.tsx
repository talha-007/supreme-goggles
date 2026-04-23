import { useCallback, useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { supabase } from "../../src/lib/supabase";

function getQueryValue(q: Linking.ParsedURL["queryParams"] | null, key: string): string | null {
  if (!q) return null;
  const v = q[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return null;
}

function tryHashSession(url: string) {
  const hash = url.split("#")[1];
  if (!hash) return null;
  const hp = new URLSearchParams(hash);
  const access_token = hp.get("access_token");
  const refresh_token = hp.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

/**
 * Process Supabase email / OAuth return URLs. Same order as `web` `/auth/callback`: hash, then
 * `token_hash`+`type`, then `code` (PKCE).
 */
async function processAuthUrlOnce(url: string | null) {
  if (!url) return;
  const parsed = Linking.parse(url);

  const oauthError = getQueryValue(parsed.queryParams, "error");
  if (oauthError) {
    const details = getQueryValue(parsed.queryParams, "error_description");
    if (typeof details === "string" && details.length > 0) {
      router.replace(`/login?error=auth&details=${encodeURIComponent(details.slice(0, 200))}`);
    } else {
      router.replace("/login?error=auth");
    }
    return;
  }

  const fromHash = tryHashSession(url);
  if (fromHash) {
    const { error } = await supabase.auth.setSession({
      access_token: fromHash.access_token,
      refresh_token: fromHash.refresh_token,
    });
    if (!error) {
      router.replace("/");
      return;
    }
  }

  const token_hash = getQueryValue(parsed.queryParams, "token_hash");
  const type = getQueryValue(parsed.queryParams, "type");
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as import("@supabase/supabase-js").EmailOtpType,
    });
    if (!error) {
      router.replace("/");
      return;
    }
    router.replace("/login?error=auth");
    return;
  }

  const code = getQueryValue(parsed.queryParams, "code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      router.replace("/");
      return;
    }
    const name = error.name ?? "";
    const isPkce =
      name.includes("PKCE") ||
      (typeof error.message === "string" && error.message.includes("code verifier"));
    if (isPkce) {
      router.replace("/login?error=auth&reason=crossdevice");
    } else {
      router.replace("/login?error=auth");
    }
    return;
  }

  router.replace("/login?error=auth");
}

export default function AuthCallbackScreen() {
  const lastHandled = useRef<string | null>(null);
  const linkingUrl = Linking.useLinkingURL();

  const run = useCallback(async (url: string | null) => {
    if (!url || lastHandled.current === url) return;
    lastHandled.current = url;
    await processAuthUrlOnce(url);
  }, []);

  useEffect(() => {
    void run(linkingUrl);
  }, [linkingUrl, run]);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    void (async () => {
      const initial = await Linking.getInitialURL();
      await run(initial);
      sub = Linking.addEventListener("url", (e) => {
        void run(e.url);
      });
    })();
    return () => {
      sub?.remove();
    };
  }, [run]);

  return (
    <View className="flex-1 items-center justify-center bg-neutral-950 px-6">
      <ActivityIndicator size="large" color="#34d399" />
      <Text className="mt-4 text-center text-sm text-neutral-500">Signing you in…</Text>
    </View>
  );
}
