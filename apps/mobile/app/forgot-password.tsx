import { useState } from "react";
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

import { FormField } from "../src/components/FormField";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { isValidEmailFormat } from "../src/lib/credential-validation";
import { getPasswordResetRedirectUrl } from "../src/lib/auth-redirect";
import { getPrivacyPolicyUrl } from "../src/lib/privacy-config";
import { supabase } from "../src/lib/supabase";
import { ErrorBannerWithSupport } from "../src/components/ErrorBannerWithSupport";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const emailError = started
    ? (() => {
        const s = email.trim();
        if (s.length === 0) return "Enter your email address.";
        if (!isValidEmailFormat(email)) return "Enter a valid email address.";
        return null;
      })()
    : null;

  const onSubmit = async () => {
    setStarted(true);
    setError(null);
    if (!isValidEmailFormat(email) || !email.trim()) return;
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    setLoading(false);
    if (err) {
      const m = err.message.toLowerCase();
      if (m.includes("rate") || m.includes("limit")) {
        setError("Too many attempts. Wait a minute and try again.");
      } else {
        setError(err.message.slice(0, 200));
      }
      return;
    }
    setDone(true);
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
          <Pressable onPress={() => router.back()} className="mb-4 self-start py-2" hitSlop={12}>
            <Text className="text-base text-emerald-500">Back</Text>
          </Pressable>
          <Text className="text-3xl font-bold text-neutral-100">Reset password</Text>
          <Text className="mt-2 text-base text-neutral-500">
            We&apos;ll email you a link to choose a new password. You&apos;ll complete the reset in
            your browser.
          </Text>
          {done ? (
            <View className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3">
              <Text className="text-sm text-emerald-300">
                If that email is registered, you&apos;ll get a link shortly. Check your inbox and
                spam folder, then open the link on this device or any browser.
              </Text>
            </View>
          ) : (
            <>
              <View className="mt-8">
                <FormField
                  label="Email"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (!started) setStarted(true);
                    setError(null);
                  }}
                  placeholder="you@store.com"
                  keyboardType="email-address"
                  error={emailError}
                />
              </View>
              {error ? (
                <View className="mt-2">
                  <ErrorBannerWithSupport message={error} variant="compact" />
                </View>
              ) : null}
              <PrimaryButton
                label="Send reset link"
                onPress={() => void onSubmit()}
                loading={loading}
              />
            </>
          )}
          <Link href="/login" asChild>
            <Pressable className="mt-6">
              <Text className="text-center text-sm text-emerald-400">Back to sign in</Text>
            </Pressable>
          </Link>
          {getPrivacyPolicyUrl() ? (
            <Pressable
              onPress={() => void Linking.openURL(getPrivacyPolicyUrl())}
              className="mt-8 self-center py-2 active:opacity-80"
            >
              <Text className="text-center text-xs text-neutral-500 underline">Privacy policy</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
