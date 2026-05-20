# Permitir alteração manual de status no "Detalhes da tarefa"

## Causa raiz

O dialog `DemandaDetalheDialog` chama `updateDemanda` corretamente ao trocar o status pelo dropdown, e o `update` chega no Supabase. Porém, existe um trigger no banco que sobrescreve o valor de volta para `Atrasado` antes do `UPDATE` ser efetivado, sempre que `data_limite < now()`:

```text
trigger trg_auto_marcar_demanda_atrasada
  BEFORE INSERT OR UPDATE ON public.demandas
  → função auto_marcar_demanda_atrasada():
      IF data_limite < now()
         AND status NOT IN ('Concluido','Entregue','Atrasado')
      THEN NEW.status := 'Atrasado'
```

Como a tarefa "Renovação Assessoria – R$ 1.297,00" tem `data_limite = 18/05/2026` (passado), qualquer escolha do usuário (Criar, Revisar, Planejamento, etc.) é revertida para `Atrasado` no próprio `BEFORE UPDATE`. O frontend aplica a mudança otimista, recebe a linha de volta com `Atrasado` e re-renderiza o status como `Atrasado` — dando a sensação de que "não muda".

A funcionalidade automática de marcar como atrasado deve continuar existindo (para criação/sync de fundo), mas **não pode sobrescrever uma mudança explícita feita pelo usuário**.

## Mudança proposta

### 1. Migration: ajustar `auto_marcar_demanda_atrasada`

Reescrever a função para respeitar mudanças explícitas de status feitas pelo usuário:

- **No INSERT**: comportamento atual (se vencida, marca como Atrasado).
- **No UPDATE**:
  - Se `NEW.status IS DISTINCT FROM OLD.status` → o usuário (ou código) está mudando o status de propósito → **não sobrescrever**. Apenas devolver `NEW` como está.
  - Se `NEW.status = OLD.status` (update de outros campos) → manter a lógica atual de auto-marcação quando vencida.

Isso preserva:
- Auto-marcação na criação de tarefas vencidas.
- Auto-marcação quando algum campo (ex: `data_limite`) é alterado sem mexer no status.
- Bloqueio existente para tarefas com dependências não liberadas.

E permite:
- Usuário escolher manualmente qualquer status no dropdown do detalhe (inclusive sair de Atrasado para Criar/Revisar/Planejamento) sem o banco reverter.

### 2. Sem mudanças no frontend

`DemandaDetalheDialog`, `updateDemanda` em `src/store/demandas.ts`, `AreaTab`, `OperacionalTab`, `MinhasTarefasTabela` e Kanbans continuam como estão. Nenhum comportamento é removido.

## Detalhes técnicos da migration

```sql
CREATE OR REPLACE FUNCTION public.auto_marcar_demanda_atrasada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Respeita mudança explícita de status em UPDATE
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.data_limite IS NOT NULL
     AND NEW.data_limite < now()
     AND NEW.status NOT IN ('Concluido','Entregue','Atrasado')
     AND NOT EXISTS (
       SELECT 1 FROM public.task_dependencies td
        WHERE td.task_id = NEW.id AND td.liberado = false
     ) THEN
    NEW.status := 'Atrasado';
  END IF;
  RETURN NEW;
END;
$$;
```

## Arquivos afetados

- Nova migration em `supabase/migrations/` redefinindo a função `auto_marcar_demanda_atrasada`.

## QA esperado

1. Abrir tarefa vencida em "Operacional" → trocar status para "Criar" pelo dropdown do detalhe → valor persiste e badge atualiza.
2. Trocar de "Atrasado" para "Aguardando aprovação do cliente" → persiste e aparece em Central de Tarefas no grupo correspondente.
3. Criar nova tarefa com `data_limite` no passado e status `Criar` → continua sendo marcada como `Atrasado` automaticamente.
4. Editar outros campos (responsáveis, descrição, prioridade) em tarefa vencida sem mexer no status → status permanece `Atrasado`.
5. Kanbans, Central de Tarefas, AlterarStatusPopover e demais fluxos continuam funcionando.
