-- NULL purchase_price or stock made the whole product line NULL in SUM(); treat as 0.

create or replace function public.business_inventory_cost(p_business_id uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
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

  return coalesce(
    (
      select round(
        sum(
          coalesce(p.current_stock, 0)::numeric * coalesce(p.purchase_price, 0)::numeric
        ),
        2
      )
      from public.products p
      where p.business_id = p_business_id
        and p.is_active = true
    ),
    0
  );
end;
$$;
