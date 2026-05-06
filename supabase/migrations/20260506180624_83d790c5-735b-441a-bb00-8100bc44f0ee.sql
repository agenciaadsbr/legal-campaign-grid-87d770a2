UPDATE public.cards
SET titulo = 'Post Mês ' || (floor(posicao / 4)::int + 1) || ' - Semana ' || ((posicao % 4) + 1),
    updated_at = now()
WHERE cliente_id = 'b265e560-abd5-4a0e-9a39-0c3bd1bc16ba'
  AND status = 'Planejamento'
  AND titulo = 'Criar Post';