-- Optional product brand (e.g. manufacturer), separate from category.

alter table public.products
  add column if not exists brand text;

comment on column public.products.brand is 'Product brand / manufacturer label for filtering and display.';

create index if not exists products_business_brand_idx
  on public.products (business_id, brand)
  where brand is not null and trim(brand) <> '';
