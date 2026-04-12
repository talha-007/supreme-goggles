-- Distinct category/brand names for a business (product forms, comboboxes).

create or replace function public.list_product_taxonomy(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cats jsonb;
  brs jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.business_members
    where user_id = auth.uid() and business_id = p_business_id
  ) then
    raise exception 'Access denied';
  end if;

  select coalesce(
    (select jsonb_agg(sq.x order by sq.x)
     from (
       select distinct trim(p.category) as x
       from public.products p
       where p.business_id = p_business_id
         and p.category is not null
         and trim(p.category) <> ''
     ) sq),
    '[]'::jsonb
  ) into cats;

  select coalesce(
    (select jsonb_agg(sq.x order by sq.x)
     from (
       select distinct trim(p.brand) as x
       from public.products p
       where p.business_id = p_business_id
         and p.brand is not null
         and trim(p.brand) <> ''
     ) sq),
    '[]'::jsonb
  ) into brs;

  return jsonb_build_object('categories', cats, 'brands', brs);
end;
$$;

grant execute on function public.list_product_taxonomy(uuid) to authenticated;
