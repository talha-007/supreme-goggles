alter table public.invoices
  add column if not exists restaurant_table_id uuid references public.restaurant_tables (id) on delete set null;

alter table public.invoices
  add column if not exists waiter_id uuid references public.restaurant_waiters (id) on delete set null;

alter table public.invoices
  add column if not exists service_mode text not null default 'counter'
  check (service_mode in ('counter', 'dine_in', 'takeaway', 'delivery'));

alter table public.invoices
  add column if not exists restaurant_order_status text not null default 'new'
  check (restaurant_order_status in ('new', 'preparing', 'served', 'settled'));

create index if not exists invoices_business_table_status_idx
  on public.invoices (business_id, restaurant_table_id, restaurant_order_status);
