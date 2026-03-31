import type { AppLocale } from "@/i18n/routing";

/** BCP 47 tag for `Intl` formatters (dates, numbers) from app locale. */
export function intlLocaleTag(locale: string): string {
  if (locale === "ur") return "ur-PK";
  return "en-PK";
}

export function isRtlLocale(locale: string): boolean {
  return locale === "ur";
}

export function pkrNumberFormat(locale: string): Intl.NumberFormat {
  return new Intl.NumberFormat(intlLocaleTag(locale as AppLocale), {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
