import { Text, View } from "react-native";

import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";

export default function ProductsPlaceholder() {
  const bottomPad = useTabScreenBottomPadding();
  return (
    <View
      className="flex-1 items-center justify-center bg-neutral-950 px-6"
      style={{ paddingBottom: bottomPad }}
    >
      <Text className="text-center text-base text-neutral-400">
        Browse and manage your product catalog. This section is coming soon.
      </Text>
    </View>
  );
}
