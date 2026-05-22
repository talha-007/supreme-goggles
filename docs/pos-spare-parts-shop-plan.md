# POS for Spare Parts Shop - Step-by-Step Plan

This document is a **concrete implementation plan** for supporting **auto / motorcycle / machinery spare parts** counters on top of the existing Taplite POS. It complements the broader roadmap in [`multi-business-pos-expansion-plan.md`](./multi-business-pos-expansion-plan.md).

---

## 1. Goal and scope

### Goal

Let a spare parts business use the same **invoice + stock + POS** stack as a general shop, with workflows and catalog metadata tuned for **part numbers, brands, interchangeability, and fast lookup** at the counter.

### In scope (MVP → v1)

- Onboarding: explicit **“Spare parts / auto parts”** business type (or equivalent flag).
- Catalog: fields and search that match how parts are sold (SKU, OEM, brand, category, optional vehicle/application text).
- POS: **barcode / part-number–first** checkout, dense list/grid, low friction for repeat SKUs.
- Inventory & purchasing: reuse existing **products, stock movements, POs, suppliers**; optional spare-parts–specific reports later.

### Out of scope (initially; can be phased later)

- Full **fitment database** (year/make/model engine with ACES-style data feeds).
- Multi-warehouse bin locations (can reuse simple `unit` / notes or add later).
- Core returns/RMA workflow (if not already covered by void/credit notes-confirm product decision).

---

## 2. Current state (what you already have)

Use this as the baseline so work is incremental, not a rewrite.

| Area | Today (relevant files / behavior) |
|------|-------------------------------------|
| Business types | Postgres enum `business_type`; app union in `web/src/lib/business/capabilities.ts`. Onboarding list in `web/src/app/onboarding/onboarding-form.tsx`. |
| Shop POS | Dashboard loads `getPosCatalogProducts()` **without** `menuOnly` → all active products. `web/src/app/(app)/dashboard/page.tsx`, `web/src/lib/invoices/new-invoice-data.ts`. |
| Restaurant POS | `menuOnly: true` + `is_menu_item`; waiter board embeds `PosSaleClient`. |
| Product model | Already includes `sku`, `barcode`, `brand`, `category`, `unit`, `mrp`, etc. (`getPosCatalogProducts` select list). |
| Nav | `AppShell` hides restaurant links for non-restaurant types (`web/src/components/app-shell.tsx`). |

**Conclusion:** Spare parts can start as a **new `business_type` + UX/search/labels**, without a second POS engine-unless fitment later forces new tables.

---

## 3. Product decisions (lock these before coding)

Work through these once; they drive schema and UI.

1. **Business type strategy**  
   - **Option A (recommended for MVP):** Add enum value `spare_parts` (or `auto_parts`) and map it in `BusinessType` + `resolveBusinessCapabilities` like `shop` (no restaurant flags unless toggled).  
   - **Option B:** Reuse `shop` / `retailer` and add a boolean `business_settings.spare_parts_mode` (fewer enum values, less clear in analytics).

2. **Minimum catalog fields** for v1 (beyond existing columns)  
   Examples: `oem_part_number`, `alternate_part_numbers` (text or JSONB), `application_notes` (free text for “Corolla 2009–2013”), `manufacturer`. Pick the smallest set that real users ask for.

3. **POS search priority**  
   Order of matching: barcode → SKU → OEM → name → brand (adjust per user research).

4. **Receipt / invoice line display**  
   Show part number + brand on PDF/print for spare parts businesses only (capability or type check).

---

## 4. Step-by-step implementation plan

### Phase 0 - Discovery and alignment (0.5–1 day)

- [ ] Interview 1–2 spare parts shops: top 5 fields they read while selling; how they handle interchange; returns.
- [ ] Walk through current flow: onboarding → products → dashboard POS → finalize invoice → stock.
- [ ] List gaps vs Phase 3 decisions (fields, search, print).

**Output:** Short “requirements lock” note (can live as a subsection in this file or a ticket).

---

### Phase 1 - Database and types

- [ ] Add new value to `public.business_type` via migration (`alter type ... add value`).  
- [ ] Update RPC `create_business_with_owner` if signature or defaults need to know the new type (follow existing migrations that touch it).  
- [ ] Add any **new nullable columns** on `products` (or a child table if you want clean separation) with safe defaults; backfill not required.  
- [ ] RLS: confirm `products` / `invoices` policies already key off `business_id` (no change expected).  
- [ ] Regenerate or hand-update TypeScript DB types if the project uses them.

**Output:** Migrations applied locally; new businesses can be created with the new type.

---

### Phase 2 - App model and onboarding

