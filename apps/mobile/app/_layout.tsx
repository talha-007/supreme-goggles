import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppErrorBoundary } from "../src/components/AppErrorBoundary";
import { AuthProvider } from "../src/contexts/auth-context";
import { ThemeProvider, useTheme } from "../src/contexts/theme-context";

function ThemedStack() {
  const { resolved } = useTheme();
  const bg = resolved === "dark" ? "#0a0a0b" : "#f4f4f5";
  return (
    <>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={({ route }) => ({
          headerShown: false,
          contentStyle: { backgroundColor: bg },
          animation: route.name === "index" ? "fade" : "slide_from_right",
          gestureEnabled: true,
        })}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <AppErrorBoundary>
            <ThemedStack />
          </AppErrorBoundary>
        </SafeAreaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
