## Adicionar campo "Atividade / Briefing" no Workflow / Continuidade

**Arquivo:** `src/components/demandas/WorkflowSection.tsx`

### Mudanças

1. **Novo estado** `descricao` (string) no formulário do Workflow.

2. **Novo campo no UI** (RichTextEditor, igual ao usado no formulário principal de demandas), posicionado logo abaixo do campo "Prazo" e antes do bloco "Bloquear execução":
   - Label: "Atividade / Briefing"
   - Placeholder: "Detalhes internos da próxima tarefa: contexto, requisitos, referências…"
   - Altura compacta para caber no painel lateral.

3. **Lógica de "Reaproveitar → Descrição / briefing"** (checkbox `herdarDescricao`):
   - Quando o usuário marcar a checkbox, **pré-preencher** o campo `descricao` com `pai.descricao` (apenas se o campo estiver vazio, para não sobrescrever edição manual).
   - Quando desmarcar, **limpar** o campo se ele ainda estiver idêntico ao briefing herdado (caso contrário manter a edição do usuário).
   - O texto fica editável: o usuário pode herdar e ajustar antes de criar.

4. **Ao salvar** (`createProximaEtapa`):
   - Sempre enviar `descricao: descricao.trim() ? descricao : null` (em vez do antigo `herdarDescricao ? pai.descricao : null`).
   - Demais campos (links, anexos, bloqueio) permanecem como estão.

5. **Reset** após criar/cancelar: zerar também `descricao`.

### Fora de escopo

- Links (Meister/Drive) e Anexos continuam funcionando via checkbox de herança como hoje.
- Não alterar `createProximaEtapa` no store nem schema.
- Não mexer no formulário principal de demandas.