- [ ] Extend `BusinessType` in `web/src/lib/business/capabilities.ts`.  
- [ ] Add onboarding option + `messages/en.json` / `messages/ur.json` keys (`onboarding.typeSpareParts` etc.).  
- [ ] Ensure `resolveBusinessCapabilities` treats spare parts like shop for flags **unless** you introduce spare-parts-specific toggles later.  
- [ ] Confirm `AppShell` nav: spare parts should **not** see restaurant-only links (same as shop-verify no new branches needed).

**Output:** User can register a spare parts business and land on dashboard like a shop.

---

### Phase 3 - Catalog UI (products)

- [ ] Extend product create/edit forms to show new fields when `business.type === spare_parts` (or when `spare_parts_mode` is on).  
- [ ] Catalog list: optional columns (OEM, brand) and filters for spare parts.  
- [ ] Import (if CSV exists): map new columns in any import path.

**Output:** Staff can maintain a parts-oriented catalog without hacks in “description”.

---

### Phase 4 - POS UX (`PosSaleClient` and catalog loaders)

- [ ] Pass business type or a derived flag (`isSparePartsPos`) from server pages into `PosSaleClient` / deferred wrapper.  
- [ ] **Search:** implement multi-field search (barcode, SKU, OEM, name, brand) with debounced query; highlight matched field in results.  
- [ ] **Layout:** optional compact row layout for dense part lists (desktop).  
- [ ] **Stock cues:** show `current_stock` / low stock where helpful (respect existing stock rules on finalize).  
- [ ] Keep `getPosCatalogProducts` efficient: consider server-side `or` filter for search instead of loading 500 rows when search grows (iteration 2).

**Output:** Counter can find a line by part number as fast as by name.

---

### Phase 5 - Invoicing, PDF, and customer defaults

- [ ] Invoice line labels: show SKU/OEM/brand on screen for spare parts.  
- [ ] PDF/receipt template: conditional block for spare parts (reuse invoice print pipeline).  
- [ ] Default customer type / walk-in: confirm no change, or add “workshop / garage” customer tag later.

**Output:** Printed ticket matches what workshops expect.

---

### Phase 6 - Quality, docs, and rollout

- [ ] Manual test matrix: new business, add 20 parts, sell mixed basket, void, low stock, PO receive.  
- [ ] Add a short **user-facing** note in README or in-app help: “Spare parts mode”.  
- [ ] Pilot one real business; collect search/pain points.  
- [ ] Optional: WhatsApp / digest copy mentions “low stock” by SKU if already supported.

**Output:** Safe rollout behind the new business type (existing customers unchanged).

---

## 5. Later phases (optional backlog)

Document only; schedule after v1 is stable.

- **Fitment:** tables `vehicle_models`, `product_fitment`, or integration with an external catalog API.  
- **Interchange matrix:** link `product_id` ↔ `equivalent_product_id` with provenance.  
- **Bin location:** `aisle`, `rack`, `bin` on stock or product_location.  
- **Core deposit / exchange:** separate line type or deposit SKU pattern.

---

## 6. Acceptance criteria (MVP)

1. New **spare parts** business type can be selected at onboarding and saved in `businesses.type`.  
2. Product form supports the agreed spare-parts fields for that type.  
3. Dashboard POS finds parts by **barcode or primary part number** within ~1s on a typical catalog size.  
4. Finalized sale still respects existing **stock deduction and invoice** rules.  
5. No regression for **shop, restaurant, pharmacy** flows (smoke test each).

---

## 7. References in this repo

| Topic | Location |
|-------|----------|
| Business capabilities | `web/src/lib/business/capabilities.ts` |
| Onboarding types | `web/src/app/onboarding/onboarding-form.tsx` |
| POS catalog query | `web/src/lib/invoices/new-invoice-data.ts` → `getPosCatalogProducts` |
| Shop dashboard POS | `web/src/app/(app)/dashboard/page.tsx` |
| POS client | `web/src/components/dashboard/pos-sale-client.tsx` |
| Sidebar rules | `web/src/components/app-shell.tsx` |
| Broader multi-vertical plan | `docs/multi-business-pos-expansion-plan.md` |

---

## 8. Suggested order of execution (engineering checklist)

1. Phase 1 (DB enum + product columns)  
2. Phase 2 (TS types + onboarding + i18n)  
3. Phase 4 (POS search + wiring type flag) - *can overlap lightly with Phase 3*  
4. Phase 3 (product forms + catalog filters)  
5. Phase 5 (invoice/PDF polish)  
6. Phase 6 (QA + pilot)

This order gets a **usable counter** early, then deepens catalog management and paperwork.
