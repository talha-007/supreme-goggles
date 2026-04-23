"use client";

import type { PasswordRulesStatus } from "@/lib/auth/credential-validation";
import { useTranslations } from "next-intl";

type Props = {
  status: PasswordRulesStatus;
};

export function PasswordRuleChecklist({ status }: Props) {
  const t = useTranslations("auth");
  const items: { ok: boolean; label: string }[] = [
    { ok: status.minLength, label: t("passwordRuleMinLength") },
    { ok: status.letter, label: t("passwordRuleLetter") },
    { ok: status.number, label: t("passwordRuleNumber") },
    { ok: status.symbol, label: t("passwordRuleSymbol") },
  ];

  return (
    <ul className="mt-2 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400" aria-live="polite">
      <li className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        {t("passwordRulesTitle")}
      </li>
      {items.map((row) => (
        <li
          key={row.label}
          className={
            row.ok
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-zinc-500 dark:text-zinc-500"
          }
        >
          <span className="me-1.5" aria-hidden>
            {row.ok ? "✓" : "○"}
          </span>
          {row.label}
        </li>
      ))}
    </ul>
  );
}
