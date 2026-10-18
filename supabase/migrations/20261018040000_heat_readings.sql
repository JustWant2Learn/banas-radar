-- Latest weather sample for each 0.5° Philippines grid point.
create table if not exists public.heat_readings (
  lat numeric(5, 2) not null,
  lon numeric(5, 2) not null,
  temperature_c double precision not null,
  humidity double precision not null,
  heat_index_c double precision not null,
  observed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (lat, lon)
);

-- Cached PAGASA-style isoband surface (one row: 'latest').
create table if not exists public.heat_surfaces (
  id text primary key,
  geojson jsonb not null,
  points jsonb not null,
  hottest jsonb not null,
  coolest jsonb not null,
  generated_at timestamptz not null default now()
);

alter table public.heat_readings enable row level security;
alter table public.heat_surfaces enable row level security;

drop policy if exists "heat_readings_public_read" on public.heat_readings;
create policy "heat_readings_public_read"
  on public.heat_readings
  for select
  using (true);

drop policy if exists "heat_surfaces_public_read" on public.heat_surfaces;
create policy "heat_surfaces_public_read"
  on public.heat_surfaces
  for select
  using (true);
