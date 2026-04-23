"use client";

import { useState } from "react";

/** Heroicons-style eye (outline), 24×24 */
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m12.474 12.474 3 3" />
    </svg>
  );
}

type Props = {
  id: string;
  name: string;
  autoComplete: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  /** i18n: e.g. t("showPassword") / t("hidePassword") */
  showLabel: string;
  hideLabel: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  hasError?: boolean;
};

/**
 * Password input with a trailing eye control (show / hide). Used on login and signup.
 */
export function AuthPasswordField({
  id,
  name,
  autoComplete,
  value,
  onChange,
  onBlur,
  showLabel,
  hideLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  hasError = false,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={`w-full rounded-lg border bg-white py-2 pl-3 pr-12 text-zinc-900 outline-none focus:ring-2 dark:bg-zinc-900 dark:text-zinc-50 ${
          hasError
            ? "border-red-500 focus:ring-red-400/40 dark:border-red-500/80"
            : "border-zinc-200 ring-zinc-400 focus:ring-2 dark:border-zinc-700"
        }`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-zinc-500 transition hover:text-zinc-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-400 dark:hover:text-zinc-200"
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeSlashIcon className="text-zinc-600 dark:text-zinc-300" />
        ) : (
          <EyeIcon className="text-zinc-600 dark:text-zinc-300" />
        )}
      </button>
    </div>
  );
}
