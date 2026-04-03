import { Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";

export default function PurchaseOrdersPlaceholder() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Purchase orders" });
  }, [navigation]);
  return (
    <View className="flex-1 items-center justify-center bg-neutral-950 px-6">
      <Text className="text-center text-base text-neutral-400">
        Purchase orders — supplier orders and receiving, aligned with the web app.
      </Text>
    </View>
  );
}
