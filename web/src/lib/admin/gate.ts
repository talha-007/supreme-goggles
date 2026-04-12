import { isSuperadminUser } from "@/lib/auth/superadmin";
import { createClient } from "@/lib/supabase/server";

export async function assertSuperadmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  if (!isSuperadminUser({ userId: user.id, email: user.email })) {
    return { ok: false, error: "Not authorized." };
  }
  return { ok: true };
}
