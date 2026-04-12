-- Replace draft invoice lines in one transaction (locks invoice row).
-- Prevents race where two concurrent saves interleave delete/insert and duplicate rows,
-- which doubled stock deductions on finalize.

create or replace function public.replace_invoice_draft_items(
  p_invoice_id uuid,
  p_lines jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_status invoice_status;
  el jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select business_id, status into v_business_id, v_status
  from public.invoices
  where id = p_invoice_id
  for update;

  if v_business_id is null then
    raise exception 'Invoice not found';
  end if;

  if not exists (
    select 1 from public.business_members
    where user_id = auth.uid() and business_id = v_business_id
  ) then
    raise exception 'Access denied';
  end if;

  if v_status <> 'draft'::invoice_status then
    raise exception 'Only draft invoices can be edited.';
  end if;

  delete from public.invoice_items where invoice_id = p_invoice_id;

  for el in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    insert into public.invoice_items (
      invoice_id,
      product_id,
      product_name,
      unit,
      quantity,
      unit_price,
      discount_pct,
      line_total
    ) values (
      p_invoice_id,
      case
        when nullif(trim(el->>'product_id'), '') is null then null
        else (nullif(trim(el->>'product_id'), ''))::uuid
      end,
      trim(coalesce(el->>'product_name', '')),
      coalesce(nullif(trim(el->>'unit'), ''), 'pcs'),
      coalesce((el->>'quantity')::numeric, 0),
      coalesce((el->>'unit_price')::numeric, 0),
      coalesce((el->>'discount_pct')::numeric, 0),
      coalesce((el->>'line_total')::numeric, 0)
    );
  end loop;
end;
$$;

grant execute on function public.replace_invoice_draft_items(uuid, jsonb) to authenticated;
