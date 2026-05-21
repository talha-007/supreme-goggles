import { Ionicons } from "@expo/vector-icons";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Appearance, Pressable, Text, View } from "react-native";

import { openSupportWhatsApp, SUPPORT_PHONE_DISPLAY } from "../lib/support-contact";
import {
  screenRootClass,
  textMutedClass,
  textPageTitleClass,
  textSubtleClass,
} from "../theme/semantic";

type Props = { children: ReactNode };

type State = {
  hasError: boolean;
  message: string | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn("[AppErrorBoundary]", error.message, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ hasError: false, message: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const resolved = Appearance.getColorScheme() === "light" ? "light" : "dark";
      const monoBox =
        resolved === "dark"
          ? "mt-4 max-w-full rounded-lg bg-neutral-900 px-3 py-2 text-center font-mono text-xs text-neutral-500"
          : "mt-4 max-w-full rounded-lg bg-zinc-100 px-3 py-2 text-center font-mono text-xs text-zinc-600";
      return (
        <View className={`${screenRootClass(resolved)} items-center justify-center px-6`}>
          <Text className={`text-center text-lg font-semibold ${textPageTitleClass(resolved)}`}>
            Something went wrong
          </Text>
          <Text className={`mt-3 text-center text-sm leading-5 ${textSubtleClass(resolved)}`}>
            Try closing and reopening the app. If it keeps happening, contact your shop admin or message app support on
            WhatsApp ({SUPPORT_PHONE_DISPLAY}).
          </Text>
          {this.state.message ? (
            <Text className={monoBox}>{this.state.message}</Text>
          ) : null}
          <Pressable
            onPress={() => void openSupportWhatsApp(`App crashed: ${this.state.message ?? "unknown"}`)}
            className="mt-6 flex-row items-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 active:opacity-90"
            accessibilityRole="button"
            accessibilityLabel="Open WhatsApp support"
          >
            <Ionicons name="logo-whatsapp" size={22} color="#fff" />
            <Text className="text-base font-semibold text-white">WhatsApp support</Text>
          </Pressable>
          <Pressable onPress={this.reset} className="mt-6 py-3" accessibilityRole="button">
            <Text className="text-center text-base font-medium text-brand-400">Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
