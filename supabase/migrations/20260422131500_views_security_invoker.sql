-- Harden legacy reporting views: execute with caller permissions (respect RLS)
-- instead of creator permissions.

alter view if exists public.v_customer_balances
  set (security_invoker = true);

alter view if exists public.v_daily_sales
  set (security_invoker = true);

alter view if exists public.v_low_stock
  set (security_invoker = true);
