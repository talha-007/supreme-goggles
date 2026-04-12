-- Sale finalization deducts stock; void restores it when stock_deducted_at is set (new invoices only).

alter table public.invoices
  add column if not exists stock_deducted_at timestamptz;

comment on column public.invoices.stock_deducted_at is
  'Set when stock was deducted at finalize; reverse_invoice restores stock only when this is set.';

-- Positive p_qty; subtracts from current_stock; fails if insufficient.
create or replace function public.decrement_stock(p_product_id uuid, p_qty numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_cur numeric;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Invalid quantity';
  end if;

  select business_id, current_stock into v_business_id, v_cur
  from public.products
  where id = p_product_id
  for update;

  if v_business_id is null then
    raise exception 'Product not found';
  end if;

  if not exists (
    select 1 from public.business_members
    where user_id = auth.uid() and business_id = v_business_id
  ) then
    raise exception 'Access denied';
  end if;

  if v_cur + 0.0001 < p_qty then
    raise exception 'Insufficient stock for one or more products.';
  end if;

  update public.products
  set
    current_stock = current_stock - p_qty,
    updated_at = now()
  where id = p_product_id;
end;
$$;

grant execute on function public.decrement_stock(uuid, numeric) to authenticated;

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
      ii.quantity,
      ii.product_name,
      p.purchase_price
    from public.invoice_items ii
    left join public.products p on p.id = ii.product_id
    where ii.invoice_id = p_invoice_id
      and ii.product_id is not null
  loop
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
  end loop;

  update public.invoices
  set
    status = 'unpaid'::invoice_status,
    stock_deducted_at = now(),
    updated_at = now()
  where id = p_invoice_id;
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
      ii.quantity,
      p.purchase_price
    from public.invoice_items ii
    left join public.products p on p.id = ii.product_id
    where ii.invoice_id = p_invoice_id
      and ii.product_id is not null
  loop
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
  end loop;

  update public.invoices
  set
    status = 'unpaid'::invoice_status,
    stock_deducted_at = now(),
    updated_at = now()
  where id = p_invoice_id;

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

  if v_inv.stock_deducted_at is not null then
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
