# Owner notifications, WhatsApp, and reports (roadmap)

This is a planning list—not all items are built yet. Use it to prioritize integrations.

## WhatsApp

| Idea | Purpose | Typical approach |
|------|---------|------------------|
| Daily sales summary | Owner sees yesterday’s revenue without opening the app | WhatsApp Business API / Twilio / Meta Cloud API + scheduled Edge Function |
| Low stock digest | Morning list of SKUs below reorder level | Same + query `products` |
| Overdue invoices | Customers with unpaid balance past due date | Invoice query + template message |
| PO received confirmation | “Stock arrived” when PO marked received | Trigger on `receiveStock` or DB webhook |
| Weekly P&L-style snapshot | Revenue vs. simple costs (optional) | Report job + message |
| **Click-to-chat** (quick win) | No API: open `wa.me` with prefilled text from dashboard | Client-side link with `encodeURIComponent` |

**Note:** WhatsApp Business API requires Meta Business verification and templates for outbound messages outside the 24h window.

## In-app / email

| Channel | Use case |
|---------|----------|
| In-app notification center | Low stock, failed payment sync, draft POs waiting confirm |
| Email (Resend / SendGrid / Supabase) | Weekly report PDF, password reset (if you add auth email) |
| Push (PWA / web push) | Optional for owners on mobile |

## Reports worth automating

| Report | Audience | Data source |
|--------|----------|-------------|
| Today / yesterday sales | Owner | `invoices` (exclude draft/cancelled) |
| Top products by revenue | Owner | `invoice_items` join `invoices` |
| Stock valuation | Owner | `products.current_stock × purchase_price` |
| Customer receivables aging | Owner | `invoices` unpaid/partial + `due_date` |
| Purchase order pipeline | Owner | `purchase_orders` by status |
| Supplier spend (period) | Owner | PO totals by supplier |

## Triggers (when to notify)

- Threshold: stock below reorder level (batch daily or immediate).
- Invoice: large unpaid amount, due date passed.
- PO: draft with lines unlinked (your existing rule)—optional nudge.
- System: migration/ job failure if you add background workers.

## Suggested implementation order

1. **Click-to-chat WhatsApp** links from dashboard (zero API cost).
2. **Email** one daily digest (Edge Function + cron + provider).
3. **In-app** notification table + bell icon.
4. **WhatsApp Business API** for automated templates once volume justifies Meta setup.
