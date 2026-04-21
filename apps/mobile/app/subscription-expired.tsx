import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../src/components/PrimaryButton";
import { useAuth } from "../src/contexts/auth-context";
import { openSupportWhatsApp } from "../src/lib/support-contact";

export default function SubscriptionExpiredScreen() {
  const { session, hasBusiness, loading: authLoading, subscriptionAccess, signOut } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!hasBusiness) {
      router.replace("/onboarding");
      return;
    }
    if (subscriptionAccess) {
      router.replace("/dashboard");
    }
  }, [session, hasBusiness, authLoading, subscriptionAccess]);

  if (authLoading || !session || !hasBusiness || subscriptionAccess) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-neutral-950">
        <Text className="text-sm text-neutral-500">Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-950 px-6 pt-4">
      <View className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/35 p-6">
        <Text className="text-xl font-semibold text-red-100">Subscription access expired</Text>
        <Text className="mt-3 text-sm leading-5 text-red-200/95">
          Your trial or subscription period has ended. Contact support or renew your plan to keep using the mobile
          app.
        </Text>
      </View>

      <View className="mt-8 gap-3">
        <PrimaryButton
          label="Message support (WhatsApp)"
          onPress={() =>
            void openSupportWhatsApp(
              "Hi — our shop account subscription shows expired in the POS app. Can you help us renew or fix access?",
            )
          }
        />
        <Pressable
          onPress={() => void signOut()}
          className="rounded-xl border border-neutral-600 bg-neutral-900 py-4 active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text className="text-center text-base font-semibold text-neutral-200">Sign out</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.replace("/login")} className="mt-6 py-3 active:opacity-80">
        <Text className="text-center text-base text-neutral-500">Back to sign in</Text>
      </Pressable>
    </SafeAreaView>
  );
}
