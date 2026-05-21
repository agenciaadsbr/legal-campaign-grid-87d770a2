DELETE FROM public.demandas WHERE id IN ('0bb9b76d-6349-41be-b2fd-3b8965c57842','a1c7dacb-8a53-4eee-87de-d26398eb96e0');

UPDATE public.demandas
   SET process_step_order = 3,
       process_step_status = 'bloqueada',
       process_step_type = 'tarefa',
       process_depends_on = 'b951614b-16f6-4c8e-a56f-f08389e5cf28'
 WHERE id = '7bd5f87d-1e80-40ab-b0b0-88d7ed250ff3';