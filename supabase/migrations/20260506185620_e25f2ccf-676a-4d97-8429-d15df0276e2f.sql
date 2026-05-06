alter table public.posts
  add column if not exists data_agendamento date,
  add column if not exists data_postagem    date,
  add column if not exists link_post        text,
  add column if not exists link_meister     text;