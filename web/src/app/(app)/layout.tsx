import { appNav } from "@/components/app-sidebar";
import { AppShell } from "@/components/app-shell";
import { requireBusinessContext } from "@/lib/auth/business-context";
import { hasSubscriptionAccess, isSuperAdminByEnv } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

/** Avoid stale membership checks that can ping-pong /dashboard ↔ /onboarding. */
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireBusinessContext();
  const supabase = await createClient();
  const superAdminBypass = isSuperAdminByEnv(ctx.userId, ctx.userEmail);
  const hasAccess = superAdminBypass
    ? true
    : await hasSubscriptionAccess(supabase, ctx.businessId);
  if (!hasAccess) {
    redirect("/subscription-expired");
  }

  const { data: businessRow } = await supabase
    .from("businesses")
    .select("name, logo_url")
    .eq("id", ctx.businessId)
    .maybeSingle();

  const businessName = businessRow?.name ?? "Business";
  const businessLogoUrl = (businessRow?.logo_url as string | null) ?? null;

  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const navLinks = appNav.map((item) => ({
    href: item.href,
    label: tNav(item.key),
    key: item.key,
  }));

  return (
    <AppShell
      businessName={businessName}
      businessLogoUrl={businessLogoUrl}
      brandTitle={tCommon("brand")}
      navLinks={navLinks}
    >
      {children}
    </AppShell>
  );
}
