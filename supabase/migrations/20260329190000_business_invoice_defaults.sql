-- Default tax and discount values for new invoices (per business).

alter table public.businesses
  add column if not exists updated_at timestamptz not null default now();

alter table public.businesses
  add column if not exists default_tax_rate numeric(5, 2) not null default 0;

alter table public.businesses
  add column if not exists default_invoice_discount_amount numeric(14, 2) not null default 0;

alter table public.businesses
  add column if not exists default_line_discount_pct numeric(5, 2) not null default 0;

alter table public.businesses
  add column if not exists tax_label text;

comment on column public.businesses.default_tax_rate is 'Default sales tax % applied to new invoices.';
comment on column public.businesses.default_invoice_discount_amount is 'Default invoice-level discount (currency) for new invoices.';
comment on column public.businesses.default_line_discount_pct is 'Default line discount % for new lines on new invoices.';
comment on column public.businesses.tax_label is 'Label on PDF, e.g. GST, VAT, Sales tax.';

create or replace function public.update_business_invoice_defaults(
  p_default_tax_rate numeric,
  p_default_invoice_discount_amount numeric,
  p_default_line_discount_pct numeric,
  p_tax_label text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_tax numeric;
  v_disc_amt numeric;
  v_line_pct numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select bm.business_id into v_business_id
  from public.business_members bm
  where bm.user_id = auth.uid() and bm.role in ('owner', 'manager')
  limit 1;

  if v_business_id is null then
    raise exception 'Access denied';
  end if;

  v_tax := coalesce(p_default_tax_rate, 0);
  if v_tax < 0 or v_tax > 100 then
    raise exception 'Tax rate must be between 0 and 100';
  end if;

  v_disc_amt := greatest(0, coalesce(p_default_invoice_discount_amount, 0));

  v_line_pct := coalesce(p_default_line_discount_pct, 0);
  if v_line_pct < 0 or v_line_pct > 100 then
    raise exception 'Line discount must be between 0 and 100';
  end if;

  update public.businesses
  set
    default_tax_rate = v_tax,
    default_invoice_discount_amount = v_disc_amt,
    default_line_discount_pct = v_line_pct,
    tax_label = nullif(trim(p_tax_label), '')
  where id = v_business_id;
end;
$$;

grant execute on function public.update_business_invoice_defaults(numeric, numeric, numeric, text) to authenticated;
