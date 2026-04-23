import { isDisposableEmailDomain } from "./disposable-email-domains";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Rejects empty / obviously malformed emails before API calls. Trims only (does not change casing).
 */
export function isValidEmailFormat(email: string): boolean {
  const s = email.trim();
  if (s.length < 5 || s.length > 320) return false;
  if (!s.includes("@")) return false;
  return EMAIL_RE.test(s);
}

export type SignUpPasswordIssue = "minLength" | "letter" | "number" | "symbol";

export type SignupEmailIssue = "empty" | "format" | "disposable";

/**
 * 8+ characters, at least one letter, one digit, one non-alphanumeric (e.g. !@#$*).
 */
export function getSignUpPasswordIssue(password: string): SignUpPasswordIssue | null {
  if (password.length < 8) return "minLength";
  if (!/[A-Za-z]/.test(password)) return "letter";
  if (!/\d/.test(password)) return "number";
  if (!/[^A-Za-z0-9]/.test(password)) return "symbol";
  return null;
}

export type PasswordRulesStatus = {
  minLength: boolean;
  letter: boolean;
  number: boolean;
  symbol: boolean;
};

/** Live rule checks for password hint UI (sign-up / update password). */
export function getPasswordRulesStatus(password: string): PasswordRulesStatus {
  return {
    minLength: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

/**
 * For registration only: format, disposable blockers. Returns null if OK to proceed (format-wise).
 */
export function getSignupEmailIssue(email: string): SignupEmailIssue | null {
  const s = email.trim();
  if (s.length === 0) return "empty";
  if (!isValidEmailFormat(email)) return "format";
  if (isDisposableEmailDomain(email)) return "disposable";
  return null;
}

export { isDisposableEmailDomain } from "./disposable-email-domains";
