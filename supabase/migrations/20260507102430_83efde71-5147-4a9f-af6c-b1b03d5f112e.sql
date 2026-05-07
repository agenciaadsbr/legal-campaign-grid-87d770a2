alter table public.demandas
  add column if not exists link_meister text,
  add column if not exists link_drive text;