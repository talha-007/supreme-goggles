# POS SaaS Production Hardening Plan

This is our working guide. We will complete items in order, verify each one, and only then move to the next.

## Current Status

- App build: PASS (`next build` succeeds)
- Core stock double-deduction bug: FIXED (legacy trigger removed)
- Remaining production blockers: database security and hardening items

---

## How We Will Work

For each step:
1. Understand the risk in plain language.
2. Apply a small, targeted change (migration / setting).
3. Verify with SQL + app behavior.
4. Mark step complete and continue.

---

## Step 1 — Fix `invitations` RLS policies

### Why this matters
RLS is enabled on `public.invitations` but no policies exist. That is an inconsistent security state and can break access or cause rushed unsafe fixes later.

### What we will do
- Decide intended behavior first:
  - Who can create invitations? (owner/manager?)
  - Who can read invitations? (business members only?)
  - Who can update/delete invitations?
- Add explicit `SELECT`, `INSERT`, `UPDATE`, `DELETE` policies.

### Verify
- Query table as expected roles/users.
- Confirm only authorized business members can access rows.

### Done when
- Policies exist and pass role-based tests.

---

## Step 2 — Remove/replace risky `SECURITY DEFINER` views

Affected views:
- `public.v_customer_balances`
- `public.v_daily_sales`
- `public.v_low_stock`

### Why this matters
`SECURITY DEFINER` views can run with creator privileges, which may bypass row-level protections depending on ownership and grants.

### What we will do
- Inspect how each view is used in the app.
- Convert to safer pattern:
  - Prefer `security_invoker` view if possible, or
  - Replace with SQL functions that enforce `business_members` checks internally.

### Verify
- Existing pages using these views still work.
- Cross-business data access is blocked.

### Done when
- No dangerous definer view exposure remains for external roles.

---

## Step 3 — Lock function `search_path`

Functions flagged:
- `get_my_business_ids`
- `get_my_role`
- `generate_invoice_number`
- `touch_updated_at`
- `update_invoice_on_payment`

### Why this matters
Mutable `search_path` is a known hardening gap for SQL functions.

### What we will do
- Recreate functions with:
  - `set search_path = public`

### Verify
- Function behavior unchanged.
- Advisors no longer flag these functions.

### Done when
- All custom app functions have explicit safe `search_path`.

---

## Step 4 — Enable leaked password protection (Auth setting)

### Why this matters
Blocks known compromised passwords and reduces account takeover risk.

### What we will do
- Enable leaked-password protection in Supabase Auth settings.

### Verify
- Auth security advisor warning disappears.

### Done when
- Setting is enabled in production project.

---

## Step 5 — Address performance advisories (FK indexes)

### Why this matters
Missing FK indexes can hurt joins/deletes/updates as data grows.

### What we will do
- Review advisor list.
- Add indexes for missing FK columns (starting with highest traffic tables).

### Verify
- Re-run performance advisors.
- Optional: check query plans for major endpoints.

### Done when
- No meaningful unindexed FK warnings remain.

---

## Step 6 — Final Production Readiness Gate

### Checklist
- [ ] All steps above complete
- [ ] `next build` passes on latest commit
- [ ] Supabase security/performance advisors reviewed and acceptable
- [ ] Stock flows tested end-to-end:
  - [ ] finalize cash/credit
  - [ ] reverse invoice
  - [ ] no double deduction
  - [ ] inventory cost card accurate
- [ ] Backup + rollback plan documented for DB migrations

### Go/No-Go rule
- GO only when no high-severity security items remain and critical business flows pass.

---

## Notes For Understanding (Plain Language)

- **RLS policies** = row access rules in DB. If wrong, users can see/edit wrong business data.
- **Security definer** = SQL runs with creator power, not caller power. Useful but risky unless controlled.
- **search_path** = where Postgres looks for objects. If not fixed, can be abused in edge cases.
- **Migrations** = versioned DB changes. Always prefer small, reversible migrations.

