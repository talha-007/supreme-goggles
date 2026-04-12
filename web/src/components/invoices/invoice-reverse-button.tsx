"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { reverseInvoice } from "@/lib/invoices/actions";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

type Props = {
  invoiceId: string;
  /** Header row: button only. Sidebar: full help text below. */
  compact?: boolean;
  /** Extra Tailwind classes (e.g. smaller in tables). */
  className?: string;
};

export function InvoiceReverseButton({ invoiceId, compact = false, className }: Props) {
  const t = useTranslations("invoiceDetail");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const runReverse = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const res = await reverseInvoice(invoiceId);
      if (res.error) {
        setError(res.error);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }, [invoiceId, router]);

  function onClick() {
    setConfirmOpen(true);
  }

  const baseBtn =
    "rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100 dark:hover:bg-red-950/70";

  const button = (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      title={compact ? t("reverseHelp") : undefined}
      className={className ? `${baseBtn} ${className}` : baseBtn}
    >
      {pending ? tc("working") : t("reverseInvoice")}
    </button>
  );

  const dialog = (
    <ConfirmDialog
      open={confirmOpen}
      title={t("reverseSectionLabel")}
      description={t("reverseConfirm")}
      cancelLabel={tc("cancel")}
      confirmLabel={t("reverseInvoice")}
      onCancel={() => !pending && setConfirmOpen(false)}
      onConfirm={runReverse}
      pending={pending}
      danger
    />
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        {button}
        {dialog}
        {error ? (
          <p className="max-w-xs text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {button}
      {dialog}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("reverseHelp")}</p>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
