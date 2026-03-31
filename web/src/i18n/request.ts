import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isAppLocale, type AppLocale } from "./routing";

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get("NEXT_LOCALE")?.value;
  const locale: AppLocale = raw && isAppLocale(raw) ? raw : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
