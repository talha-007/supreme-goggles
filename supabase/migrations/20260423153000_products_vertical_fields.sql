alter table public.products
  add column if not exists requires_prescription boolean not null default false;

alter table public.products
  add column if not exists mrp numeric(14, 2);

alter table public.products
  add column if not exists is_menu_item boolean not null default false;

comment on column public.products.requires_prescription is 'Pharmacy flow: sale should require prescription.';
comment on column public.products.mrp is 'Pharmacy flow: optional maximum retail price.';
comment on column public.products.is_menu_item is 'Restaurant flow: product is sold as a menu item.';
