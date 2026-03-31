# Web app (Next.js + Supabase)

## Setup

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Fill in **Project URL** and **anon key** from Supabase → Project Settings → API.

2. In Supabase → **Authentication** → **URL configuration**:

   - **Site URL:** `http://localhost:3000` (must match how you open the app in the browser)
   - **Redirect URLs** (add each on its own line or in the list):

     - `http://localhost:3000/auth/callback`
     - `http://127.0.0.1:3000/auth/callback` (if you ever use 127.0.0.1 instead of localhost)

   Without the exact callback URL, email confirmation and OAuth will fail after redirect.

3. Env file must live in **`web/`** (same folder as `package.json`) so Next.js loads it — use `.env.local` or `.env` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

4. Apply the SQL migration so onboarding works (creates `create_business_with_owner` RPC):

   Run [`../supabase/migrations/20260329120000_create_business_with_owner.sql`](../supabase/migrations/20260329120000_create_business_with_owner.sql) in the SQL Editor (or use Supabase CLI migrations).

5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) — you will be prompted to sign in, create a business, then land on the dashboard.

## Shop setup (first day)

1. **Business:** Complete onboarding with your shop name (one business per account to start).
2. **Products:** Add products under **Products** — set **sale price**, **stock**, and optional **category** and **photo** (helps the dashboard POS grid). Use **barcodes** if you scan at the counter.
3. **Customers:** Add regular customers if you sell on credit; walk-in sales work without a customer.
4. **Invoicing defaults:** Under **Settings**, set **tax rate** and invoice defaults so new sales match your shop.
5. **Daily use:** Open **Dashboard** for the split **menu + cart** flow, or **Invoices** for a traditional list. Finalizing **cash** or **credit** updates stock; drafts do not.

If a page fails, use **Try again** or return to the **Dashboard**. Missing pages show a **404** screen with links home.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (requires `.env.local` with Supabase vars)
- `npm run start` — run production build
- `npm run lint` — ESLint
