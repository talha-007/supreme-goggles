# Multi-Business POS Expansion Plan

## Goal

Evolve the current POS into a configurable platform that supports multiple business types without splitting into separate apps:

- Restaurants
- Medical stores / pharmacies
- General stores / retail shops
- Small shops / mixed inventory counters

---

## Product Strategy

Build one core POS engine and add vertical behavior through:

1. **Business type profile** (restaurant, pharmacy, retail, shop)
2. **Feature flags / modules** per business type
3. **Config-driven UI** (fields, workflows, labels)
4. **Shared accounting/inventory backbone** (single source of truth)

This avoids duplicated codebases and keeps operations simpler.

---

## Phase 1 — Foundation (Business Type + Config)

## Objectives
- Add business type metadata and configuration at business level.
- Keep current behavior unchanged for existing businesses.

## Changes
- Add/confirm `businesses.type` enum with values like:
  - `retail_shop`
  - `general_store`
  - `restaurant`
  - `pharmacy`
- Add `business_settings` table (or JSONB on `businesses`) for vertical options:
  - `enable_table_service`
  - `enable_batch_expiry`
  - `enable_prescription_flow`
  - `enable_kot_printing`
  - `enable_quick_service_mode`
  - `default_tax_mode`, `rounding_rules`, etc.

## Output
- Per-business capability map resolved at login/layout level.

---

## Phase 2 — Capability Model

## Objectives
- Define what each vertical needs and map to reusable capabilities.

## Capability Buckets
- **Catalog**: variants, packs, dosage forms, recipe items
- **Pricing**: tiered prices, happy hour, insurance/copay, MRP rules
- **Inventory**: stock, low-stock, batch/expiry, lot traceability
- **Sales flow**: cart, table/KOT, prescription validation, barcode-heavy checkout
- **Compliance**: audit logs, restricted item handling, expiry warnings
- **Procurement**: supplier PO + receiving differences by vertical

## Output
- Matrix: `business_type -> required/optional capabilities`.

---

## Phase 3 — Vertical UX Tracks

## 3.1 Restaurants
- Menu-first catalog (categories, combos, modifiers/add-ons)
- Order states: new, preparing, served, settled
- Optional table management + kitchen ticket workflow
- Ingredient/recipe deduction (optional first release)

## 3.2 Medical Stores / Pharmacies
- Batch + expiry at stock level
- MRP / purchase / sell constraints
- Fast medicine search (name, generic, brand, barcode)
- Prescription-required product flag (soft validation initially)
- Near-expiry and expired stock dashboards

## 3.3 Retail / Shops / General Stores
- Existing flow remains default
- Better barcode and quick add support
- Optional pack/unit conversion (box/pcs, strip/tab)

---

## Phase 4 — Data Model Extensions

## New Tables (proposed)
- `product_batches` (product_id, batch_no, expiry_date, qty, cost)
- `product_recipes` (restaurant ingredient mapping)
- `order_tickets` (kitchen/KOT for restaurant)
- `prescription_links` (pharmacy reference metadata)
- `business_settings` (typed config per business)

## Existing Tables to Extend
- `products`:
  - `requires_prescription` (bool)
  - `mrp` (numeric, pharmacy)
  - `is_menu_item` (bool, restaurant)
- `invoice_items`:
  - optional batch reference
  - modifiers/add-ons JSON where needed

## Principles
- Backward compatible migrations only
- New columns nullable with safe defaults
- No disruption for existing shop workflows

---

## Phase 5 — API / Server Action Refactor

## Objectives
- Keep one unified flow but route vertical rules through strategy functions.

## Approach
- Introduce `salePolicy` resolver:
  - `getSalePolicy(businessType, settings)`
- Split finalize validations:
  - stock policy
  - price policy
  - compliance policy
- Keep core invoice save/finalize/reverse interface unchanged.

## Output
- Vertical rules isolated from UI components.

---

## Phase 6 — Frontend Architecture

## Objectives
- Reduce conditional sprawl in components.

## Approach
- Capability-driven rendering:
  - show/hide fields by capability map
- Shared components:
  - `SaleShell` + vertical plugins
- Keep dashboard cards generic; inject vertical panels when enabled.

## Output
- Maintainable UI that adapts by business profile.

---

## Phase 7 — Security and Compliance

## Objectives
- Ensure new vertical data is properly scoped and auditable.

## Checklist
- RLS policies for all new tables
- Search path fixed on new functions
- Audit trail for sensitive operations (especially pharmacy adjustments)
- Role controls for restricted actions (void, manual stock corrections)

---

## Phase 8 — Rollout Plan

## Stepwise rollout
1. Internal alpha on one test business per vertical
2. Pilot customers (1–3 per vertical)
3. Feedback sprint
4. Gradual enablement via feature flags

## Migration safety
- Add schema first, enable features later
- Dry-run scripts for batch backfill
- Rollback scripts for each migration phase

---

## KPIs (Success Metrics)

- Checkout completion time by vertical
- Invoice error rate / failed finalization
- Inventory mismatch incidents
- Reverse/void correctness rate
- User retention and daily active counters by business type

---

## Risks and Mitigation

- **Risk:** Over-complex UI  
  **Mitigation:** capability toggles + minimal default interface.

- **Risk:** Schema bloat  
  **Mitigation:** modular tables and strict naming/versioning.

- **Risk:** Performance regression  
  **Mitigation:** index strategy + query profiling each phase.

- **Risk:** Compliance gaps (pharmacy)  
  **Mitigation:** explicit compliance checklist before GA.

---

## Suggested Implementation Order (Engineering)

1. Business type + settings foundation
2. Capability resolver + policy layer
3. Pharmacy batch/expiry
4. Restaurant ticket flow
5. UI modularization and polish
6. KPI instrumentation and rollout controls

---

## Immediate Next Task

Create a detailed Phase 1 technical spec:
- exact SQL migrations,
- TypeScript types,
- settings schema,
- default values for existing businesses,
- backward compatibility tests.

