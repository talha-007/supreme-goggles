import { Ionicons } from "@expo/vector-icons";
import { useLayoutEffect } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "expo-router";

import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";
import {
  getPrivacyPolicyUrl,
  IN_APP_DATA_PROCESSING_SUMMARY,
  PRIVACY_POLICY_EFFECTIVE_DATE,
  PRIVACY_POLICY_SECTIONS,
} from "../../src/lib/privacy-config";
import { useTheme } from "../../src/contexts/theme-context";
import {
  scrollCanvasClass,
  textMutedClass,
  textPageTitleClass,
  textSubtleClass,
} from "../../src/theme/semantic";

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const bottomPad = useTabScreenBottomPadding();
  const hostedPolicyUrl = getPrivacyPolicyUrl();
  const { resolved } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Privacy policy" });
  }, [navigation]);

  return (
    <ScrollView
      className={`${scrollCanvasClass(resolved)} px-4 pt-4`}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className={`text-xs font-medium uppercase tracking-wide ${textMutedClass(resolved)}`}>
        Effective {PRIVACY_POLICY_EFFECTIVE_DATE}
      </Text>

      <Text className={`mt-4 text-base font-semibold ${textPageTitleClass(resolved)}`}>Summary</Text>
      <Text className={`mt-2 text-sm leading-6 ${textSubtleClass(resolved)}`}>{IN_APP_DATA_PROCESSING_SUMMARY}</Text>

      {PRIVACY_POLICY_SECTIONS.map((section) => (
        <View key={section.title} className="mt-8">
          <Text className={`text-base font-semibold ${textPageTitleClass(resolved)}`}>{section.title}</Text>
          <Text className={`mt-2 text-sm leading-6 ${textSubtleClass(resolved)}`}>{section.body}</Text>
        </View>
      ))}

      {hostedPolicyUrl ? (
        <Pressable
          onPress={() => void Linking.openURL(hostedPolicyUrl)}
          accessibilityRole="link"
          accessibilityLabel="Open hosted privacy policy in browser"
          className="mt-10 flex-row items-center justify-between gap-3 rounded-xl border border-sky-900/50 bg-sky-950/35 px-4 py-3.5 active:opacity-90"
        >
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-sky-400">Hosted privacy policy</Text>
            <Text className={`mt-0.5 text-xs ${textMutedClass(resolved)}`} numberOfLines={2}>
              {hostedPolicyUrl}
            </Text>
          </View>
          <Ionicons name="open-outline" size={22} color="#38bdf8" />
        </Pressable>
      ) : null}

      <View className="h-8" />
    </ScrollView>
  );
}
