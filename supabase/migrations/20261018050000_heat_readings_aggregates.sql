-- City-sampled heat readings plus same-batch province/region aggregates.
alter table public.heat_readings
  add column if not exists recorded_at timestamptz,
  add column if not exists population integer,
  add column if not exists majority_category text,
  add column if not exists hottest_psgc text,
  add column if not exists hottest_name text,
  add column if not exists hottest_heat_index_c double precision;

update public.heat_readings
set recorded_at = observed_at
where recorded_at is null;

create index if not exists heat_readings_recorded_at_idx
  on public.heat_readings (recorded_at desc);
