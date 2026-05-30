# Central de Ativação — Plano Final (v2, após ajustes)

Módulo novo, **100% camada de leitura/organização** sobre dados existentes. Não cria status, badges, tarefas, Cards Pai, workflows ou kanban paralelos.

---

## Auditoria prévia (executada)

- **Configurações globais existentes**: só `ia_config` e `configuracoes_delegacao` — nenhuma é genérica/multi-namespace. → Vamos criar **uma tabela mínima dedicada** `ativacao_regras` (singleton). Justificativa: criar uma chave-valor genérica nova seria pior do que uma tabela tipada e específica.
- **`card_pai_etapas.status_interno_valor`**: tipo `text` livre, sem CHECK, sem ENUM. → Os valores `ja_existente` e `nao_aplicavel` podem ser gravados direto, **sem migration de schema**.

---

## 1. Menu e rota

- Item "Central de Ativação" em `AppSidebar.tsx` logo após Dashboard (ícone `Rocket`).
- Rota `/central-ativacao` em `App.tsx` → `src/pages/CentralAtivacao.tsx`.

## 2. Regra de entrada/saída

- Aparece quando `clientes.status_cliente = 'Onboarding'`.
- Sai automaticamente quando vira `'Ativo'`.
- Clientes `Pausado`/`Encerrado` **não** aparecem por padrão.
- Sem migração de dados — onboarding existente já entra.

## 3. Página `CentralAtivacao.tsx`

- **Header**: título, subtítulo, botão "Regras de Ativação", botão "Importar Clientes".
- **5 KPIs**: Total onboarding · Em andamento · Críticos · Aguardando cliente · Quase prontos.
- **Tabela**: Cliente · Dias onboarding · Progresso · Status atual · Badge atual · Próximo bloqueio · Responsável · Risco · Último avanço · Ações.
- Linha → abre `ProjetoCliente` (rota existente).

## 4. Progresso (read-only)

Hook `useOnboardingProgress.ts` agrega para cada cliente:

- `card_pai` + `card_pai_etapas` (etapas com `concluido=true` OU `status_interno_valor IN ('ja_existente','nao_aplicavel')` contam como feitas).
- `demandas` em status `Concluído`/`Entregue`/`Postado` contam como feitas.
- Último avanço = `max(updated_at)` entre demandas/etapas do cliente.

## 5. Status principal — **gargalo mais crítico** (ajuste 2)

Função `getStatusPrincipal(cliente)` aplica prioridade:

```
1. Atrasado
2. Aguardando ação do cliente
3. Aguardando aprovação do cliente
4. Aguardando etapa anterior
5. Aguardando etapa interna
6. Sem responsável
7. Sem prazo
8. Criar / Pendente
9. Planejamento
10. Entregue / Concluído / Postado
```

Varre demandas + etapas abertas do cliente e retorna o item de maior prioridade (não o mais recente).

## 6. Etapas "Já existente" / "Não aplicável"

- Gravados em `card_pai_etapas.status_interno_valor` (já é TEXT). Sem migration.
- Botões inline na linha expandida da tabela. Ambos contam como concluído no progresso.

## 7. Risco — agora considera badges (ajuste 5)

Função `computeRisco(cliente, cardsPai, demandas)`:

**Crítico**:
- Sem responsável em etapa atual, OU
- Sem prazo em etapa atual, OU
- Sem avanço >7d, OU
- Onboarding >30d, OU
- Card Pai bloqueado, OU
- **Badge de ação aguardada do cliente pendente >5d** (lê `demandas.status_motivo` quando status é "Aguardando ação/aprovação do cliente"), OU
- Status crítico ("Atrasado", "Aguardando ação do cliente") aberto >5d.

**Atenção**:
- Prazo <3d, OU
- Badge aguardado do cliente entre 2–4d, OU
- Progresso <30% após 10d.

Badges resolvidos não pesam. Não cria badge novo — só lê `status_motivo`.

## 8. Modal "Regras de Ativação"

`RegrasAtivacaoDialog.tsx` + store `useAtivacaoRegras`.

Persistência em **nova tabela `ativacao_regras`** (singleton, admin-only — justificada pela auditoria). Colunas:
`requer_meta_ads`, `requer_google_ads`, `requer_posts`, `requer_crm`, `requer_lp`, `requer_gmn`, `requer_reuniao_performance`, `requer_checklist` (bool), `modo` (`'todas'`|`'parcial'`).

