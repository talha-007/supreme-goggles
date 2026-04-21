-- Broadcast businesses row updates (e.g. subscription_status) for client-side billing gate refresh.
alter publication supabase_realtime add table public.businesses;
