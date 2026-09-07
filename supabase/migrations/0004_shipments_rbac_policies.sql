-- Tighten `shipments` RLS now that Supabase Auth + profiles/roles exist (0003_profiles_and_roles.sql).
--
-- Replaces the 0001_init.sql policies that allowed full CRUD to anyone holding the anon key.
-- From here on:
--   - SELECT:  any authenticated user with a `profiles` row (i.e. any provisioned staff/admin).
--   - INSERT / UPDATE: 'staff' or 'admin'.
--   - DELETE: 'admin' only.
-- The anon (logged-out) role gets no access at all — the app's middleware also redirects
-- logged-out visitors to /login, but RLS is the actual security boundary.

drop policy if exists "shipments_select_all" on public.shipments;
drop policy if exists "shipments_insert_all" on public.shipments;
drop policy if exists "shipments_update_all" on public.shipments;
drop policy if exists "shipments_delete_all" on public.shipments;

create policy "shipments_select_authenticated" on public.shipments
  for select to authenticated
  using (public.user_role(auth.uid()) is not null);

create policy "shipments_insert_staff_or_admin" on public.shipments
  for insert to authenticated
  with check (public.user_role(auth.uid()) in ('admin', 'staff'));

create policy "shipments_update_staff_or_admin" on public.shipments
  for update to authenticated
  using (public.user_role(auth.uid()) in ('admin', 'staff'))
  with check (public.user_role(auth.uid()) in ('admin', 'staff'));

create policy "shipments_delete_admin_only" on public.shipments
  for delete to authenticated
  using (public.user_role(auth.uid()) = 'admin');
