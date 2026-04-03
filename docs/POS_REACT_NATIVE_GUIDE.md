# POS mobile app — React Native step-by-step guideline

This document is a **phased roadmap** for a React Native POS companion to the existing **Next.js + Supabase** web app. It leans on **Expo** and “full power” RN: native modules, gestures, lists, and platform APIs.

---

## 1. Goals and constraints

| Goal | Notes |
|------|--------|
| Same backend | **Supabase** (auth, Postgres, RLS) is the source of truth. |
| Parity with web POS | Catalog, cart, customer, tax/discount, cash/credit, draft save. |
| Store-safe UX | Large tap targets, barcode scanning, haptics, fast lists. |
| Security | **Anon key + user JWT** in the app; **never** ship service role. |

**Important:** Next.js **Server Actions** are not meant for mobile. Plan either:

- **Direct Supabase** from the app (same tables/RPCs the server uses, guarded by RLS), or  
- **HTTP API routes** in Next (`/api/...`) that validate the Supabase JWT and call shared logic.

Pick one pattern per feature and stay consistent.

---

## 2. Recommended stack (React Native “full power”)

### Core

| Piece | Choice | Why |
|-------|--------|-----|
| Framework | **Expo SDK 52+** | Managed native modules, EAS Build/Submit, dev builds, config plugins. |
| Navigation | **Expo Router** | File-based routes, deep links, web-like mental model. |
| Language | **TypeScript** | Align with `web/` types; share types via a package or `packages/shared`. |

### UI & motion

| Piece | Choice | Why |
|-------|--------|-----|
| Styling | **NativeWind** (Tailwind) *or* **Tamagui** *or* **StyleSheet + tokens** | Match design tokens from web; NativeWind is familiar if you use Tailwind. |
| Lists | **@shopify/flash-list** | Virtualized grids/lists — critical for large product catalogs. |
| Gestures | **react-native-gesture-handler** + **react-native-reanimated** | Smooth sheet, swipe-to-delete line items, spring animations. |
| Safe area | **react-native-safe-area-context** | Notches, dynamic island, Android cutouts. |

### Data & auth

| Piece | Choice | Why |
|-------|--------|-----|
| Supabase | **`@supabase/supabase-js`** | Same client patterns as web (session, refresh). |
| Session storage | **`expo-secure-store`** (refresh token) + memory / small prefs | More secure than plain AsyncStorage for tokens. |
| Server state | **TanStack Query** | Cache, retries, background refetch for catalog and invoice state. |
| Cart / POS UI state | **Zustand** or **Jotai** | Lightweight global cart; easy to persist snapshot later. |

### POS-specific native features

| Feature | Module | Use |
|---------|--------|-----|
| Barcode / QR | **expo-camera** (Barcode scanning) or **react-native-vision-camera** + MLKit | Scan SKU/barcode to add line or open product. |
| Haptics | **expo-haptics** | Success/error on pay, increment qty. |
| Keep awake | **expo-keep-awake** | Optional: screen on while on sale screen. |
| Printing | **expo-print** or **react-native-thermal-receipt** (vendor-specific) | Receipt after sale — phase later. |
| Intents | **expo-linking** | Deep link from payment apps if you integrate locally. |

### Optional (later)

| Feature | Notes |
|---------|--------|
| Offline queue | **WatermelonDB**, **SQLite** (`expo-sqlite`), or TanStack Query **persist** + mutation queue. |
| Push | **expo-notifications** for low-stock / owner alerts (ties to your roadmap). |
| OTA updates | **EAS Update** for JS-only fixes without store review. |

---

## 3. Repository layout (recommended)

**Option A — Monorepo (best for shared types)**

```text
supreme-goggles/
  web/            # Next.js app (unchanged)
  apps/
    pos-mobile/   # Expo app (started — auth + POS shell)
  packages/
    shared/       # optional: types, zod schemas
```

**Option B — Separate repo**  
Copy types manually or publish a small private `@org/shared` package.

Use **pnpm workspaces** or **npm workspaces** + **Turborepo** if you want one `turbo build`.

---

## 4. Backend alignment checklist

Before building screens, confirm:

1. **RLS policies** allow the operations the POS needs (insert/update `invoices`, `invoice_items`, stock RPCs) for `authenticated` users tied to `business_id`.
2. **RPCs** used by the web (e.g. `generate_invoice_number`) are callable from the client with the user’s JWT.
3. **Stock / finalize** paths match web (`saveDraftAndFinalizeCash` etc.) — either call the same Postgres functions from Supabase client or expose one **Next API route** that reuses server code.

If something only exists as a Server Action today, add a **thin API** or **RPC** for mobile.

---

## 5. Phased implementation (step by step)

### Phase 0 — Bootstrap (days 1–2)

1. `npx create-expo-app@latest pos-mobile -t tabs` (or blank + install Expo Router).
2. Enable **TypeScript**, **Expo Router**, **absolute imports**.
3. Add **environment** vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Expo public prefix).
4. Configure **EAS** (`eas build:configure`) even if you only build dev clients first.
5. Add **deep linking** scheme (e.g. `com.yourorg.retail://`) for OAuth callback if you use Supabase OAuth on device.

