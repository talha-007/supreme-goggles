import { appNav } from "@/components/app-sidebar";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.business_id) {
    redirect("/onboarding");
  }

  const { data: businessRow } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", membership.business_id)
    .single();

  const businessName = businessRow?.name ?? "Business";

  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const navLinks = appNav.map((item) => ({
    href: item.href,
    label: tNav(item.key),
  }));

  return (
    <AppShell businessName={businessName} brandTitle={tCommon("brand")} navLinks={navLinks}>
      {children}
    </AppShell>
  );
}
