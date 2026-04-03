import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { supabase } from "../../src/lib/supabase";

async function handleAuthUrl(url: string | null) {
  if (!url) return;
  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;
  if (typeof code === "string") {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn("[auth/callback]", error.message);
    }
  }
}

export default function AuthCallbackScreen() {
  useEffect(() => {
    let alive = true;
    (async () => {
      const initial = await Linking.getInitialURL();
      await handleAuthUrl(initial);
      if (!alive) return;
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      if (data.session) {
        /** Let AuthProvider commit session before (app) layout reads useAuth(). */
        setTimeout(() => {
          router.replace("/dashboard");
        }, 0);
      } else {
        router.replace("/login");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-neutral-950 px-6">
      <ActivityIndicator size="large" color="#34d399" />
      <Text className="mt-4 text-center text-sm text-neutral-500">Signing you in…</Text>
    </View>
  );
}
