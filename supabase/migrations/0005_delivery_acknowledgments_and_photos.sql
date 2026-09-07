-- Adds manual delivery/receipt acknowledgments and pre-shipping/post-delivery photo proof
-- to `shipments`, plus the storage bucket + policies photos are uploaded to.
--
-- Acknowledgments exist because the courier's own status update is sometimes late or wrong —
-- staff need to be able to mark "carrier says delivered" and "client confirms received" as two
-- independent, manually-set facts, each with its own timestamp.

alter table public.shipments
  add column if not exists carrier_delivery_confirmed boolean not null default false,
  add column if not exists carrier_delivery_confirmed_at timestamptz,
  add column if not exists client_receipt_confirmed boolean not null default false,
  add column if not exists client_receipt_confirmed_at timestamptz,
  add column if not exists pre_shipping_photos text[] not null default '{}',
  add column if not exists post_delivery_photos text[] not null default '{}';

-- Storage bucket for shipment photo proof. Public so `getPublicUrl()` can be used directly
-- from the client after upload; access to the *upload/delete* path is still gated by the
-- policies below (mirrors the staff/admin gating on the `shipments` table itself).
insert into storage.buckets (id, name, public)
values ('shipment-photos', 'shipment-photos', true)
on conflict (id) do nothing;

drop policy if exists "shipment_photos_select_public" on storage.objects;
create policy "shipment_photos_select_public" on storage.objects
  for select to public
  using (bucket_id = 'shipment-photos');

drop policy if exists "shipment_photos_insert_staff_or_admin" on storage.objects;
create policy "shipment_photos_insert_staff_or_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shipment-photos' and public.user_role(auth.uid()) in ('admin', 'staff'));

drop policy if exists "shipment_photos_delete_staff_or_admin" on storage.objects;
create policy "shipment_photos_delete_staff_or_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'shipment-photos' and public.user_role(auth.uid()) in ('admin', 'staff'));
