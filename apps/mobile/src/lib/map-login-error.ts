const MAX_USER_MESSAGE = 160;

export type LoginMappedError =
  | { id: "unknown"; params: { message: string } }
  | { id: "wrongEmailOrPassword" | "emailNotConfirmed" | "rateLimited" | "network" | "userBanned" };

export function getLoginErrorTranslationId(err: { message: string }): LoginMappedError {
  const m = err.message.toLowerCase();

  if (
    m.includes("invalid login credentials") ||
    m.includes("invalid_credentials") ||
    m.includes("invalid grant") ||
    m.includes("wrong password")
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
    m.includes("over_email_sends")
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
    m.includes("load failed")
  ) {
    return { id: "network" };
  }

  const short =
    err.message.length > MAX_USER_MESSAGE ? `${err.message.slice(0, MAX_USER_MESSAGE)}…` : err.message;
  return { id: "unknown", params: { message: short } };
}

export const LOGIN_ERROR_MESSAGE: Record<
  "wrongEmailOrPassword" | "emailNotConfirmed" | "rateLimited" | "network" | "userBanned",
  string
> = {
  wrongEmailOrPassword:
    "That email or password is wrong. Check for typos, or reset your password from the link below.",
  emailNotConfirmed: "Confirm your email first. Open the link we sent you, then sign in here.",
  rateLimited: "Too many sign-in attempts. Wait a minute and try again.",
  network: "We couldn’t reach the server. Check your connection and try again.",
  userBanned: "This account can’t sign in right now. Contact support if you need help.",
};
