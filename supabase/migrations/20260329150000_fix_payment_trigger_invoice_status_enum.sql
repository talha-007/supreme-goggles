-- Fix: CASE branches were inferred as text, not invoice_status (error on payment insert).
-- Run in Supabase SQL Editor if you already applied the original schema.

create or replace function update_invoice_on_payment()
returns trigger
language plpgsql
as $$
declare
  v_total numeric;
  v_paid  numeric;
begin
  select total_amount, paid_amount into v_total, v_paid
  from invoices where id = new.invoice_id;

  v_paid := v_paid + new.amount;

  update invoices set
    paid_amount = v_paid,
    status = case
      when v_paid >= v_total then 'paid'::invoice_status
      when v_paid > 0 then 'partial'::invoice_status
      else 'unpaid'::invoice_status
    end,
    updated_at = now()
  where id = new.invoice_id;

  update customers set
    outstanding_balance = outstanding_balance - new.amount,
    updated_at = now()
  where id = (select customer_id from invoices where id = new.invoice_id);

  return new;
end;
$$;
