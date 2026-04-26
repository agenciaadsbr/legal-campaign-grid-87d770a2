-- Sincronizar campo legado clientes.status com o ciclo de vida (status_cliente)
UPDATE public.clientes
   SET status = status_cliente
 WHERE status IS DISTINCT FROM status_cliente;