-- Resume city-sample collection across short Vercel invocations.
create table if not exists public.heat_sample_checkpoint (
  id smallint primary key default 1 check (id = 1),
  recorded_at timestamptz not null,
  samples jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.heat_sample_checkpoint enable row level security;
