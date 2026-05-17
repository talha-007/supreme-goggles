import { AdminNav } from "@/components/admin/admin-nav";
import { isSuperadminUser } from "@/lib/auth/superadmin";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isSuperadminUser({ userId: user.id, email: user.email })) {
    redirect("/dashboard");
  }

  const t = await getTranslations("admin");

  return (
    <div className="min-h-full bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              {t("backToApp")}
            </Link>
            <span className="hidden text-zinc-300 sm:inline">|</span>
            <span className="text-sm font-semibold text-zinc-900">{t("title")}</span>
          </div>
          <span className="max-w-[60vw] truncate text-xs text-zinc-500">{user.email}</span>
        </div>
        <div className="mx-auto max-w-7xl">
          <AdminNav />
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
