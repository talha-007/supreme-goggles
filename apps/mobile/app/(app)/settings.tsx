import { Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";

export default function SettingsPlaceholder() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Settings" });
  }, [navigation]);
  return (
    <View className="flex-1 items-center justify-center bg-neutral-950 px-6">
      <Text className="text-center text-base text-neutral-400">
        Settings — business defaults and WhatsApp alerts match the web dashboard.
      </Text>
    </View>
  );
}
