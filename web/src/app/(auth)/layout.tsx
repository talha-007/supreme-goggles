import { BRAND_LOGO } from "@/lib/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="absolute end-4 top-4 z-10">
        <LanguageSwitcher locale="en" languageLabel="Language" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center">
            <Link href="/" className="inline-block" aria-label="Taplite home">
              <Image
                src={BRAND_LOGO.light}
                alt="Taplite"
                width={180}
                height={64}
                className="h-16 w-auto max-w-[200px] object-contain object-center dark:hidden"
                priority
              />
              <Image
                src={BRAND_LOGO.dark}
                alt="Taplite"
                width={180}
                height={64}
                className="hidden h-16 w-auto max-w-[200px] object-contain object-center dark:block"
                priority
              />
            </Link>
            <p className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">taplite.store</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
