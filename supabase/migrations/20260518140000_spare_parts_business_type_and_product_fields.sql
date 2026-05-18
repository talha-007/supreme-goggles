-- Spare parts / auto-parts shop: business type + catalog fields + search_products + optional menu filter.

alter type public.business_type add value if not exists 'spare_parts';

alter table public.products
  add column if not exists oem_part_number text,
  add column if not exists alternate_part_numbers text,
  add column if not exists application_notes text,
  add column if not exists manufacturer text;

comment on column public.products.oem_part_number is 'OEM / factory part number for spare-parts catalogs.';
comment on column public.products.alternate_part_numbers is 'Free-text interchange / alternate numbers (comma-separated or notes).';
comment on column public.products.application_notes is 'Vehicle or application fitment notes (e.g. Corolla 2009–2013).';
comment on column public.products.manufacturer is 'Manufacturer label (may differ from brand on the shelf).';

create index if not exists products_oem_part_number_trgm_idx
  on public.products using gin (oem_part_number gin_trgm_ops)
  where oem_part_number is not null;

create index if not exists products_manufacturer_trgm_idx
  on public.products using gin (manufacturer gin_trgm_ops)
  where manufacturer is not null;

-- Replace search_products: spare-parts fields in search + optional menu-only filter for restaurant POS.
drop function if exists public.search_products(uuid, text, boolean, int, int);

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
