-- Restaurant menu items should not enforce inventory stock checks.
-- Skip decrement_stock and stock movements when products.is_menu_item = true.

create or replace function public.finalize_draft_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  r record;
  v_num text;
  v_stock_touched boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_inv
  from public.invoices
  where id = p_invoice_id
  for update;

  if v_inv is null then
    raise exception 'Invoice not found';
  end if;

  if not exists (
    select 1 from public.business_members
    where user_id = auth.uid() and business_id = v_inv.business_id
  ) then
    raise exception 'Access denied';
  end if;

  if v_inv.status <> 'draft'::invoice_status then
    raise exception 'Invoice is not a draft.';
  end if;

  if not exists (select 1 from public.invoice_items where invoice_id = p_invoice_id) then
    raise exception 'Add line items before finalizing.';
  end if;

  select invoice_number into v_num from public.invoices where id = p_invoice_id;

  for r in
    select
      ii.product_id,
      sum(ii.quantity)::numeric as quantity,
      max(p.purchase_price) as purchase_price,
      coalesce(bool_or(p.is_menu_item), false) as is_menu_item
    from public.invoice_items ii
    left join public.products p on p.id = ii.product_id
    where ii.invoice_id = p_invoice_id
      and ii.product_id is not null
    group by ii.product_id
  loop
    if not r.is_menu_item then
      perform public.decrement_stock(r.product_id, r.quantity);
      insert into public.stock_movements (
        business_id,
        product_id,
        type,
        quantity,
        unit_cost,
        reference_id,
        reference_type,
        note,
        created_by
      ) values (
        v_inv.business_id,
        r.product_id,
        'out',
        r.quantity,
        r.purchase_price,
        p_invoice_id,
        'invoice',
        'Sale — ' || coalesce(v_num, ''),
        auth.uid()
      );
      v_stock_touched := true;
    end if;
  end loop;

  update public.invoices
  set
    status = 'unpaid'::invoice_status,
    stock_deducted_at = case when v_stock_touched then now() else null end,
    updated_at = now()
  where id = p_invoice_id;

  if v_inv.customer_id is not null then
    update public.customers
    set
      outstanding_balance = outstanding_balance + round(coalesce(v_inv.total_amount, 0)::numeric, 2),
      updated_at = now()
    where id = v_inv.customer_id;
  end if;
end;
$$;

grant execute on function public.finalize_draft_invoice(uuid) to authenticated;

create or replace function public.finalize_draft_invoice_cash(
  p_invoice_id uuid,
  p_amount_received numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  r record;
  v_num text;
  v_total numeric;
  v_rounded numeric;
  v_stock_touched boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_inv
  from public.invoices
  where id = p_invoice_id
  for update;

  if v_inv is null then
    raise exception 'Invoice not found';
  end if;

  if not exists (
    select 1 from public.business_members
    where user_id = auth.uid() and business_id = v_inv.business_id
  ) then
    raise exception 'Access denied';
  end if;

  if v_inv.status <> 'draft'::invoice_status then
    raise exception 'Invoice is not a draft.';
  end if;

  if not exists (select 1 from public.invoice_items where invoice_id = p_invoice_id) then
    raise exception 'Add line items before finalizing.';
  end if;

  v_total := round(coalesce(v_inv.total_amount, 0)::numeric, 2);

  if p_amount_received is not null then
    if p_amount_received <= 0 then
      raise exception 'Enter a valid amount received.';
    end if;
    v_rounded := round(p_amount_received::numeric, 2);
    if v_rounded + 0.005 < v_total then
      raise exception 'Amount received is less than the invoice total.';
    end if;
  end if;

  select invoice_number into v_num from public.invoices where id = p_invoice_id;

  for r in
    select
      ii.product_id,
      sum(ii.quantity)::numeric as quantity,
      max(p.purchase_price) as purchase_price,
      coalesce(bool_or(p.is_menu_item), false) as is_menu_item
    from public.invoice_items ii
    left join public.products p on p.id = ii.product_id
    where ii.invoice_id = p_invoice_id
      and ii.product_id is not null
    group by ii.product_id
  loop
    if not r.is_menu_item then
      perform public.decrement_stock(r.product_id, r.quantity);
      insert into public.stock_movements (
        business_id,
        product_id,
        type,
        quantity,
        unit_cost,
        reference_id,
        reference_type,
        note,
        created_by
      ) values (
        v_inv.business_id,
        r.product_id,
        'out',
        r.quantity,
        r.purchase_price,
        p_invoice_id,
        'invoice',
        'Sale — ' || coalesce(v_num, ''),
        auth.uid()
      );
      v_stock_touched := true;
    end if;
  end loop;

  update public.invoices
  set
    status = 'unpaid'::invoice_status,
    stock_deducted_at = case when v_stock_touched then now() else null end,
    updated_at = now()
  where id = p_invoice_id;

  if v_inv.customer_id is not null then
    update public.customers
    set
      outstanding_balance = outstanding_balance + v_total,
      updated_at = now()
    where id = v_inv.customer_id;
  end if;

  insert into public.payments (
    business_id,
    invoice_id,
    amount,
    method,
    received_by
  ) values (
    v_inv.business_id,
    p_invoice_id,
    v_total,
    'cash',
    auth.uid()
  );
end;
$$;

grant execute on function public.finalize_draft_invoice_cash(uuid, numeric) to authenticated;
