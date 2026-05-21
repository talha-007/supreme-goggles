import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import { useTheme } from "../contexts/theme-context";
import {
  modalDialogSurfaceClass,
  modalSecondaryButtonClass,
  textMutedClass,
  textPageTitleClass,
  textStrongOnSurfaceClass,
} from "../theme/semantic";

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel: string;
  /** Emerald primary (default) or destructive red */
  variant?: "primary" | "danger";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel = "Cancel",
  confirmLabel,
  variant = "primary",
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const { resolved } = useTheme();
  const confirmClasses =
    variant === "danger"
      ? "rounded-xl border border-red-900/60 bg-red-950/40 py-3.5 active:opacity-90 disabled:opacity-50"
      : "rounded-xl bg-violet-600 py-3.5 active:opacity-90 disabled:opacity-50";

  const spinnerColor = variant === "danger" ? "#f87171" : "#ffffff";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center">
        <Pressable
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
          onPress={loading ? undefined : onCancel}
          className="absolute inset-0 bg-black/70"
        />
        <View
          className={modalDialogSurfaceClass(resolved)}
          accessibilityViewIsModal
        >
          <Text className={`text-lg font-semibold ${textPageTitleClass(resolved)}`}>{title}</Text>
          <Text className={`mt-2 text-sm leading-5 ${textMutedClass(resolved)}`}>{message}</Text>

          <View className="mt-5 gap-3">
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className={confirmClasses}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              {loading ? (
                <ActivityIndicator color={spinnerColor} />
              ) : (
                <Text
                  className={`text-center text-base font-semibold ${
                    variant === "danger" ? "text-red-400" : "text-white"
                  }`}
                >
                  {confirmLabel}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onCancel}
              disabled={loading}
              className={modalSecondaryButtonClass(resolved)}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text className={`text-center text-base font-medium ${textStrongOnSurfaceClass(resolved)}`}>
                {cancelLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
