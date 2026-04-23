import { LanguageSwitcher } from "@/components/language-switcher";

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
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
