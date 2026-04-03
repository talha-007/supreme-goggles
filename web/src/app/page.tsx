import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
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
    .maybeSingle();

  if (!membership?.business_id) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
