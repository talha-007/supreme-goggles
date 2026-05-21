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

import { FormField } from "../src/components/FormField";
import { PasswordRuleChecklist } from "../src/components/PasswordRuleChecklist";
import { PrimaryButton } from "../src/components/PrimaryButton";
import {
  getPasswordRulesStatus,
  getSignUpPasswordIssue,
  SIGNUP_PASSWORD_ERROR,
} from "../src/lib/credential-validation";
import { getPrivacyPolicyUrl } from "../src/lib/privacy-config";
import { supabase } from "../src/lib/supabase";
import { ErrorBannerWithSupport } from "../src/components/ErrorBannerWithSupport";
import { useTheme } from "../src/contexts/theme-context";
import {
  screenCenterRootClass,
  screenRootClass,
  textMutedClass,
  textPageTitleClass,
  textSubtleClass,
} from "../src/theme/semantic";

export default function UpdatePasswordScreen() {
  const { resolved } = useTheme();
  const [ready, setReady] = useState<"check" | "no" | "yes">("check");
  const [password, setPassword] = useState("");
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let a = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!a) return;
      if (data.session) setReady("yes");
      else setReady("no");
    })();
    return () => {
      a = false;
    };
  }, []);

  const rules = getPasswordRulesStatus(password);
  const pwIssue = getSignUpPasswordIssue(password);
  const fieldError = started
    ? password.length === 0
      ? "Enter your new password."
      : pwIssue
        ? SIGNUP_PASSWORD_ERROR[pwIssue]
        : null
    : null;

  const onSubmit = async () => {
    setStarted(true);
    setError(null);
    if (!password || getSignUpPasswordIssue(password)) return;
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    await supabase.auth.signOut();
    setSuccess(true);
  };

  if (ready === "check") {
    return (
      <SafeAreaView className={screenCenterRootClass(resolved)}>
        <Text className={textSubtleClass(resolved)}>Loading…</Text>
      </SafeAreaView>
    );
  }

  if (ready === "no") {
    return (
      <SafeAreaView className={`${screenRootClass(resolved)} px-6 pt-4`}>
        <Text className="text-sm text-rose-300">
          This reset link is invalid or expired. Open the link from the latest email, or request a
          new one from Forgot password.
        </Text>
        <Link href="/forgot-password" asChild>
          <Pressable className="mt-4">
            <Text className="text-brand-400">Forgot password</Text>
          </Pressable>
        </Link>
        <Link href="/login" asChild>
          <Pressable className="mt-2">
            <Text className={textSubtleClass(resolved)}>Sign in</Text>
          </Pressable>
        </Link>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView className={`${screenRootClass(resolved)} px-6 pt-4`}>
        <Text className="text-lg text-brand-300">Your password was updated. Sign in with the new one.</Text>
        <Pressable onPress={() => router.replace("/login")} className="mt-6">
          <Text className="text-center text-base font-semibold text-brand-400">Go to sign in</Text>
        </Pressable>
        {getPrivacyPolicyUrl() ? (
          <Pressable
            onPress={() => void Linking.openURL(getPrivacyPolicyUrl())}
            className="mt-8 self-center"
          >
            <Text className={`text-xs ${textMutedClass(resolved)} underline`}>Privacy policy</Text>
          </Pressable>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView className={screenRootClass(resolved)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow px-6 pb-8 pt-4" keyboardShouldPersistTaps="handled">
          <Text className={`text-3xl font-bold ${textPageTitleClass(resolved)}`}>New password</Text>
          <Text className={`mt-2 text-base ${textMutedClass(resolved)}`}>Choose a strong password for your account.</Text>
          <View className="mt-8">
            <FormField
              label="New password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setStarted(true);
              }}
              secureTextEntry
              showPasswordToggle
              error={fieldError}
            />
            <PasswordRuleChecklist status={rules} />
          </View>
          {error ? (
            <View className="mt-2">
              <ErrorBannerWithSupport message={error} variant="compact" />
            </View>
          ) : null}
          <PrimaryButton label="Save new password" onPress={() => void onSubmit()} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
