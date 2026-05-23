# WhatsApp Alerts Implementation Plan

## Goal

Enable shop owners to send trusted WhatsApp alerts to:
- suppliers when the owner records purchases, and
- customers when sales are finalized on credit.

The design should control messaging cost while improving relationship trust between owners, suppliers, and customers.

---

## Problem Statement

Current idea has two options:
1. **Owner WhatsApp account sends message** (owner-controlled).
2. **Platform bot sends message** (centralized automation for all users).

Bot automation is convenient but increases recurring costs. Owner-sent messages are lower-cost and feel more authentic/trustworthy because recipients see the owner/business contact directly.

---

## Decision Summary (Recommended)

Use a **hybrid strategy**:
- **Phase 1 default:** owner-sent messages through WhatsApp deep link (no bot cost).
- **Phase 2 optional:** paid bot automation add-on for businesses that need scale/auto-reminders.

This gives immediate value with low risk/cost, while preserving a premium path later.

---

## Option Comparison

### Option A - Owner-Sent (WhatsApp deep link)

How it works:
- App generates message text from transaction details.
- App opens WhatsApp with prefilled message and recipient phone.
- Owner taps send from their own account.

Pros:
- Lowest cost.
- High trust (message comes from real owner number).
- Simple rollout and easier debugging.
- No per-message infrastructure billing from platform side.

Cons:
- Not fully automatic (owner must tap send).
- Delivery/read status not guaranteed in app unless we add manual confirmation.

### Option B - Central Bot

How it works:
- Platform bot sends alerts through WhatsApp API provider.
- Works automatically for all users/flows.

Pros:
- Full automation and scheduling possible.
- Potential centralized analytics.

Cons:
- Higher recurring cost (API + template + infra + retries).
- Requires strict consent/compliance management.
- Lower personal trust than owner account for some audiences.

---

## Scope

### In Scope (Phase 1)
- Supplier purchase alert draft + send button.
- Credit sale alert draft + send button.
- Message templates with variables (amount, due date, invoice/order number, business name).
- Per-contact opt-in toggle for WhatsApp alerts.
- Basic audit log: "alert prepared" and "owner opened WhatsApp".

### Out of Scope (Phase 1)
- Fully automatic sending.
- Delivery/read receipts.
- Bulk campaigns.
- AI chatbot behavior.

---

## Product Flow

### Supplier Purchase Flow
1. Owner finalizes purchase order / supplier bill.
2. App shows `Send WhatsApp alert` CTA.
3. App opens WhatsApp with supplier phone + prefilled summary.
4. Owner sends from their own number.

### Credit Customer Flow
1. Owner/cashier finalizes credit sale invoice.
2. App shows `Send credit reminder` CTA.
3. App opens WhatsApp with customer phone + due amount + invoice reference.
4. Owner sends.

---

## Technical Design

### 1) Data Model Changes

Add fields (if missing):
- `customers.whatsapp_phone` (normalized E.164 format)
- `customers.whatsapp_opt_in` (boolean, default false)
- `suppliers.whatsapp_phone` (normalized E.164 format)
- `suppliers.whatsapp_opt_in` (boolean, default false)

Optional tracking table:
- `message_alert_events`
  - `id`
  - `business_id`
  - `entity_type` (`customer` | `supplier`)
  - `entity_id`
  - `channel` (`whatsapp_owner`)
  - `event_type` (`prepared` | `opened`)
  - `reference_type` (`invoice` | `purchase_order`)
  - `reference_id`
  - `created_at`

### 2) Message Template Builder

Create reusable helper:
- `buildSupplierPurchaseAlert(...)`
- `buildCreditSaleAlert(...)`

Rules:
- Plain-language, short, human tone.
- Include business name and owner signature.
- Support Urdu/English later via i18n keys.

### 3) WhatsApp Launcher

Single utility:
- `openWhatsAppMessage(phone, text)`

Behavior:
- Validate/normalize phone.
- Encode text safely.
- Try `whatsapp://send` first; fallback to web URL.
- Show friendly error if WhatsApp not installed.

### 4) UI Integration Points

Add CTA in:
- `purchase-orders` completion/receipt view.
- `invoices` detail + credit finalize success path.
- Optional in `quick-sale` credit success receipt sheet.

### 5) Permissions and Roles

Phase 1 recommendation:
- Owner and manager can send supplier/customer alerts.
- Cashier can prepare draft but owner/manager confirmation can be required by setting (optional).

---

## Compliance and Trust Requirements

- Explicit opt-in per customer/supplier.
- Clear text: "You agree to receive WhatsApp transaction alerts."
- Easy opt-out toggle in customer/supplier edit forms.
- Include business identity in every message.
- No promotional messaging in transactional template path.

---

## Rollout Plan

## Phase 1 - Owner-Sent MVP (1-2 weeks)
- Build template helpers + launcher utility.
- Add phone + opt-in fields in forms.
- Add CTA buttons in supplier purchase and credit invoice flows.
- Add event logs (`prepared`, `opened`).
- QA on Android/iOS with local language text.

## Phase 2 - Reliability and UX (1 week)
- Add "copy message" fallback.
- Add resend shortcuts from invoice/order detail pages.
- Add settings toggles for default auto-open behavior.
- Add simple report: alerts opened per day.

## Phase 3 - Paid Bot Add-on (future)
- Bot provider integration.
- Template approvals + compliance pipeline.
- Retry queue, delivery states, and billing metering.
- Offer as subscription add-on only for businesses that need automation.

---

## Success Metrics

- % of credit invoices where owner opens WhatsApp alert.
- % of supplier purchases followed by alert open action.
- Reduction in overdue confusion/disputes.
- Owner retention for businesses using alerts.
- Bot cost avoided versus centralized default bot strategy.

---

## Risks and Mitigations

- **Risk:** owner does not tap send every time.  
  **Mitigation:** strong CTA, reminders, and "send later" list.

- **Risk:** invalid phone formats.  
  **Mitigation:** normalize to E.164 on save and validate early.

- **Risk:** spam complaints.  
  **Mitigation:** opt-in only + transactional use + opt-out support.

- **Risk:** inconsistent messaging tone.  
  **Mitigation:** central templates with limited editable sections.

---

## Recommendation to Execute Now

Start with **Phase 1 owner-sent WhatsApp alerts**.  
It directly supports your trust objective with suppliers/customers and avoids immediate bot costs. Keep bot automation as a premium optional path after usage and ROI are proven.
