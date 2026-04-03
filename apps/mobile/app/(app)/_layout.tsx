import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";

import { useAuth } from "../../src/contexts/auth-context";

export default function AppGroupLayout() {
  const { session, loading, hasBusiness } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <ActivityIndicator size="large" color="#34d399" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!hasBusiness) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#171717" },
        headerTintColor: "#fafafa",
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#0a0a0b" },
        animation: "slide_from_right",
      }}
    />
  );
}
