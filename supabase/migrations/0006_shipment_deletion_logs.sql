-- Audit trail for shipment deletion.
--
-- Deleting a shipment now requires a reason (enforced in the app, see `deleteShipment` in
-- src/lib/actions.ts) and is recorded here *before* the row is removed from `shipments`, so
-- compliance/tracking always has who deleted a record, what it contained, why, and when.
--
-- The log is intentionally a separate, append-only table rather than a soft-delete flag on
-- `shipments` — deleted rows should disappear from every existing query against `shipments`
-- (dashboard, KPIs, exports) without those call sites needing an `is_deleted = false` filter
-- bolted on everywhere.

create table if not exists public.shipment_deletion_logs (
  id                uuid primary key default gen_random_uuid(),
  shipment_id       uuid not null,
  shipment_snapshot jsonb not null,        -- full `shipments` row at the moment of deletion
  deleted_by        uuid references auth.users (id) on delete set null,
  deleted_by_email  text not null,
  deletion_reason   text not null,
  deleted_at        timestamptz not null default now()
);

create index if not exists shipment_deletion_logs_deleted_at_idx
  on public.shipment_deletion_logs (deleted_at desc);
create index if not exists shipment_deletion_logs_shipment_id_idx
  on public.shipment_deletion_logs (shipment_id);

alter table public.shipment_deletion_logs enable row level security;

-- Only admins can delete shipments (see shipments_delete_admin_only in
-- 0004_shipments_rbac_policies.sql), so only admins can write audit entries. No update/delete
-- policy is defined for this table on purpose — once written, a log entry is immutable.
drop policy if exists "shipment_deletion_logs_select_admin_only" on public.shipment_deletion_logs;
create policy "shipment_deletion_logs_select_admin_only" on public.shipment_deletion_logs
  for select to authenticated
  using (public.user_role(auth.uid()) = 'admin');

drop policy if exists "shipment_deletion_logs_insert_admin_only" on public.shipment_deletion_logs;
create policy "shipment_deletion_logs_insert_admin_only" on public.shipment_deletion_logs
  for insert to authenticated
  with check (public.user_role(auth.uid()) = 'admin');
