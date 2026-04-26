import { redirect } from "next/navigation";

/** @deprecated — real route is `/update-password` (under `(auth)` group, not `auth/` segment). */
export default function LegacyUpdatePasswordPathRedirect() {
  redirect("/update-password");
}
