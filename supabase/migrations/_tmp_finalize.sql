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
      perform public.deduct_sale_stock_fefo(
        v_inv.business_id,
        r.product_id,
        r.quantity,
        p_invoice_id,
        'invoice',
        'Sale - ' || coalesce(v_num, ''),
        r.purchase_price
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
      perform public.deduct_sale_stock_fefo(
        v_inv.business_id,
        r.product_id,
        r.quantity,
        p_invoice_id,
        'invoice',
        'Sale - ' || coalesce(v_num, ''),
        r.purchase_price
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

-- ─── Reverse: restore batch stock when batch movements exist ───

create or replace function public.reverse_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_total_paid numeric;
  r record;
  v_num text;
  v_restore_stock boolean;
  v_from_items boolean;
  v_has_batch_out boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_inv
  from public.invoices
  where id = p_invoice_id;

  if v_inv is null then
    raise exception 'Invoice not found';
  end if;

  if not exists (
    select 1 from public.business_members
    where user_id = auth.uid() and business_id = v_inv.business_id
  ) then
    raise exception 'Access denied';
  end if;

  if v_inv.status = 'draft'::invoice_status then
    raise exception 'Draft invoices cannot be reversed here. Delete the draft instead.';
  end if;

  if v_inv.status = 'cancelled'::invoice_status then
    raise exception 'Invoice is already cancelled.';
  end if;

  select invoice_number into v_num from public.invoices where id = p_invoice_id;

  v_restore_stock := v_inv.stock_deducted_at is not null
    or exists (
      select 1
      from public.stock_movements sm
      where sm.reference_id = p_invoice_id
        and sm.type = 'out'
        and coalesce(sm.quantity::numeric, 0) > 0
    )
    or (
      v_inv.status in (
        'unpaid'::invoice_status,
        'partial'::invoice_status,
        'paid'::invoice_status
      )
      and exists (
        select 1
        from public.invoice_items ii
        where ii.invoice_id = p_invoice_id
          and ii.product_id is not null
          and coalesce(ii.quantity::numeric, 0) > 0
      )
    );

  v_has_batch_out := exists (
    select 1
    from public.stock_movements sm
    where sm.reference_id = p_invoice_id
      and sm.type = 'out'
      and sm.product_batch_id is not null
  );

  v_from_items := exists (
    select 1
    from public.invoice_items ii
    where ii.invoice_id = p_invoice_id
      and ii.product_id is not null
  );

  if v_restore_stock then
    if v_has_batch_out then
      perform public.restore_sale_stock_batches(
        v_inv.business_id,
        p_invoice_id,
        'Void / reversal - ' || coalesce(v_num, '')
      );
    elsif v_from_items then
      for r in
        select
          ii.product_id,
          sum(ii.quantity)::numeric as quantity,
          coalesce(bool_or(p.is_menu_item), false) as is_menu_item
        from public.invoice_items ii
        left join public.products p on p.id = ii.product_id
        where ii.invoice_id = p_invoice_id
          and ii.product_id is not null
        group by ii.product_id
      loop
        if not r.is_menu_item then
          perform public.increment_stock(r.product_id, r.quantity);
          insert into public.stock_movements (
            business_id, product_id, type, quantity, unit_cost,
            reference_id, reference_type, note, created_by
          ) values (
            v_inv.business_id, r.product_id, 'in', r.quantity, null,
            p_invoice_id, 'invoice', 'Void / reversal - ' || coalesce(v_num, ''), auth.uid()
          );
        end if;
      end loop;
    else
      for r in
        select
          sm.product_id,
          sum(sm.quantity::numeric) as quantity
        from public.stock_movements sm
        where sm.reference_id = p_invoice_id
          and sm.type = 'out'
          and coalesce(sm.quantity::numeric, 0) > 0
        group by sm.product_id
      loop
        perform public.increment_stock(r.product_id, r.quantity);
        insert into public.stock_movements (
          business_id, product_id, type, quantity, unit_cost,
          reference_id, reference_type, note, created_by
        ) values (
          v_inv.business_id, r.product_id, 'in', r.quantity, null,
          p_invoice_id, 'invoice', 'Void / reversal - ' || coalesce(v_num, ''), auth.uid()
        );
      end loop;
    end if;
  end if;

  select coalesce(sum(amount), 0) into v_total_paid
  from public.payments
  where invoice_id = p_invoice_id;

  if v_inv.customer_id is not null and v_total_paid > 0 then
    update public.customers
    set
      outstanding_balance = outstanding_balance + v_total_paid,
      updated_at = now()
    where id = v_inv.customer_id;
  end if;

  delete from public.payments where invoice_id = p_invoice_id;

  update public.invoices
  set
    status = 'cancelled'::invoice_status,
    paid_amount = 0,
    stock_deducted_at = null,
    updated_at = now()
  where id = p_invoice_id;
end;
$$;

