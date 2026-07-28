grant execute on function public.reverse_invoice(uuid) to authenticated;

-- Backfill existing pharmacy stock into a legacy batch (one per product).
insert into public.product_batches (
  business_id,
  product_id,
  batch_no,
  expiry_date,
  qty_on_hand,
  unit_cost,
  notes
)
select
  p.business_id,
  p.id,
  'LEGACY',
  p.expiry_date,
  p.current_stock,
  p.purchase_price,
  'Migrated from product-level stock'
from public.products p
inner join public.business_settings bs on bs.business_id = p.business_id
where bs.enable_batch_expiry = true
  and p.current_stock > 0
  and not exists (
    select 1 from public.product_batches pb where pb.product_id = p.id
  )
on conflict (business_id, product_id, batch_no) do nothing;
