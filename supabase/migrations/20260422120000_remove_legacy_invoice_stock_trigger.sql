-- Remove legacy invoice-status trigger that deducts stock on update.
-- Stock is now handled by finalize_draft_invoice* RPCs; keeping this trigger causes double deduction.

drop trigger if exists trg_deduct_stock_on_invoice on public.invoices;
drop function if exists public.deduct_stock_on_invoice();
