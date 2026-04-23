import { isDisposableEmailDomain } from "./disposable-email-domains";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email: string): boolean {
  const s = email.trim();
  if (s.length < 5 || s.length > 320) return false;
  if (!s.includes("@")) return false;
  return EMAIL_RE.test(s);
}

export type SignUpPasswordIssue = "minLength" | "letter" | "number" | "symbol";

export type SignupEmailIssue = "empty" | "format" | "disposable";

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

export function getPasswordRulesStatus(password: string): PasswordRulesStatus {
  return {
    minLength: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function getSignupEmailIssue(email: string): SignupEmailIssue | null {
  const s = email.trim();
  if (s.length === 0) return "empty";
  if (!isValidEmailFormat(email)) return "format";
  if (isDisposableEmailDomain(email)) return "disposable";
  return null;
}

export const SIGNUP_PASSWORD_ERROR: Record<SignUpPasswordIssue, string> = {
  minLength: "Use at least 8 characters.",
  letter: "Include at least one letter (a–z).",
  number: "Include at least one number (0–9).",
  symbol: "Include at least one special character (e.g. ! @ # *).",
};

export const SIGNUP_EMAIL_ERROR: Record<SignupEmailIssue, string> = {
  empty: "Enter your email address.",
  format: "Enter a valid email address.",
  disposable: "Temporary or disposable email addresses can’t be used. Use a real inbox you own.",
};
