-- Pharmacy batch tracking: multiple batches per product with expiry dates.
-- When enable_batch_expiry is on, batch qty is source of truth; products.current_stock is synced.

create table if not exists public.product_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  batch_no text not null,
  expiry_date date,
  qty_on_hand numeric(14, 4) not null default 0 check (qty_on_hand >= 0),
  unit_cost numeric(14, 4),
  purchase_order_id uuid references public.purchase_orders (id) on delete set null,
  purchase_order_item_id uuid references public.purchase_order_items (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, product_id, batch_no)
);

comment on table public.product_batches is
  'Pharmacy stock batches per product (batch no + expiry + qty). Sum drives products.current_stock when batch mode is on.';

create index if not exists product_batches_business_expiry_idx
  on public.product_batches (business_id, expiry_date)
  where qty_on_hand > 0;

create index if not exists product_batches_product_fefo_idx
  on public.product_batches (product_id, expiry_date asc nulls last, created_at asc)
  where qty_on_hand > 0;

create index if not exists product_batches_product_id_idx
  on public.product_batches (product_id);

create index if not exists product_batches_business_id_idx
  on public.product_batches (business_id);

alter table public.stock_movements
  add column if not exists product_batch_id uuid references public.product_batches (id) on delete set null;

create index if not exists stock_movements_product_batch_id_idx
  on public.stock_movements (product_batch_id)
  where product_batch_id is not null;

drop trigger if exists trg_product_batches_updated_at on public.product_batches;
create trigger trg_product_batches_updated_at
before update on public.product_batches
for each row execute function public.touch_updated_at();

alter table public.product_batches enable row level security;

drop policy if exists product_batches_select on public.product_batches;
create policy product_batches_select on public.product_batches
  for select using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

drop policy if exists product_batches_insert on public.product_batches;
create policy product_batches_insert on public.product_batches
  for insert with check (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

drop policy if exists product_batches_update on public.product_batches;
create policy product_batches_update on public.product_batches
  for update using (
    business_id in (select business_id from public.business_members where user_id = auth.uid())
  );

drop policy if exists product_batches_delete on public.product_batches;
create policy product_batches_delete on public.product_batches
  for delete using (
    business_id in (
      select business_id from public.business_members
      where user_id = auth.uid() and role in ('owner', 'manager')
    )
  );

-- ─── Helpers ───────────────────────────────────────────────────

create or replace function public.business_uses_batch_expiry(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select bs.enable_batch_expiry
      from public.business_settings bs
      where bs.business_id = p_business_id
    ),
    false
  );
$$;

grant execute on function public.business_uses_batch_expiry(uuid) to authenticated;

