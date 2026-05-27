UPDATE public.status_post_options SET label='Agendar' WHERE label='Agendado';
UPDATE public.cards SET status='Agendar' WHERE status='Agendado';
UPDATE public.posts SET status='Agendar' WHERE status='Agendado';