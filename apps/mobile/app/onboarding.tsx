import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "../src/components/BrandMark";
import { ErrorBannerWithSupport } from "../src/components/ErrorBannerWithSupport";
import { FormField } from "../src/components/FormField";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useAuth } from "../src/contexts/auth-context";
import { useTheme } from "../src/contexts/theme-context";
import { supabase } from "../src/lib/supabase";
import {
  chipInactiveBorder,
  screenRootClass,
  textBodyClass,
  textFieldLabelClass,
  textMutedClass,
  textPageTitleClass,
} from "../src/theme/semantic";

const BUSINESS_TYPES = [
  { value: "shop" as const, label: "Shop" },
  { value: "retailer" as const, label: "Retailer" },
  { value: "wholesaler" as const, label: "Wholesaler" },
];

export default function OnboardingScreen() {
  const { session, hasBusiness, subscriptionAccess, loading: authLoading, refreshMembership } = useAuth();
  const { resolved } = useTheme();
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof BUSINESS_TYPES)[number]["value"]>("shop");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) router.replace("/login");
    else if (hasBusiness && !subscriptionAccess) router.replace("/subscription-expired");
    else if (hasBusiness) router.replace("/dashboard");
  }, [session, hasBusiness, subscriptionAccess, authLoading]);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.rpc("create_business_with_owner", {
      p_name: name.trim(),
      p_type: type,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    await refreshMembership();
    router.replace("/dashboard");
  };

  return (
    <SafeAreaView className={screenRootClass(resolved)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow px-6 pb-8 pt-4"
        >
          <View className="mb-6 items-center">
            <BrandMark size={72} />
          </View>
          <Text className={`text-2xl font-semibold ${textPageTitleClass(resolved)}`}>Your business</Text>
          <Text className={`mt-1 text-sm ${textMutedClass(resolved)}`}>
            Add your store name and type to finish setup.
          </Text>

          <View className="mt-8">
            <FormField
              label="Business name"
              value={name}
              onChangeText={setName}
              placeholder="Acme Retail"
              autoCapitalize="sentences"
            />
          </View>

          <Text className={`mb-2 mt-2 text-sm font-medium ${textFieldLabelClass(resolved)}`}>Business type</Text>
          <View className="gap-2">
            {BUSINESS_TYPES.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setType(opt.value)}
                className={`flex-row items-center rounded-xl border px-4 py-3 ${
                  type === opt.value ? "border-brand-500 bg-brand-500/10" : chipInactiveBorder(resolved)
                }`}
              >
                <View
                  className={`mr-3 h-4 w-4 rounded-full border-2 ${
                    type === opt.value
                      ? "border-brand-500 bg-brand-500"
                      : resolved === "dark"
                        ? "border-neutral-600"
                        : "border-zinc-400"
                  }`}
                />
                <Text className={`text-base ${textBodyClass(resolved)}`}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {error ? (
            <View className="mt-4">
              <ErrorBannerWithSupport message={error} variant="compact" />
            </View>
          ) : null}

          <PrimaryButton label="Continue" onPress={onSubmit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
