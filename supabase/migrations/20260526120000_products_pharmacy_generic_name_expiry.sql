-- Pharmacy / medical store: generic (INN) name + optional expiry date on products.

alter table public.products
  add column if not exists generic_name text,
  add column if not exists expiry_date date;

comment on column public.products.generic_name is
  'Pharmacy flow: generic / INN name (e.g. Paracetamol); searchable alongside brand and name.';
comment on column public.products.expiry_date is
  'Pharmacy flow: optional expiry for simplified single-batch tracking.';

create index if not exists products_generic_name_trgm_idx
  on public.products using gin (generic_name gin_trgm_ops)
  where generic_name is not null;

create index if not exists products_expiry_date_idx
  on public.products (business_id, expiry_date)
  where expiry_date is not null;

create or replace function public.search_products(
  p_business_id uuid,
  p_query text,
  p_low_stock_only boolean,
  p_limit int,
  p_offset int,
  p_menu_only boolean default false
)
returns setof public.products
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.products p
  where p.business_id = p_business_id
    and exists (
      select 1 from public.business_members bm
      where bm.user_id = auth.uid()
        and bm.business_id = p_business_id
    )
    and (not p_menu_only or p.is_menu_item = true)
    and (
      p_query is null
      or trim(p_query) = ''
      or p.name ilike '%' || trim(p_query) || '%'
      or coalesce(p.sku, '') ilike '%' || trim(p_query) || '%'
      or coalesce(p.barcode, '') ilike '%' || trim(p_query) || '%'
      or coalesce(p.brand, '') ilike '%' || trim(p_query) || '%'
      or coalesce(p.generic_name, '') ilike '%' || trim(p_query) || '%'
      or coalesce(p.oem_part_number, '') ilike '%' || trim(p_query) || '%'
      or coalesce(p.alternate_part_numbers, '') ilike '%' || trim(p_query) || '%'
      or coalesce(p.application_notes, '') ilike '%' || trim(p_query) || '%'
      or coalesce(p.manufacturer, '') ilike '%' || trim(p_query) || '%'
    )
    and (
      not p_low_stock_only
      or (p.reorder_level > 0 and p.current_stock <= p.reorder_level)
    )
  order by p.name asc
  limit least(coalesce(nullif(p_limit, 0), 50), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.search_products(uuid, text, boolean, int, int, boolean) to authenticated;
