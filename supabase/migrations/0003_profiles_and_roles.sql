-- Auth: user profiles + role-based access control (admin/staff).
--
-- This app has no auth wired up yet (see 0001_init.sql). This migration adds a `profiles`
-- table keyed to `auth.users`, auto-provisions a row for every new Supabase Auth user via a
-- trigger, and adds `is_admin()`/`user_role()` helper functions used by the RLS policies in
-- 0004_shipments_rbac_policies.sql.
--
-- After running this, invite users from Supabase Studio -> Authentication -> Users -> Invite
-- (or disable public sign-ups entirely under Authentication -> Providers -> Email). Every
-- invited/created user gets a `profiles` row with role `staff` by default; promote specific
-- users to `admin` by hand:
--   update public.profiles set role = 'admin' where email = 'someone@yourcompany.com';

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  role        text not null default 'staff' check (role in ('admin', 'staff')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- security definer + fixed search_path so these can be called from RLS policies (including
-- ones on `profiles` itself) without recursing back into `profiles`' own RLS.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

create or replace function public.user_role(uid uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = uid;
$$;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only" on public.profiles
  for update to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Auto-create a `profiles` row whenever a new Supabase Auth user is created (e.g. via an
-- invite, or the first sign-in after one). Defaults to 'staff'; promote to 'admin' by hand.
--
-- Optional company-domain restriction: uncomment the `if` guard below to hard-block profile
-- creation (and therefore effectively deny app access, since RLS requires a profiles row) for
-- any email outside your company's domain, as an extra belt-and-suspenders check alongside
-- disabling public sign-ups in the Supabase Auth dashboard.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- if new.email not ilike '%@yourcompany.com' then
  --   raise exception 'Sign-ups are restricted to company email addresses';
  -- end if;

  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
