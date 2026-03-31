export const locales = ["en", "ur"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}
