import { Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";

export default function SuppliersPlaceholder() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Suppliers" });
  }, [navigation]);
  return (
    <View className="flex-1 items-center justify-center bg-neutral-950 px-6">
      <Text className="text-center text-base text-neutral-400">
        Suppliers — vendors you buy stock from (same as web).
      </Text>
    </View>
  );
}
