-- Owner WhatsApp alerts (phone + toggles). Graph API credentials stay in app env.

alter table public.businesses
  add column if not exists whatsapp_phone_e164 text;

alter table public.businesses
  add column if not exists whatsapp_notify_daily boolean not null default false;

alter table public.businesses
  add column if not exists whatsapp_notify_po boolean not null default false;

alter table public.businesses
  add column if not exists whatsapp_notify_receive boolean not null default false;

alter table public.businesses
  add column if not exists whatsapp_notify_low_stock boolean not null default false;

comment on column public.businesses.whatsapp_phone_e164 is 'Recipient for alerts, digits only (e.g. 923001234567).';
comment on column public.businesses.whatsapp_notify_daily is 'Send daily sales + optional low-stock digest via cron.';
comment on column public.businesses.whatsapp_notify_po is 'Send when a PO is confirmed (ordered).';
comment on column public.businesses.whatsapp_notify_receive is 'Send when stock is received on a PO.';
comment on column public.businesses.whatsapp_notify_low_stock is 'Include low-stock lines in the daily digest.';

create or replace function public.update_business_whatsapp_settings(
  p_phone_e164 text,
  p_notify_daily boolean,
  p_notify_po boolean,
  p_notify_receive boolean,
  p_notify_low_stock boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
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

  update public.businesses
  set
    whatsapp_phone_e164 = nullif(regexp_replace(trim(coalesce(p_phone_e164, '')), '[^0-9]', '', 'g'), ''),
    whatsapp_notify_daily = coalesce(p_notify_daily, false),
    whatsapp_notify_po = coalesce(p_notify_po, false),
    whatsapp_notify_receive = coalesce(p_notify_receive, false),
    whatsapp_notify_low_stock = coalesce(p_notify_low_stock, false)
  where id = v_business_id;
end;
$$;

grant execute on function public.update_business_whatsapp_settings(text, boolean, boolean, boolean, boolean) to authenticated;
