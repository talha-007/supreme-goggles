"use client";

import { AppSidebarDesktop, NavLinkItem, SidebarNav } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type Props = {
  businessName: string;
  businessLogoUrl?: string | null;
  brandTitle: string;
  navLinks: readonly NavLinkItem[];
  children: React.ReactNode;
};

function businessInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "B";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export function AppShell({ businessName, businessLogoUrl, brandTitle, navLinks, children }: Props) {
  const t = useTranslations("shell");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("app.sidebar.collapsed");
    if (saved === "1") {
      setDesktopCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("app.sidebar.collapsed", desktopCollapsed ? "1" : "0");
  }, [desktopCollapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="flex min-h-full flex-1">
      <a
        href="#main-content"
        className="sr-only left-4 top-4 z-[100] rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white focus:fixed focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-zinc-400"
      >
        {t("skipToContent")}
      </a>
      <AppSidebarDesktop
        brandTitle={brandTitle}
        links={navLinks}
        collapsed={desktopCollapsed}
        onToggleCollapsed={() => setDesktopCollapsed((v) => !v)}
      />

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-label={t("closeMenu")}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-nav"
            className="fixed inset-y-0 start-0 z-50 flex w-[min(100%,16rem)] flex-col border-e border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950 lg:hidden"
            aria-modal="true"
            role="dialog"
            aria-label={t("navigation")}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{brandTitle}</span>
              <button
                type="button"
                className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                aria-label={t("closeMenu")}
                onClick={() => setMobileOpen(false)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarNav links={navLinks} onLinkClick={() => setMobileOpen(false)} />
          </aside>
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={t("openMenu")}
            onClick={() => setMobileOpen(true)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {businessLogoUrl ? (
              <Image
                src={businessLogoUrl}
                alt={`${businessName} logo`}
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 rounded object-contain"
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {businessInitials(businessName)}
              </div>
            )}
            <span className="min-w-0 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {businessName}
            </span>
          </div>
          <LanguageSwitcher />
          <SignOutButton />
        </header>
        <main id="main-content" className="flex-1 bg-zinc-50 p-4 dark:bg-zinc-900 sm:p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
