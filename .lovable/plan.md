# Habilitar histórico da IA na aba Posts

## Diagnóstico

O componente `TarefaIAConsulta` já é usado em **PostDetalheDialog.tsx** (linha 856) com toda a UI de histórico, pergunta, resposta, fontes e confiança — idêntica às demais abas. A renderização e o carregamento (`loadConsultasByDemanda`) estão funcionais.

A causa real do histórico não aparecer em **Posts** está no banco:

- A tabela `ia_tarefa_consultas` tem FK:
  `demanda_id → demandas(id) ON DELETE CASCADE`
- Na aba Posts, passamos `demanda_id = post.id` (UUID da tabela `posts_cliente_kanban`, não `demandas`).
- O `INSERT` no edge function `ia-consultar-tarefa` falha com violação de FK.
- O erro é silencioso (não é tratado/retornado), então a resposta da IA aparece **uma vez** na sessão, mas nada é persistido — e ao reabrir o post, o histórico fica vazio.

Nas demais abas (Tráfego, Vídeos, etc.) o `demanda_id` é de fato uma demanda, então a FK aceita e o histórico funciona.

## Mudança proposta (mínima e segura)

Criar **uma migração** que apenas remove a FK rígida da coluna `demanda_id`, transformando-a em uma referência polimórfica (aceita id de `demandas` OU `posts_cliente_kanban`):

```sql
ALTER TABLE public.ia_tarefa_consultas
  DROP CONSTRAINT IF EXISTS ia_tarefa_consultas_demanda_id_fkey;
```

Nada mais é alterado:
- Coluna `demanda_id` continua existindo (uuid not null).
- RLS permanece igual.
- Dados existentes são preservados.
- Histórico de demandas comuns continua funcionando normalmente.
- A partir daí, consultas feitas em Posts passam a salvar e aparecer no histórico, exatamente como nas outras abas.

## O que NÃO será alterado

- Nenhum arquivo de UI (`PostDetalheDialog.tsx`, `TarefaIAConsulta.tsx`).
- Nenhum edge function.
- Nenhuma store.
- Nenhum dado existente.
- Nenhum Kanban, workflow, comentário ou layout.

## Validação após aplicar

1. Abrir um Post → seção "Está com dúvidas na tarefa?" → fazer uma consulta.
2. Fechar o Post e reabrir → confirmar que a consulta aparece em "Histórico de consultas" com pergunta, resposta, fontes e selo de confiança.
3. Conferir aba Tráfego Pago e Vídeos: histórico continua funcionando normalmente.
