-- Hardening: lock function name resolution to public schema.

alter function public.get_my_business_ids()
  set search_path = public;

alter function public.get_my_role(uuid)
  set search_path = public;

alter function public.generate_invoice_number(uuid)
  set search_path = public;

alter function public.touch_updated_at()
  set search_path = public;

alter function public.update_invoice_on_payment()
  set search_path = public;
