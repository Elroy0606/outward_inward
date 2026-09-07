-- Inward Outward Shipment Tracker — initial schema
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

create extension if not exists pgcrypto;

do $$ begin
  create type shipment_type as enum ('INWARD', 'OUTWARD');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type shipment_status as enum ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.shipments (
  id                uuid primary key default gen_random_uuid(),
  type              shipment_type not null,
  status            shipment_status not null default 'PENDING',

  company_name      text not null,                 -- "COMPANY NAME"
  cost_center       text,                           -- "COST CENTER"
  oca_number        text,                           -- "OCA NO"
  shipment_date     date not null,                  -- "date"
  invoice_number    text,                           -- "INVOCE NO"
  particulars       text not null,                  -- "Particular sent"
  shipping_address  text,                           -- "Shipped addres"
  taken_out_by      text,                           -- "GOODS TAKEN OUT BY"
  transporter_name  text,                           -- "TRANSPORTER NAME"
  tracking_number   text,                           -- "Tracking no"
  delivery_date     date,                           -- "DELIVERY DATE"
  confirmed_with    text,                           -- "Delivery confirmed WITH"
  shipping_charges  numeric(12, 2),                 -- "shiping charges"
  weight_kg         numeric(12, 3),                 -- "weight of material"
  volume_cbm        numeric(12, 4),                 -- "Volume of material"
  contact_person    text,                           -- "CONTACT PERSON"
  contact_number    text,                           -- "CONTACT NUMBER"
  email             text,                           -- "EMAIL ID"
  remarks           text,                           -- "REMARK"

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists shipments_type_idx on public.shipments (type);
create index if not exists shipments_status_idx on public.shipments (status);
create index if not exists shipments_shipment_date_idx on public.shipments (shipment_date desc);
create index if not exists shipments_company_name_idx on public.shipments (lower(company_name));

-- Keep `updated_at` current on every row change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_shipments_updated_at on public.shipments;
create trigger trg_shipments_updated_at
before update on public.shipments
for each row
execute function public.set_updated_at();

-- Row Level Security.
-- No auth is wired up in this app yet, so policies below allow full CRUD for
-- the anon/authenticated roles (i.e. anyone with the anon key). This is fine
-- for an internal tool on a private network; add Supabase Auth + narrower
-- policies (e.g. scoped to `authenticated`, or per-user) before exposing the
-- app publicly.
alter table public.shipments enable row level security;

drop policy if exists "shipments_select_all" on public.shipments;
create policy "shipments_select_all" on public.shipments
  for select using (true);

drop policy if exists "shipments_insert_all" on public.shipments;
create policy "shipments_insert_all" on public.shipments
  for insert with check (true);

drop policy if exists "shipments_update_all" on public.shipments;
create policy "shipments_update_all" on public.shipments
  for update using (true) with check (true);

drop policy if exists "shipments_delete_all" on public.shipments;
create policy "shipments_delete_all" on public.shipments
  for delete using (true);
