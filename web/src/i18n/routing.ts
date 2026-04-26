export const locales = ["en", "ur"] as const;
export type AppLocale = (typeof locales)[number];

/** Most visitors are in Pakistan: Urdu by default; English in the top bar. */
export const defaultLocale: AppLocale = "ur";

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}
