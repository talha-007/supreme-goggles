-- Void finalized invoices: remove payments, restore customer balance, mark cancelled.
-- Safe for projects that never deducted stock on sale (web app does not in app code).

create or replace function public.reverse_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
  v_total_paid numeric;
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

  if v_inv.status = 'draft' then
    raise exception 'Draft invoices cannot be reversed here. Delete the draft instead.';
  end if;

  if v_inv.status = 'cancelled' then
    raise exception 'Invoice is already cancelled.';
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
    updated_at = now()
  where id = p_invoice_id;
end;
$$;

grant execute on function public.reverse_invoice(uuid) to authenticated;
