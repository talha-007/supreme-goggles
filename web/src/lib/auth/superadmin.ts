/**
 * Superadmin access is allowlist-only (env). Never grant from client input.
 * Set `SUPERADMIN_USER_IDS` (comma-separated auth user UUIDs) and/or
 * `SUPERADMIN_EMAILS` (comma-separated, case-insensitive).
 */
export function isSuperadminUser(params: {
  userId: string;
  email?: string | null;
}): boolean {
  const ids = (process.env.SUPERADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.includes(params.userId)) {
    return true;
  }
  const emails = (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const em = params.email?.trim().toLowerCase();
  if (em && emails.includes(em)) {
    return true;
  }
  return false;
}
