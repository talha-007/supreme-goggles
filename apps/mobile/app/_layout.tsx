import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "../src/contexts/auth-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={({ route }) => ({
            headerShown: false,
            contentStyle: { backgroundColor: "#0a0a0b" },
            animation: route.name === "index" ? "fade" : "slide_from_right",
            gestureEnabled: true,
          })}
        />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
