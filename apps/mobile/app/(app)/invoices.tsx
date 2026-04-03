import { Text, View } from "react-native";

import { useTabScreenBottomPadding } from "../../src/hooks/useTabScreenBottomPadding";

export default function InvoicesPlaceholder() {
  const bottomPad = useTabScreenBottomPadding();
  return (
    <View
      className="flex-1 items-center justify-center bg-neutral-950 px-6"
      style={{ paddingBottom: bottomPad }}
    >
      <Text className="text-center text-base text-neutral-400">
        Create and track bills and payments. This section is coming soon.
      </Text>
    </View>
  );
}
