import { Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";

export default function CustomersPlaceholder() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Customers" });
  }, [navigation]);
  return (
    <View className="flex-1 items-center justify-center bg-neutral-950 px-6">
      <Text className="text-center text-base text-neutral-400">
        Customers — same data as web (`customers` table). Mobile UI coming next.
      </Text>
    </View>
  );
}
