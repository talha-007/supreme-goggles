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

import { FormField } from "../src/components/FormField";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { useAuth } from "../src/contexts/auth-context";
import { supabase } from "../src/lib/supabase";

const BUSINESS_TYPES = [
  { value: "shop" as const, label: "Shop" },
  { value: "retailer" as const, label: "Retailer" },
  { value: "wholesaler" as const, label: "Wholesaler" },
];

export default function OnboardingScreen() {
  const { session, hasBusiness, loading: authLoading, refreshMembership } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof BUSINESS_TYPES)[number]["value"]>("shop");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) router.replace("/login");
    else if (hasBusiness) router.replace("/dashboard");
  }, [session, hasBusiness, authLoading]);

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
    <SafeAreaView className="flex-1 bg-neutral-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="flex-grow px-6 pb-8 pt-4"
        >
          <Text className="text-2xl font-semibold text-neutral-100">Your business</Text>
          <Text className="mt-1 text-sm text-neutral-500">
            Same onboarding as the web app — create your business and owner membership.
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

          <Text className="mb-2 mt-2 text-sm font-medium text-neutral-300">Business type</Text>
          <View className="gap-2">
            {BUSINESS_TYPES.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setType(opt.value)}
                className={`flex-row items-center rounded-xl border px-4 py-3 ${
                  type === opt.value
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-neutral-800 bg-neutral-900"
                }`}
              >
                <View
                  className={`mr-3 h-4 w-4 rounded-full border-2 ${
                    type === opt.value ? "border-emerald-500 bg-emerald-500" : "border-neutral-600"
                  }`}
                />
                <Text className="text-base text-neutral-200">{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {error ? (
            <Text className="mt-4 text-sm text-red-400" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <PrimaryButton label="Continue to dashboard" onPress={onSubmit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
