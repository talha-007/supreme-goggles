"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const NAV: { href: string; key: "navOverview" | "navUsers" | "navBusinesses" }[] = [
  { href: "/admin", key: "navOverview" },
  { href: "/admin/users", key: "navUsers" },
  { href: "/admin/businesses", key: "navBusinesses" },
];

export function AdminNav() {
  const pathname = usePathname();
  const t = useTranslations("admin");

  function isActive(href: string): boolean {
    if (href === "/admin") {
      return pathname === "/admin" || pathname === "/admin/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6"
      aria-label={t("navAria")}
    >
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative -mb-px border-b-2 px-3 py-3 text-sm font-medium transition ${
              active
                ? "border-violet-600 text-violet-900 dark:border-violet-400 dark:text-violet-100"
                : "border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
            }`}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
