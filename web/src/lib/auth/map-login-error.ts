const MAX_USER_MESSAGE = 160;

/**
 * Map Supabase Auth `signInWithPassword` errors to a stable i18n key (under `auth.loginError.*`).
 * Falls back to `unknown` for unexpected server messages.
 */
export function getLoginErrorTranslationId(err: { message: string }): { id: "unknown"; params: { message: string } } | { id: Exclude<LoginErrorId, "unknown"> } {
  const m = err.message.toLowerCase();

  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid_credentials") ||
    m.includes("invalid grant") ||
    m.includes("wrong password") ||
    m === "invalid email or password"
  ) {
    return { id: "wrongEmailOrPassword" };
  }
  if (
    m.includes("email not confirmed") ||
    m.includes("email_not_confirmed") ||
    m.includes("not been confirmed")
  ) {
    return { id: "emailNotConfirmed" };
  }
  if (
    m.includes("too many") ||
    m.includes("rate limit") ||
    m.includes("over_request") ||
    m.includes("over_email_sends") ||
    m.includes("too many requests")
  ) {
    return { id: "rateLimited" };
  }
  if (m.includes("user_banned") || m.includes("banned user") || m.includes("is banned")) {
    return { id: "userBanned" };
  }
  if (
    m.includes("network") ||
    m.includes("fetch") ||
    m.includes("failed to fetch") ||
    m.includes("load failed") ||
    m.includes("net::err")
  ) {
    return { id: "network" };
  }

  const short =
    err.message.length > MAX_USER_MESSAGE
      ? `${err.message.slice(0, MAX_USER_MESSAGE)}…`
      : err.message;
  return { id: "unknown", params: { message: short } };
}

export type LoginErrorId =
  | "wrongEmailOrPassword"
  | "emailNotConfirmed"
  | "rateLimited"
  | "network"
  | "userBanned"
  | "unknown";
