-- Merge `cost_center` and `oca_number` into a single `cost_center_oca` column.
--
-- This mirrors a change already applied by hand against the live Supabase project (see
-- CLAUDE.md — migrations are plain SQL files applied manually, there's no linked CLI).
-- This file exists so a fresh database created from `supabase/migrations/*.sql` ends up
-- with the same schema as the live one. Written defensively (existence checks) so it's a
-- no-op if the live table was already migrated and the old columns are already gone.

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shipments' and column_name = 'cost_center_oca'
  ) then
    alter table public.shipments add column cost_center_oca text;
  end if;
end $$;

-- Backfill from the old columns where they still exist, joining both values when a row
-- had both populated (e.g. "CC-101 / OCA1234r").
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shipments' and column_name = 'cost_center'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shipments' and column_name = 'oca_number'
  ) then
    execute $sql$
      update public.shipments
      set cost_center_oca = case
        when cost_center is not null and oca_number is not null then cost_center || ' / ' || oca_number
        when cost_center is not null then cost_center
        when oca_number is not null then oca_number
        else null
      end
      where cost_center_oca is null
    $sql$;

    alter table public.shipments drop column cost_center;
    alter table public.shipments drop column oca_number;
  end if;
end $$;
