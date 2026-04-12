-- Restore inventory on void when:
--   (1) stock_deducted_at is set (normal path), or
--   (2) sale stock_movements exist for this invoice (legacy / missing flag).
-- Previously only (1) ran, so reversals did nothing for older sales or if only the old reverse_invoice RPC was applied.

alter table public.invoices
  add column if not exists stock_deducted_at timestamptz;

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
    );

  if v_restore_stock then
    for r in
      select product_id, quantity
      from public.invoice_items
      where invoice_id = p_invoice_id
        and product_id is not null
    loop
      perform public.increment_stock(r.product_id, r.quantity);
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
        'in',
        r.quantity,
        null,
        p_invoice_id,
        'invoice',
        'Void / reversal — ' || coalesce(v_num, ''),
        auth.uid()
      );
    end loop;
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

grant execute on function public.reverse_invoice(uuid) to authenticated;
