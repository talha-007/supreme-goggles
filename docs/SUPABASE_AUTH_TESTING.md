# Supabase auth email limits (testing)

This repo does **not** enforce signup/email limits in app code. Throttling comes from **Supabase Auth** (hosted or local CLI).

## Hosted project (supabase.co)

1. Open [Authentication → Rate Limits](https://supabase.com/dashboard/project/_/auth/rate-limits) (pick your project).
2. Raise limits you need while testing (e.g. emails per hour, sign-in attempts).
3. Save. Changes apply to the cloud project immediately.

Optional for **dev-only** projects:

- **Authentication → Providers → Email** — you can turn **off** “Confirm email” so accounts work without inbox delivery (still not recommended for production).

## Local Supabase (`supabase start`)

`supabase/config.toml` in this repo sets a high **`[auth.rate_limit].email_sent`** for local stacks. Restart after editing: `supabase stop` then `supabase start`.

If you use **Inbucket** for mail, check its UI for delivered messages; rate limits still apply to Auth’s mail sender.

## Onboarding

`create_business_with_owner` does **not** check email domains or send mail. If onboarding fails, the message is from Postgres/RLS, not an email quota.
