-- Performance hardening: add covering indexes for remaining unindexed foreign keys.

create index if not exists idx_customers_created_by
  on public.customers (created_by);

create index if not exists idx_invitations_business_id
  on public.invitations (business_id);

create index if not exists idx_invitations_invited_by
  on public.invitations (invited_by);

create index if not exists idx_invoices_created_by
  on public.invoices (created_by);

create index if not exists idx_payments_received_by
  on public.payments (received_by);

create index if not exists idx_products_created_by
  on public.products (created_by);

create index if not exists idx_purchase_order_items_product_id
  on public.purchase_order_items (product_id);

create index if not exists idx_purchase_orders_created_by
  on public.purchase_orders (created_by);

create index if not exists idx_stock_movements_created_by
  on public.stock_movements (created_by);
