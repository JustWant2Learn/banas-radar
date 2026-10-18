-- Key heat readings by PSGC so choropleth areas can join weather by code.
alter table public.heat_readings
  add column if not exists psgc_code text,
  add column if not exists level text,
  add column if not exists name text,
  add column if not exists parent_psgc text;

alter table public.heat_readings
  alter column lat type double precision,
  alter column lon type double precision;

do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'heat_readings'
      and constraint_type = 'PRIMARY KEY'
  ) then
    alter table public.heat_readings drop constraint heat_readings_pkey;
  end if;
exception
  when undefined_object then null;
end $$;

delete from public.heat_readings where psgc_code is null;

create unique index if not exists heat_readings_psgc_key on public.heat_readings (psgc_code);

alter table public.heat_readings
  alter column psgc_code set not null;

alter table public.heat_readings
  add primary key (psgc_code);
