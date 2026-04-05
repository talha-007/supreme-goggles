-- Include brand in catalog search (name / SKU / barcode / brand).

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
      or coalesce(p.brand, '') ilike '%' || trim(p_query) || '%'
    )
    and (
      not p_low_stock_only
      or (p.reorder_level > 0 and p.current_stock <= p.reorder_level)
    )
  order by p.name asc
  limit least(coalesce(nullif(p_limit, 0), 50), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;
