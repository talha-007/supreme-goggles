-- Older stock_movements tables may omit columns the app inserts (PostgREST schema cache errors).
-- Safe to run if columns already exist.

alter table public.stock_movements
  add column if not exists reference_id uuid;

alter table public.stock_movements
  add column if not exists reference_type text;

alter table public.stock_movements
  add column if not exists note text;

alter table public.stock_movements
  add column if not exists unit_cost numeric(14, 4);

alter table public.stock_movements
  add column if not exists created_by uuid references auth.users (id) on delete set null;
