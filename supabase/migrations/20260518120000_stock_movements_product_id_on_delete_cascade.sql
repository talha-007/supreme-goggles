-- Some databases had ON DELETE RESTRICT on stock_movements → products, which blocks
-- deleting any product that ever had a stock movement (sales, PO, adjustments).
-- CASCADE removes audit rows for that product when the catalog row is deleted.

alter table public.stock_movements
  drop constraint if exists stock_movements_product_id_fkey;

alter table public.stock_movements
  add constraint stock_movements_product_id_fkey
  foreign key (product_id) references public.products (id) on delete cascade;
