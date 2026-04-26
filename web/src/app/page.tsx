import { getOptionalBusinessContext, getRestaurantStaffHomeUrl } from "@/lib/auth/business-context";
import { createClient } from "@/lib/supabase/server";
import { LandingPage } from "@/components/landing/landing-page";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ctx = await getOptionalBusinessContext();
  if (ctx) {
    redirect(getRestaurantStaffHomeUrl(ctx));
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/onboarding");
  }
  return <LandingPage />;
}
