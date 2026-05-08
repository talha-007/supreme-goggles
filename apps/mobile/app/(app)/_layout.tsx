import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

import { FloatingTabBar } from "../../src/components/FloatingTabBar";
import { SupportHeaderButton } from "../../src/components/SupportHeaderButton";
import { RealtimeUpdateBanner } from "../../src/components/RealtimeUpdateBanner";
import { useAuth } from "../../src/contexts/auth-context";
import { RealtimeNotificationsProvider } from "../../src/contexts/realtime-notifications-context";

type IonName = ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<string, { active: IonName; inactive: IonName }> = {
  dashboard: { active: "home", inactive: "home-outline" },
  invoices: { active: "document-text", inactive: "document-text-outline" },
  products: { active: "cube", inactive: "cube-outline" },
  customers: { active: "people", inactive: "people-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
};

export default function AppGroupLayout() {
  const { session, loading, hasBusiness, subscriptionAccess } = useAuth();

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

  if (!subscriptionAccess) {
    return <Redirect href="/subscription-expired" />;
  }

  return (
    <RealtimeNotificationsProvider>
      <View className="flex-1 bg-neutral-950">
        <RealtimeUpdateBanner />
        <Tabs
      initialRouteName="dashboard"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: "#171717" },
        headerTintColor: "#fafafa",
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
        headerRight: () => (
          <View className="mr-1">
            <SupportHeaderButton />
          </View>
        ),
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: "#34d399",
        tabBarInactiveTintColor: "#737373",
        tabBarShowLabel: true,
        tabBarAllowFontScaling: false,
        /** Shorter strings + bounded width so labels ellipsize instead of spilling past the pill. */
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          width: "100%",
          textAlign: "center",
        },
        /** Let BottomTabBar size itself; avoid position:absolute here (breaks layout / width on RN). */
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          paddingHorizontal: 2,
          paddingTop: Platform.OS === "ios" ? 4 : 2,
        },
        tabBarIcon: ({ color, focused, size }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          const iconSize = Math.min(size, 22);
          return (
            <Ionicons name={focused ? icons.active : icons.inactive} size={iconSize} color={color} />
          );
        },
      })}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarLabel: "Home" }} />
      <Tabs.Screen name="invoices" options={{ title: "Bill", tabBarLabel: "Bill" }} />
      <Tabs.Screen name="products" options={{ title: "Products", tabBarLabel: "Stock" }} />
      <Tabs.Screen name="customers" options={{ title: "Customers", tabBarLabel: "People" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarLabel: "More" }} />
      <Tabs.Screen name="analysis" options={{ href: null, title: "Insights" }} />
      <Tabs.Screen name="privacy-policy" options={{ href: null, title: "Privacy policy" }} />
      <Tabs.Screen name="quick-sale" options={{ href: null, title: "Quick sale" }} />
      <Tabs.Screen name="suppliers" options={{ href: null, title: "Suppliers" }} />
      <Tabs.Screen name="purchase-orders" options={{ href: null, title: "Purchase orders" }} />
        </Tabs>
      </View>
    </RealtimeNotificationsProvider>
  );
}
