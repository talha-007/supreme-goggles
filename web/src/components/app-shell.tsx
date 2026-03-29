"use client";

import { AppSidebarDesktop, SidebarNav } from "@/components/app-sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import { useEffect, useState } from "react";

type Props = {
  businessName: string;
  children: React.ReactNode;
};

export function AppShell({ businessName, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <AppSidebarDesktop />

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id="mobile-nav"
            className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,16rem)] flex-col border-r border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950 lg:hidden"
            aria-modal="true"
            role="dialog"
            aria-label="Navigation"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Retail SaaS</span>
              <button
                type="button"
                className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarNav onLinkClick={() => setMobileOpen(false)} />
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
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {businessName}
          </span>
          <SignOutButton />
        </header>
        <main className="flex-1 bg-zinc-50 p-4 dark:bg-zinc-900 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
