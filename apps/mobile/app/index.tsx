import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { BRAND_ACCENT_HEX } from "../src/theme/brand";

import { INTRO_KEY, useAuth } from "../src/contexts/auth-context";
import { IntroSlides } from "../src/components/IntroSlides";
import { useTheme } from "../src/contexts/theme-context";
import { screenRootClass } from "../src/theme/semantic";

type Phase = "boot" | "slides" | "routing";

export default function IndexScreen() {
  const { session, hasBusiness, subscriptionAccess, loading: authLoading } = useAuth();
  const { resolved } = useTheme();
  const [phase, setPhase] = useState<Phase>("boot");

  useEffect(() => {
    AsyncStorage.getItem(INTRO_KEY).then((v) => {
      setPhase(v === "1" ? "routing" : "slides");
    });
  }, []);

  useEffect(() => {
    if (phase !== "routing") return;
    if (authLoading) return;
    if (session && hasBusiness && !subscriptionAccess) {
      router.replace("/subscription-expired");
      return;
    }
    if (session && hasBusiness) {
      router.replace("/dashboard");
      return;
    }
    if (session && !hasBusiness) {
      router.replace("/onboarding");
      return;
    }
    router.replace("/login");
  }, [phase, authLoading, session, hasBusiness, subscriptionAccess]);

  const finishIntro = async () => {
    await AsyncStorage.setItem(INTRO_KEY, "1");
    router.replace("/login");
  };

  if (phase === "boot") {
    return (
      <View className={`${screenRootClass(resolved)} items-center justify-center`}>
        <ActivityIndicator size="large" color={BRAND_ACCENT_HEX} />
      </View>
    );
  }

  if (phase === "slides") {
    return <IntroSlides onDone={finishIntro} />;
  }

  return (
    <View className={`${screenRootClass(resolved)} items-center justify-center`}>
      <ActivityIndicator size="large" color={BRAND_ACCENT_HEX} />
    </View>
  );
}
