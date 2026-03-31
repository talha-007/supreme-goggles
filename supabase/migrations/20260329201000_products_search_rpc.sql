-- Fast catalog search for large product lists (trigram indexes + RPC).

create extension if not exists pg_trgm;

create index if not exists products_name_trgm_idx on public.products using gin (name gin_trgm_ops);
create index if not exists products_sku_trgm_idx on public.products using gin (sku gin_trgm_ops) where sku is not null;
create index if not exists products_barcode_trgm_idx on public.products using gin (barcode gin_trgm_ops) where barcode is not null;

create index if not exists products_business_id_name_idx on public.products (business_id, name);

comment on index public.products_name_trgm_idx is 'Speeds ILIKE substring search on product name.';

-- Search / browse products for the signed-in member's business (max 100 rows).
create or replace function public.search_products(
  p_business_id uuid,
  p_query text,
  p_low_stock_only boolean,
  p_limit int,
  p_offset int
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
    and (
      p_query is null
      or trim(p_query) = ''
      or p.name ilike '%' || trim(p_query) || '%'
      or coalesce(p.sku, '') ilike '%' || trim(p_query) || '%'
      or coalesce(p.barcode, '') ilike '%' || trim(p_query) || '%'
    )
    and (
      not p_low_stock_only
      or (p.reorder_level > 0 and p.current_stock <= p.reorder_level)
    )
  order by p.name asc
  limit least(coalesce(nullif(p_limit, 0), 50), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.search_products(uuid, text, boolean, int, int) to authenticated;
