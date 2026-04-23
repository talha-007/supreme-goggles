import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorBannerWithSupport } from "../src/components/ErrorBannerWithSupport";
import { FormField } from "../src/components/FormField";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useAuth } from "../src/contexts/auth-context";
import { getPrivacyPolicyUrl } from "../src/lib/privacy-config";
import { supabase } from "../src/lib/supabase";

export default function LoginScreen() {
  const { session, hasBusiness, subscriptionAccess, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (session && hasBusiness && !subscriptionAccess) router.replace("/subscription-expired");
    else if (session && hasBusiness) router.replace("/dashboard");
    else if (session && !hasBusiness) router.replace("/onboarding");
  }, [session, hasBusiness, subscriptionAccess, authLoading]);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    /** AuthProvider holds global routing until membership + subscription resolve (see signInRoutingHold). */
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow px-6 pb-8 pt-4"
        >
          <Text className="text-3xl font-bold text-neutral-100">Welcome back</Text>
          <Text className="mt-2 text-base text-neutral-500">
            Sign in to your store account
          </Text>

          <View className="mt-10">
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@store.com"
              keyboardType="email-address"
            />
            <FormField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </View>

          {error ? (
            <View className="mt-2">
              <ErrorBannerWithSupport message={error} variant="compact" />
            </View>
          ) : null}

          <Pressable className="self-end py-2">
            <Text className="text-sm font-medium text-emerald-500">Forgot password?</Text>
          </Pressable>

          <PrimaryButton label="Sign in" onPress={onSubmit} loading={loading} />

          <View className="mt-10 flex-row flex-wrap items-center justify-center gap-1">
            <Text className="text-center text-neutral-500">New here?</Text>
            <Link href="/signup" asChild>
              <Pressable>
                <Text className="text-center text-base font-semibold text-emerald-400">
                  Create an account
                </Text>
              </Pressable>
            </Link>
          </View>
          {getPrivacyPolicyUrl() ? (
            <Pressable
              onPress={() => void Linking.openURL(getPrivacyPolicyUrl())}
              className="mt-8 self-center py-2 active:opacity-80"
              accessibilityRole="link"
              accessibilityLabel="Privacy policy"
            >
              <Text className="text-center text-xs text-neutral-500 underline">Privacy policy</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