**Exit criteria:** App launches on iOS simulator + Android emulator; env loaded.

---

### Phase 1 — Auth (days 3–5)

1. Initialize Supabase client (singleton) with `expo-secure-store` adapter for session persistence (see Supabase + Expo docs).
2. Build **login** screen (email/password or magic link — match web).
3. After login, load **`business_members`** → if none, route to **onboarding** (or block with message to finish on web — product decision).
4. **Sign out** clears secure storage + query cache.

**Exit criteria:** User can sign in/out; session survives app restart.

---

### Phase 2 — Read-only catalog (days 5–8)

1. Fetch **products** (`business_id`, active, with `image_url`, `category`, `sale_price`, `current_stock`).
2. Use **FlashList** in a **grid** (`numColumns`) for the catalog; **Image** from `expo-image` (caching).
3. **Search** debounced — same logic as web (`ilike` or your search RPC).
4. **Category chips** — filter client-side or server-side to mirror web POS.

**Exit criteria:** Smooth scrolling with 500+ rows; images load from Supabase Storage public URLs.

---

### Phase 3 — Cart state (days 8–10)

1. **Zustand** store: `lines[]`, `customerId`, `taxRate`, `discount`, `notes`, `dueDate`.
2. **Add line** from product (merge qty by `product_id`).
3. **Reanimated** micro-interactions on add/remove; **haptics** on add.
4. Optional: **persist** cart draft to AsyncStorage for crash recovery (not a substitute for server draft).

**Exit criteria:** Cart matches web line model (`LineDraft`-compatible).

---

### Phase 4 — Create / update invoice (days 10–15)

1. Implement **save draft** using the same DB rules as web: insert/update `invoices` + `invoice_items`, or call existing **RPCs**.
2. Handle **first save** → receive `invoice_id`; subsequent saves update draft only.
3. Surface **errors** (RLS, validation) in UI.

**Exit criteria:** Draft saved; reopening draft loads lines (optional in v1: only “same session”).

---

### Phase 5 — Checkout: cash & credit (days 15–20)

1. Map **finalize** flows to Supabase RPCs or API routes (payments, stock movement — whatever web uses server-side).
2. **Cash:** validate tender ≥ total; record payment; show change (use **BigNumber** or integer cents if you worry about floats).
3. **Credit:** finalize as unpaid per business rules.
4. **Haptics** on success; **reset** cart and optionally navigate to receipt screen.

**Exit criteria:** One full sale end-to-end on device with correct stock (verify in Supabase).

---

### Phase 6 — Barcode & polish (days 20–25)

1. **Barcode scanner** screen or modal: on scan, resolve product by `barcode` and call **add line**.
2. **Tablet layout:** `useWindowDimensions` — two-pane POS (catalog | cart) on wide screens; single column on phone with tabs (mirror web POS pattern).
3. **Accessibility:** `accessibilityLabel` on icon buttons; font scaling.
4. **Performance:** memoize list rows; avoid re-rendering whole cart on each keystroke.

**Exit criteria:** Scan-to-add works; layout usable on 10" tablet.

---

### Phase 7 — Hardening (ongoing)

1. **Error boundaries** per stack (Expo Router error boundaries).
2. **Analytics** (optional): Sentry for React Native.
3. **App Store** assets, privacy manifest (camera if used), data collection disclosure.
4. **EAS Submit** pipelines for TestFlight / Play Internal Testing.

---

## 6. Using React Native “full powers” — checklist

- [ ] **FlashList** for catalog and line items (not only `FlatList`).
- [ ] **Reanimated 3** for sheet, button press, cart total updates.
- [ ] **Gesture Handler** for swipe actions on line items.
- [ ] **expo-image** with disk cache for product photos.
- [ ] **expo-haptics** on pay / error / qty change.
- [ ] **Secure store** for auth tokens.
- [ ] **Expo Router** + **typed routes** for deep links (`invoice/:id`).
- [ ] **EAS Update** for quick fixes after launch.
- [ ] **expo-camera** or Vision Camera for barcode.
- [ ] **Safe area** on all screens; test **RTL** if you mirror Urdu from web.

---

## 7. What not to do

- Don’t embed **service role** keys in the app.
- Don’t rely on **undocumented** Server Action POST payloads from RN.
- Don’t ship **without** testing RLS as an authenticated real user (not service role).

---

## 8. Quick start commands (reference)

```bash
# New Expo app (after installing Node / Xcode / Android Studio)
npx create-expo-app@latest pos-mobile
cd pos-mobile
npx expo install expo-router expo-secure-store @supabase/supabase-js
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install @shopify/flash-list expo-image expo-haptics expo-camera
```

Enable **new architecture** if templates recommend it (Expo SDK 52+ defaults are fine).

---

## 9. Link to this repo

- Web POS reference: `web/src/components/dashboard/pos-sale-client.tsx`
- Invoice logic: `web/src/lib/invoices/actions.ts` (mirror behavior, not copy-paste Server Actions into RN)
- Products search API: `web/src/app/api/dashboard/products/search/route.ts` (optional HTTP wrapper; or query Supabase directly with same filters)

---

*This is a guideline, not a guarantee of timelines — adjust per team size and backend gaps.*