## 9. Marcar como Ativo — com validação de pendências críticas (ajuste 4)

Função `getPendenciasCriticas(cliente)` verifica:
- Card Pai crítico aberto
- Tarefa crítica atrasada
- Etapa sem responsável / sem prazo
- Status "Aguardando ação/aprovação do cliente" aberto
- Badge de cliente pendente
- Card Pai bloqueado sem avanço
- Etapa obrigatória não resolvida

**Fluxo**:
1. Se regras configuráveis não satisfeitas → botão desabilitado.
2. Se satisfeitas mas há pendências críticas → modal de aviso lista pendências; botão "Cancelar" + "Marcar mesmo assim" (este último só para admin/super_admin) com registro em `atividade_cliente`: "Cliente marcado como Ativo manualmente por X, mesmo com pendências críticas".
3. Sem pendências → confirmação simples e marca ativo (`status_cliente='Ativo'`, `data_ativacao=now()`).

## 10. Importar / Enviar para Central — com confirmação (ajuste 3)

`ImportarClientesDialog.tsx`:
- Lista clientes selecionáveis (filtra `status_cliente != 'Onboarding'` por padrão; permite ver todos).
- Antes de executar mostra modal: "Você está prestes a enviar X cliente(s) para a Central de Ativação. Essa ação alterará o status desses clientes para Onboarding."
- Indica quantos já estão em Onboarding (ignorados) e quantos serão alterados.
- Botões: Cancelar / Confirmar envio.
- Em `Clientes.tsx`: ação individual + ação em massa "Enviar para Central de Ativação" reutilizando o mesmo dialog de confirmação.
- Registra evento em `atividade_cliente` para cada cliente alterado.

## 11. Permissões

- Admin/super_admin: importar, alterar regras, marcar ativo, "marcar mesmo assim".
- Editor: visualizar, marcar etapa como existente/não aplicável, abrir projeto.
- Controle via `useAuth().roles`.

## 12. Reflexo em tempo real

`supabase.channel()` em `clientes`, `card_pai_etapas`, `demandas` invalida query `['central-ativacao']`.

## 13. NÃO faz

- Não cria status novo, badge novo, tarefa nova, workflow novo, kanban novo.
- Não duplica Cards Pai/tarefas.
- Não altera Central de Tarefas/Reuniões nem RLS existente.
- Não migra dados.

---

## Arquivos

**Novos**:
- `src/pages/CentralAtivacao.tsx`
- `src/components/ativacao/CentralAtivacaoHeader.tsx`
- `src/components/ativacao/CentralAtivacaoKpis.tsx`
- `src/components/ativacao/CentralAtivacaoTable.tsx`
- `src/components/ativacao/RegrasAtivacaoDialog.tsx`
- `src/components/ativacao/ImportarClientesDialog.tsx`
- `src/components/ativacao/MarcarAtivoDialog.tsx`
- `src/hooks/useOnboardingProgress.ts`
- `src/lib/ativacaoRules.ts` (getStatusPrincipal, computeRisco, getPendenciasCriticas, evalRegrasAtivacao)
- `src/store/ativacaoRegras.ts`

**Editados**:
- `src/components/AppSidebar.tsx`, `src/App.tsx`, `src/pages/Clientes.tsx`, `public/version.json`.

**Migração SQL** (única, mínima):
- `CREATE TABLE public.ativacao_regras` (singleton) + GRANT authenticated SELECT + admin-only INSERT/UPDATE via RLS.
- Sem alterar tabelas existentes. `status_interno_valor` permanece TEXT livre.

---

## Checklist final

1. ✅ Item após Dashboard. 2. ✅ Onboarding entra auto. 3. ✅ Ativo sai. 4/5. ✅ Sem status/badge novo. 6. ✅ Badges existentes refletidos. 7. ✅ Status principal = gargalo crítico. 8. ✅ Regras avaliadas (tabela dedicada após auditoria). 9. ✅ Importação com confirmação. 10. ✅ Marcar ativo valida pendências. 11. ✅ Badges entram no risco. 12. ✅ `status_interno_valor` auditado (TEXT). 13/14/15. ✅ Zero duplicação/quebra.

Aprova para eu disparar a migração e implementar?
