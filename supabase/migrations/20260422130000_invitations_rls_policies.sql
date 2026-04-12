-- Secure invitations table: explicit RLS policies and tighter grants.

revoke all on table public.invitations from anon;
grant select, insert, update, delete on table public.invitations to authenticated;

drop policy if exists invitations_select_owner_manager on public.invitations;
create policy invitations_select_owner_manager
  on public.invitations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_members bm
      where bm.business_id = invitations.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  );

drop policy if exists invitations_insert_owner_manager on public.invitations;
create policy invitations_insert_owner_manager
  on public.invitations
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.business_members bm
      where bm.business_id = invitations.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  );

drop policy if exists invitations_update_owner_manager on public.invitations;
create policy invitations_update_owner_manager
  on public.invitations
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.business_members bm
      where bm.business_id = invitations.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  )
  with check (
    exists (
      select 1
      from public.business_members bm
      where bm.business_id = invitations.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  );

drop policy if exists invitations_delete_owner_manager on public.invitations;
create policy invitations_delete_owner_manager
  on public.invitations
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.business_members bm
      where bm.business_id = invitations.business_id
        and bm.user_id = auth.uid()
        and bm.role in ('owner', 'manager')
    )
  );
