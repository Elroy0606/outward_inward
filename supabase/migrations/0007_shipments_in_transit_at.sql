-- Exact transit tracking for shipments.
--
-- A database trigger stamps `in_transit_at`, so every write path is covered: status popover,
-- edit forms, create form, and Excel import.
--
-- Rules:
--   * Created as In Transit: now, or the start of `shipment_date` if that date is in the past,
--     so importing older shipments doesn't reset their age to 0.
--   * Changed to In Transit: now.
--   * Changed to Pending: cleared.
--   * Changed to Delivered or Cancelled: kept for history.
--   * Status unchanged: kept, and cannot be overwritten by a client.
--
-- Existing rows stay NULL and the app falls back to `shipment_date` for them.
-- Safe to run more than once.

alter table public.shipments
  add column if not exists in_transit_at timestamptz;

create or replace function public.set_shipment_in_transit_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'IN_TRANSIT' then
      new.in_transit_at := case
        when new.shipment_date < (now() at time zone 'Asia/Kolkata')::date
          then new.shipment_date::timestamp at time zone 'Asia/Kolkata'
        else now()
      end;
    else
      new.in_transit_at := null;
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'IN_TRANSIT' then
      new.in_transit_at := now();
    elsif new.status = 'PENDING' then
      new.in_transit_at := null;
    else
      new.in_transit_at := old.in_transit_at;
    end if;
  else
    new.in_transit_at := old.in_transit_at;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_shipments_in_transit_at on public.shipments;
create trigger trg_shipments_in_transit_at
before insert or update on public.shipments
for each row
execute function public.set_shipment_in_transit_at();
