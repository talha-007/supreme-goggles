do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'invoices'
      and con.contype = 'f'
      and con.conkey = array[
        (
          select attnum
          from pg_attribute
          where attrelid = rel.oid
            and attname = 'waiter_id'
            and not attisdropped
          limit 1
        )
      ]
  loop
    execute format('alter table public.invoices drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.invoices
  add constraint invoices_waiter_id_fkey
  foreign key (waiter_id)
  references public.restaurant_staff (id)
  on delete set null;
