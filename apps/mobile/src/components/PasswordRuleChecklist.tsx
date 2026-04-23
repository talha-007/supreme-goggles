import { Text, View } from "react-native";

import type { PasswordRulesStatus } from "../lib/credential-validation";

type Props = {
  status: PasswordRulesStatus;
};

const labels: (keyof PasswordRulesStatus)[] = ["minLength", "letter", "number", "symbol"];
const copy: Record<keyof PasswordRulesStatus, string> = {
  minLength: "At least 8 characters",
  letter: "At least one letter (a–z)",
  number: "At least one number (0–9)",
  symbol: "At least one special character (e.g. ! @ # *)",
};

export function PasswordRuleChecklist({ status }: Props) {
  return (
    <View className="mt-2">
      <Text className="text-[11px] font-medium uppercase text-neutral-500">Password must have</Text>
      {labels.map((k) => (
        <Text
          key={k}
          className={`mt-1 text-xs ${status[k] ? "text-emerald-400" : "text-neutral-500"}`}
        >
          {status[k] ? "✓ " : "○ "}
          {copy[k]}
        </Text>
      ))}
    </View>
  );
}