create or replace function public.sync_product_stock_from_batches(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
begin
  select coalesce(sum(qty_on_hand), 0) into v_total
  from public.product_batches
  where product_id = p_product_id;

  update public.products
  set
    current_stock = v_total,
    updated_at = now()
  where id = p_product_id;
end;
$$;

grant execute on function public.sync_product_stock_from_batches(uuid) to authenticated;

create or replace function public.upsert_product_batch_stock(
  p_business_id uuid,
  p_product_id uuid,
  p_batch_no text,
  p_expiry_date date,
  p_qty numeric,
  p_unit_cost numeric default null,
  p_purchase_order_id uuid default null,
  p_purchase_order_item_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_batch_no text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'Invalid quantity';
  end if;

  v_batch_no := trim(coalesce(p_batch_no, ''));
  if v_batch_no = '' then
    raise exception 'Batch number is required.';
  end if;

  if not exists (
    select 1 from public.business_members
    where user_id = auth.uid() and business_id = p_business_id
  ) then
    raise exception 'Access denied';
  end if;

  if not exists (
    select 1 from public.products
    where id = p_product_id and business_id = p_business_id
  ) then
    raise exception 'Product not found';
  end if;

  insert into public.product_batches (
    business_id,
    product_id,
    batch_no,
    expiry_date,
    qty_on_hand,
    unit_cost,
    purchase_order_id,
    purchase_order_item_id,
    notes
  ) values (
    p_business_id,
    p_product_id,
    v_batch_no,
    p_expiry_date,
    p_qty,
    p_unit_cost,
    p_purchase_order_id,
    p_purchase_order_item_id,
    p_note
  )
  on conflict (business_id, product_id, batch_no)
  do update set
    qty_on_hand = public.product_batches.qty_on_hand + excluded.qty_on_hand,
    expiry_date = coalesce(excluded.expiry_date, public.product_batches.expiry_date),
    unit_cost = coalesce(excluded.unit_cost, public.product_batches.unit_cost),
    updated_at = now()
  returning id into v_batch_id;

  perform public.sync_product_stock_from_batches(p_product_id);

  return v_batch_id;
end;
$$;

grant execute on function public.upsert_product_batch_stock(uuid, uuid, text, date, numeric, numeric, uuid, uuid, text) to authenticated;

create or replace function public.deduct_sale_stock_fefo(
  p_business_id uuid,
  p_product_id uuid,
  p_qty numeric,
  p_reference_id uuid,
  p_reference_type text,
  p_note text,
  p_unit_cost numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining numeric := p_qty;
  v_batch record;
  v_take numeric;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Invalid quantity';
  end if;

  if not public.business_uses_batch_expiry(p_business_id) then
    perform public.decrement_stock(p_product_id, p_qty);
    insert into public.stock_movements (
      business_id, product_id, type, quantity, unit_cost,
      reference_id, reference_type, note, created_by
    ) values (
      p_business_id, p_product_id, 'out', p_qty, p_unit_cost,
      p_reference_id, p_reference_type, p_note, auth.uid()
    );
    return;
  end if;

  for v_batch in
    select id, qty_on_hand, unit_cost
    from public.product_batches
    where product_id = p_product_id
      and business_id = p_business_id
      and qty_on_hand > 0
    order by expiry_date asc nulls last, created_at asc, id asc
    for update
  loop
    exit when v_remaining <= 0.0001;
    v_take := least(v_batch.qty_on_hand, v_remaining);

    update public.product_batches
    set
      qty_on_hand = qty_on_hand - v_take,
      updated_at = now()
    where id = v_batch.id;

    insert into public.stock_movements (
      business_id,
      product_id,
      product_batch_id,
      type,
      quantity,
      unit_cost,
      reference_id,
      reference_type,
      note,
      created_by
    ) values (
      p_business_id,
      p_product_id,
      v_batch.id,
      'out',
      v_take,
      coalesce(p_unit_cost, v_batch.unit_cost),
      p_reference_id,
      p_reference_type,
      p_note,
      auth.uid()
    );

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0.0001 then
    raise exception 'Insufficient batch stock for one or more products.';
  end if;

  perform public.sync_product_stock_from_batches(p_product_id);
end;
$$;

grant execute on function public.deduct_sale_stock_fefo(uuid, uuid, numeric, uuid, text, text, numeric) to authenticated;

create or replace function public.restore_sale_stock_batches(
  p_business_id uuid,
  p_reference_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select sm.product_id, sm.product_batch_id, sm.quantity, sm.unit_cost
    from public.stock_movements sm
    where sm.reference_id = p_reference_id
      and sm.type = 'out'
      and sm.product_batch_id is not null
      and coalesce(sm.quantity, 0) > 0
  loop
    update public.product_batches
    set
      qty_on_hand = qty_on_hand + r.quantity,
      updated_at = now()
    where id = r.product_batch_id;

    insert into public.stock_movements (
      business_id,
      product_id,
      product_batch_id,
      type,
      quantity,
      unit_cost,
      reference_id,
      reference_type,
      note,
      created_by
    ) values (
      p_business_id,
      r.product_id,
      r.product_batch_id,
      'in',
      r.quantity,
      r.unit_cost,
      p_reference_id,
      'invoice',
      p_note,
      auth.uid()
    );

    perform public.sync_product_stock_from_batches(r.product_id);
  end loop;
end;
$$;

grant execute on function public.restore_sale_stock_batches(uuid, uuid, text) to authenticated;

-- ─── Finalize: FEFO when batch mode ───────────────────────────

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

grant execute on function public.reverse_invoice(uuid) to authenticated;

-- Backfill existing pharmacy stock into a legacy batch (one per product).
insert into public.product_batches (
  business_id,
  product_id,
  batch_no,
  expiry_date,
  qty_on_hand,
  unit_cost,
  notes
)
select
  p.business_id,
  p.id,
  'LEGACY',
  p.expiry_date,
  p.current_stock,
  p.purchase_price,
  'Migrated from product-level stock'
from public.products p
inner join public.business_settings bs on bs.business_id = p.business_id
where bs.enable_batch_expiry = true
  and p.current_stock > 0
  and not exists (
    select 1 from public.product_batches pb where pb.product_id = p.id
  )
on conflict (business_id, product_id, batch_no) do nothing;
