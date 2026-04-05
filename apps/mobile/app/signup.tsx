import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
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
import { useAuth } from "../src/contexts/auth-context";
import { getEmailRedirectUrl } from "../src/lib/auth-redirect";
import { supabase } from "../src/lib/supabase";

export default function SignupScreen() {
  const { session, hasBusiness, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (session && hasBusiness) router.replace("/dashboard");
    else if (session && !hasBusiness) router.replace("/onboarding");
  }, [session, hasBusiness, authLoading]);

  const onSubmit = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getEmailRedirectUrl() },
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
        setError(
          "This email is already registered. Sign in instead, or use Forgot password if needed.",
        );
      } else {
        setError(err.message);
      }
      return;
    }
    if (!data.user) {
      setError(
        "This email is already registered. Sign in instead, or use Forgot password if needed.",
      );
      return;
    }
    const identities = data.user.identities ?? [];
    if (identities.length === 0) {
      setError(
        "This email is already registered. Sign in instead, or use Forgot password if needed.",
      );
      return;
    }
    setMessage("Check your email to confirm your account, then sign in.");
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
          <View className="mb-4 flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="rounded-lg py-2 pr-4"
            >
              <Text className="text-base text-emerald-500">Back</Text>
            </Pressable>
          </View>

          <Text className="text-3xl font-bold text-neutral-100">Create account</Text>
          <Text className="mt-2 text-base text-neutral-500">
            Create your account with email and password
          </Text>

          <View className="mt-8">
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
              placeholder="At least 6 characters"
              secureTextEntry
            />
          </View>

          {error ? (
            <Text className="mt-2 text-sm text-red-400" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {message ? (
            <Text className="mt-2 text-sm text-emerald-400" accessibilityRole="text">
              {message}
            </Text>
          ) : null}

          <PrimaryButton label="Create account" onPress={onSubmit} loading={loading} />

          <View className="mt-10 flex-row flex-wrap items-center justify-center gap-1">
            <Text className="text-center text-neutral-500">Already have an account?</Text>
            <Link href="/login" asChild>
              <Pressable>
                <Text className="text-center text-base font-semibold text-emerald-400">
                  Sign in
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
