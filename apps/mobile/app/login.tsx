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
import { Link, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { ErrorBannerWithSupport } from "../src/components/ErrorBannerWithSupport";
import { FormField } from "../src/components/FormField";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useAuth } from "../src/contexts/auth-context";
import { isValidEmailFormat } from "../src/lib/credential-validation";
import { LOGIN_FAILED_CREDENTIALS } from "../src/lib/login-hints";
import { getLoginErrorTranslationId, LOGIN_ERROR_MESSAGE } from "../src/lib/map-login-error";
import { getPrivacyPolicyUrl } from "../src/lib/privacy-config";
import { supabase } from "../src/lib/supabase";

function loginEmailFieldMessage(email: string, started: boolean): string | null {
  if (!started) return null;
  const s = email.trim();
  if (s.length === 0) return "Enter your email address.";
  if (s.length < 4) return null;
  if (!s.includes("@") && s.length < 8) return null;
  if (!isValidEmailFormat(email)) return "Enter a valid email address.";
  return null;
}

export default function LoginScreen() {
  const { postSignup, error: errorParam, reason, details } = useLocalSearchParams<{
    postSignup?: string;
    error?: string;
    reason?: string;
    details?: string;
  }>();
  const { session, hasBusiness, subscriptionAccess, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldStarted, setFieldStarted] = useState({ email: false, password: false });
  const [credentialsRejected, setCredentialsRejected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (session && hasBusiness && !subscriptionAccess) router.replace("/subscription-expired");
    else if (session && hasBusiness) router.replace("/dashboard");
    else if (session && !hasBusiness) router.replace("/onboarding");
  }, [session, hasBusiness, subscriptionAccess, authLoading]);

  const emailFieldError = loginEmailFieldMessage(email, fieldStarted.email);
  const passwordFieldError = fieldStarted.password && password.length === 0 ? "Enter your password." : null;

  const onSubmit = async () => {
    setFieldStarted({ email: true, password: true });
    setCredentialsRejected(false);
    setError(null);
    if (!isValidEmailFormat(email) || !email.trim() || !password.length) return;
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      const mapped = getLoginErrorTranslationId(err);
      if (mapped.id === "unknown" && "params" in mapped) {
        setError(mapped.params.message);
        return;
      }
      if (mapped.id === "wrongEmailOrPassword") {
        setError(null);
        setCredentialsRejected(true);
        return;
      }
      setError(LOGIN_ERROR_MESSAGE[mapped.id]);
      return;
    }
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

          {postSignup === "1" ? (
            <View className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
              <Text className="text-sm text-emerald-300" accessibilityRole="text">
                Check your email to confirm your account, then sign in.
              </Text>
            </View>
          ) : null}

          {errorParam === "auth" && reason === "crossdevice" ? (
            <View className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <Text className="text-sm text-amber-200" accessibilityRole="text">
                This confirmation link is invalid or was opened in a different app than the one that
                started an older sign-up. Request a new confirmation email, or sign up again — then
                open the new link on this device.
              </Text>
            </View>
          ) : null}

          {errorParam === "auth" && errorParam && reason !== "crossdevice" ? (
            <View className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
              <Text className="text-sm text-rose-200" accessibilityRole="text">
                {typeof details === "string" && details.length > 0
                  ? decodeURIComponent(details)
                  : "We could not complete sign-in from that link. Try again or use Forgot password."}
              </Text>
            </View>
          ) : null}

          <View className="mt-10">
            <View>
              <FormField
                label="Email"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setFieldStarted((f) => ({ ...f, email: true }));
                  setCredentialsRejected(false);
                  setError(null);
                }}
                placeholder="you@store.com"
                keyboardType="email-address"
                error={emailFieldError}
              />
            </View>
            <View>
              <FormField
                label="Password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setFieldStarted((f) => ({ ...f, password: true }));
                  setCredentialsRejected(false);
                  setError(null);
                }}
                placeholder="••••••••"
                secureTextEntry
                showPasswordToggle
                error={passwordFieldError}
              />
            </View>
            <View className="flex-row justify-end">
              <Link href="/forgot-password" asChild>
                <Pressable hitSlop={8}>
                  <Text className="text-sm font-medium text-emerald-500">Forgot password?</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {credentialsRejected ? (
            <View className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <Text className="text-sm text-amber-200/90" accessibilityRole="text">
                {LOGIN_FAILED_CREDENTIALS}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View className="mt-2">
              <ErrorBannerWithSupport message={error} variant="compact" />
            </View>
          ) : null}

          <PrimaryButton label="Sign in" onPress={() => void onSubmit()} loading={loading} />

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
