-- Suppliers, purchase orders, receiving stock, optional audit trail.
-- Run via Supabase CLI or paste in SQL Editor.

-- ─── suppliers ───────────────────────────────────────────────
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_business_id_idx on public.suppliers (business_id);

-- ─── purchase order status ───────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'purchase_order_status') then
    create type public.purchase_order_status as enum (
      'draft',
      'ordered',
      'partial',
      'received',
      'cancelled'
    );
  end if;
end$$;

-- ─── purchase_orders ─────────────────────────────────────────
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  po_number text not null,
  status public.purchase_order_status not null default 'draft',
  total_amount numeric(14, 2) not null default 0,
  notes text,
  ordered_at timestamptz,
  received_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, po_number)
);

create index if not exists purchase_orders_business_id_idx on public.purchase_orders (business_id);
create index if not exists purchase_orders_supplier_id_idx on public.purchase_orders (supplier_id);

-- ─── purchase_order_items ────────────────────────────────────
create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  qty_ordered numeric(14, 4) not null check (qty_ordered > 0),
  qty_received numeric(14, 4) not null default 0 check (qty_received >= 0),
  unit_cost numeric(14, 4) not null check (unit_cost >= 0),
  line_total numeric(14, 2) not null,
  created_at timestamptz not null default now()
);

create index if not exists purchase_order_items_po_id_idx on public.purchase_order_items (purchase_order_id);

-- ─── stock movements (audit) ─────────────────────────────────
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  type text not null check (type in ('in', 'out', 'adjustment')),
  quantity numeric(14, 4) not null,
  unit_cost numeric(14, 4),
  reference_id uuid,
  reference_type text,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_business_id_idx on public.stock_movements (business_id);
create index if not exists stock_movements_product_id_idx on public.stock_movements (product_id);

-- ─── increment_stock (atomic, membership-checked) ────────────
create or replace function public.increment_stock(p_product_id uuid, p_qty numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Invalid quantity';
  end if;

  select business_id into v_business_id from public.products where id = p_product_id;
  if v_business_id is null then
    raise exception 'Product not found';
  end if;

  if not exists (
    select 1 from public.business_members
    where user_id = auth.uid() and business_id = v_business_id
  ) then
    raise exception 'Access denied';
  end if;

  update public.products
  set
    current_stock = current_stock + p_qty,
    updated_at = now()
  where id = p_product_id;
end;
$$;

grant execute on function public.increment_stock(uuid, numeric) to authenticated;

-- ─── PO number generator ─────────────────────────────────────
create or replace function public.generate_po_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
begin
  if not exists (
    select 1 from public.business_members
    where user_id = auth.uid() and business_id = p_business_id
  ) then
    raise exception 'Access denied';
  end if;

  select coalesce(max(
    (regexp_match(po_number, '^PO-(\d+)$'))[1]::int
  ), 0) + 1 into v_next
  from public.purchase_orders
  where business_id = p_business_id;

  return 'PO-' || lpad(v_next::text, 4, '0');
end;
$$;

grant execute on function public.generate_po_number(uuid) to authenticated;

-- ─── RLS ─────────────────────────────────────────────────────
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.stock_movements enable row level security;

-- Suppliers
drop policy if exists "suppliers_select" on public.suppliers;
create policy "suppliers_select" on public.suppliers
  for select using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );
drop policy if exists "suppliers_insert" on public.suppliers;
create policy "suppliers_insert" on public.suppliers
  for insert with check (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );
drop policy if exists "suppliers_update" on public.suppliers;
create policy "suppliers_update" on public.suppliers
  for update using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );
drop policy if exists "suppliers_delete" on public.suppliers;
create policy "suppliers_delete" on public.suppliers
  for delete using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

-- Purchase orders
drop policy if exists "po_select" on public.purchase_orders;
create policy "po_select" on public.purchase_orders
  for select using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );
drop policy if exists "po_insert" on public.purchase_orders;
create policy "po_insert" on public.purchase_orders
  for insert with check (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );
drop policy if exists "po_update" on public.purchase_orders;
create policy "po_update" on public.purchase_orders
  for update using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );
drop policy if exists "po_delete" on public.purchase_orders;
create policy "po_delete" on public.purchase_orders
  for delete using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

-- PO items (via parent PO business)
drop policy if exists "poi_select" on public.purchase_order_items;
create policy "poi_select" on public.purchase_order_items
  for select using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id
        and po.business_id in (select business_id from public.business_members where user_id = auth.uid())
    )
  );
drop policy if exists "poi_insert" on public.purchase_order_items;
create policy "poi_insert" on public.purchase_order_items
  for insert with check (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id
        and po.business_id in (select business_id from public.business_members where user_id = auth.uid())
    )
  );
drop policy if exists "poi_update" on public.purchase_order_items;
create policy "poi_update" on public.purchase_order_items
  for update using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id
        and po.business_id in (select business_id from public.business_members where user_id = auth.uid())
    )
  );
drop policy if exists "poi_delete" on public.purchase_order_items;
create policy "poi_delete" on public.purchase_order_items
  for delete using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id
        and po.business_id in (select business_id from public.business_members where user_id = auth.uid())
    )
  );

-- Stock movements
drop policy if exists "sm_select" on public.stock_movements;
create policy "sm_select" on public.stock_movements
  for select using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );
drop policy if exists "sm_insert" on public.stock_movements;
create policy "sm_insert" on public.stock_movements
  for insert with check (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );
