import { Modal, Platform, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from "react-native";

import { THERMAL_CHARS } from "../lib/receipt-text";

type Props = {
  visible: boolean;
  title?: string;
  receiptText: string;
  onClose: () => void;
};

export function ReceiptShareSheet({ visible, title = "Receipt", receiptText, onClose }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const padX = 10;
  /** Max paper fits modal; inner area is for exactly 42 monospace columns. */
  const maxPaperW = Math.min(screenWidth - 32, 360);
  const maxInnerW = Math.max(1, maxPaperW - padX * 2);
  /**
   * Use a slightly wide px/char estimate so the Text box is not narrower than 42
   * rendered monospace glyphs — otherwise RN clips the right side (amount digits).
   */
  const charW = Platform.OS === "android" ? 0.62 : 0.64;
  let fontSize = Math.min(12, maxInnerW / (THERMAL_CHARS * charW));
  fontSize = Math.max(8, fontSize);
  let innerW = Math.round(THERMAL_CHARS * fontSize * charW);
  if (innerW > maxInnerW) {
    fontSize = maxInnerW / (THERMAL_CHARS * charW);
    innerW = Math.round(THERMAL_CHARS * fontSize * charW);
  }
  /** Few extra px: monospace still occasionally draws slightly wider than our estimate. */
  const lineW = innerW + 6;
  const paperW = lineW + padX * 2;
  const lineHeight = Math.round(fontSize * 1.22);

  const mono = Platform.select({
    ios: "Courier",
    android: "monospace",
    default: "monospace",
  });

  const lines = receiptText.split("\n");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <View className="max-h-[88%] rounded-t-2xl border border-neutral-800 bg-neutral-950 px-4 pb-8 pt-4">
          <Text className="text-lg font-semibold text-neutral-100">{title}</Text>
          <Text className="mt-1 text-xs text-neutral-500">
            Thermal-width preview (~{THERMAL_CHARS} columns). Share sends this text to your printer app.
          </Text>

          <View className="mt-4 items-center">
            <View
              className="rounded-sm border border-neutral-600 shadow-lg"
              style={{
                width: paperW,
                maxWidth: "100%",
                backgroundColor: "#fffef7",
                paddingHorizontal: padX,
                paddingTop: 16,
                paddingBottom: 18,
                borderTopWidth: 3,
                borderTopColor: "#d4d4d4",
              }}
            >
              <ScrollView
                style={{ maxHeight: 380 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {/* One Text per line; width uses generous char estimate so amounts are not clipped. */}
                <View style={{ width: lineW }}>
                  {lines.map((line, i) =>
                    line.length === 0 ? (
                      <View key={`e-${i}`} style={{ height: lineHeight * 0.35 }} />
                    ) : (
                      <Text
                        key={i}
                        selectable
                        allowFontScaling={false}
                        numberOfLines={1}
                        ellipsizeMode="clip"
                        style={{
                          fontFamily: mono,
                          fontSize,
                          lineHeight,
                          color: "#262626",
                          width: lineW,
                          ...(Platform.OS === "android" && {
                            includeFontPadding: false,
                            textAlignVertical: "center" as const,
                          }),
                        }}
                      >
                        {line}
                      </Text>
                    ),
                  )}
                </View>
              </ScrollView>
            </View>
          </View>

          <Pressable
            onPress={() => void Share.share({ message: receiptText, title: "Receipt" })}
            className="mt-4 rounded-xl bg-emerald-600 py-3.5 active:opacity-90"
          >
            <Text className="text-center text-base font-semibold text-white">Share / print</Text>
          </Pressable>
          <Pressable onPress={onClose} className="mt-3 rounded-xl bg-neutral-800 py-3">
            <Text className="text-center text-base font-medium text-neutral-100">Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
