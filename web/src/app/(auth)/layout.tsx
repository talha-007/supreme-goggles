import { AuthTopBar } from "@/components/auth/auth-top-bar";
import { BrandLogo } from "@/components/brand-logo";
import { defaultLocale, isAppLocale, type AppLocale } from "@/i18n/routing";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rawLocale = await getLocale();
  const locale: AppLocale = isAppLocale(rawLocale) ? rawLocale : defaultLocale;
  const tCommon = await getTranslations("common");
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-white">
      <AuthTopBar locale={locale} languageLabel={tCommon("language")} />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center">
            <Link href="/" className="inline-block" aria-label="Taplite home">
              <BrandLogo
                width={180}
                height={64}
                alt="Taplite"
                wrapperClassName="px-3 py-2"
                className="h-14 w-auto max-w-[200px] object-contain object-center"
                priority
              />
            </Link>
            <p className="mt-2 text-center text-xs text-zinc-500">taplite.store</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
