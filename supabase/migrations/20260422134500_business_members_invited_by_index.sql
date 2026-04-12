-- Performance: cover FK business_members.invited_by
-- (reported by Supabase advisor unindexed_foreign_keys).

create index if not exists idx_business_members_invited_by
  on public.business_members (invited_by);
