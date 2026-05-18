-- Past invoices keep rows in invoice_items with product_id set. Without ON DELETE SET NULL,
-- deleting a catalog product fails even when there are no draft/unpaid invoices.
-- Clearing the FK preserves product_name / amounts on historical lines.

do $$
declare
  r record;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'invoice_items'
  ) then
    raise notice 'invoice_items table not found; skip product_id FK migration';
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoice_items'
      and column_name = 'product_id'
  ) then
    raise notice 'invoice_items.product_id column not found; skip product_id FK migration';
    return;
  end if;

  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join pg_class ft on ft.oid = c.confrelid
    join pg_namespace fn on fn.oid = ft.relnamespace
    where n.nspname = 'public'
      and t.relname = 'invoice_items'
      and fn.nspname = 'public'
      and ft.relname = 'products'
      and c.contype = 'f'
  loop
    execute format('alter table public.invoice_items drop constraint %I', r.conname);
  end loop;

  alter table public.invoice_items
    alter column product_id drop not null;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'invoice_items'
      and c.conname = 'invoice_items_product_id_fkey'
  ) then
    alter table public.invoice_items
      add constraint invoice_items_product_id_fkey
      foreign key (product_id) references public.products (id) on delete set null;
  end if;
end
$$;
