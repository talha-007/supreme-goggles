import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { BRAND_ACCENT_HEX } from "../../src/theme/brand";

import { FloatingTabBar } from "../../src/components/FloatingTabBar";
import { SupportHeaderButton } from "../../src/components/SupportHeaderButton";
import { RealtimeUpdateBanner } from "../../src/components/RealtimeUpdateBanner";
import { useAuth } from "../../src/contexts/auth-context";
import { RealtimeNotificationsProvider } from "../../src/contexts/realtime-notifications-context";
import { useTheme } from "../../src/contexts/theme-context";
import {
  headerSurfaceStyle,
  headerTint,
  screenRootClass,
  tabBarInactiveTint,
} from "../../src/theme/semantic";

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
  const { resolved } = useTheme();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!hasBusiness) {
      router.replace("/onboarding");
      return;
    }
    if (!subscriptionAccess) {
      router.replace("/subscription-expired");
    }
  }, [loading, session, hasBusiness, subscriptionAccess]);

  return (
    <RealtimeNotificationsProvider>
      <View className={`${screenRootClass(resolved)} flex-1`}>
        <RealtimeUpdateBanner />
        <Tabs
      initialRouteName="dashboard"
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: headerSurfaceStyle(resolved),
        headerTintColor: headerTint(resolved),
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
        headerRight: () => (
          <View className="mr-1">
            <SupportHeaderButton />
          </View>
        ),
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: BRAND_ACCENT_HEX,
        tabBarInactiveTintColor: tabBarInactiveTint(resolved),
        tabBarShowLabel: true,
        tabBarAllowFontScaling: false,
        /** Shorter strings + bounded width so labels ellipsize instead of spilling past the pill. */
        tabBarLabelStyle: {
          fontSize: 11,
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
          height: 62,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 8 : 6,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          paddingHorizontal: 4,
          paddingTop: 0,
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
      <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarLabel: "Home", headerBackVisible: false, gestureEnabled: false }} />
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
        {loading ? (
          <View style={styles.authOverlay} className={`${screenRootClass(resolved)} items-center justify-center`}>
            <ActivityIndicator size="large" color={BRAND_ACCENT_HEX} />
          </View>
        ) : null}
      </View>
    </RealtimeNotificationsProvider>
  );
}

const styles = StyleSheet.create({
  authOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
});
