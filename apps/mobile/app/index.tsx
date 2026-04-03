import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";

import { INTRO_KEY, useAuth } from "../src/contexts/auth-context";
import { IntroSlides } from "../src/components/IntroSlides";

type Phase = "boot" | "slides" | "routing";

export default function IndexScreen() {
  const { session, hasBusiness, loading: authLoading } = useAuth();
  const [phase, setPhase] = useState<Phase>("boot");

  useEffect(() => {
    AsyncStorage.getItem(INTRO_KEY).then((v) => {
      setPhase(v === "1" ? "routing" : "slides");
    });
  }, []);

  useEffect(() => {
    if (phase !== "routing") return;
    if (authLoading) return;
    if (session && hasBusiness) {
      router.replace("/dashboard");
      return;
    }
    if (session && !hasBusiness) {
      router.replace("/onboarding");
      return;
    }
    router.replace("/login");
  }, [phase, authLoading, session, hasBusiness]);

  const finishIntro = async () => {
    await AsyncStorage.setItem(INTRO_KEY, "1");
    router.replace("/login");
  };

  if (phase === "boot") {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-950">
        <ActivityIndicator size="large" color="#34d399" />
      </View>
    );
  }

  if (phase === "slides") {
    return <IntroSlides onDone={finishIntro} />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-neutral-950">
      <ActivityIndicator size="large" color="#34d399" />
    </View>
  );
}
