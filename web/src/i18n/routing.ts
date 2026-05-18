export const locales = ["en", "ur"] as const;
export type AppLocale = (typeof locales)[number];

/** First visit (no `NEXT_LOCALE` cookie): English; Urdu remains available in the UI. */
export const defaultLocale: AppLocale = "en";

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}
