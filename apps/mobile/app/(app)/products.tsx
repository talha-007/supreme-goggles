import { Text, View } from "react-native";
import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";

export default function ProductsPlaceholder() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Products" });
  }, [navigation]);
  return (
    <View className="flex-1 items-center justify-center bg-neutral-950 px-6">
      <Text className="text-center text-base text-neutral-400">
        Products — full catalog and POS flows match the web app. Use the web dashboard for advanced editing until this screen is built out.
      </Text>
    </View>
  );
}
