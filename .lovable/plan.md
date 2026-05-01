## Reorganização da tabela de Clientes

Transformar a listagem principal numa visão gerencial limpa: sair os badges colados no nome do cliente e a coluna "Responsáveis", entrar 4 colunas operacionais de alerta com tooltips ricos.

### Nova ordem de colunas

```
#  |  Cliente  |  Status  |  Último comentário  |  Nicho  |  Período do contrato
   |  Posts atrasados  |  Tarefas atrasadas  |  Tarefas urgentes  |  Onboarding  |  Ações
```

Coluna **Responsáveis** sai. Os badges (⌛ ⚡ ⚠️ Onb.) saem de junto do nome.

### Detalhes por coluna nova

**Posts atrasados**
- Conta `cards` do cliente com `status_card === "Atrasado"`.
- Exibe `[ícone AlertTriangle] N` em badge vermelho. Se 0 → `—`.
- Tooltip: título "N posts atrasados" + lista (até 5) com título do post e card pai. Acima de 5: "+ X posts atrasados".

**Tarefas atrasadas**
- Conta `demandas` do cliente com `status === "Atrasado"`, ordenadas por `data_limite` asc.
- Badge âmbar com ícone Hourglass + número. Se 0 → `—`.
- Tooltip: "N tarefas atrasadas" + lista (até 5) com Título, Categoria, Responsável (via `getResponsaveisIds` + `responsaveis`), Prazo. Excedente: "+ X tarefas atrasadas".

**Tarefas urgentes**
- Conta `demandas` com `prioridade === "Urgente"`, ordenadas por `data_limite` asc.
- Badge primário com ícone Zap + número. Se 0 → `—`.
- Tooltip: "N tarefa(s) urgente(s)" + lista (até 5) com Título, Categoria, Responsável, Prazo.

**Onboarding**
- Mostra alerta apenas se `status_global === "Onboarding"` e `prazo_onboarding` está vencido (ou nos próximos 3 dias = "pendente").
- Vencido → badge vermelho "Vencido" com tooltip "Onboarding com prazo vencido".
- Pendente próximo → badge âmbar "Pendente" com tooltip "Onboarding pendente".
- Sem pendência → `—`.

### Tooltip padrão
- Reaproveita o padrão já existente: `max-w-[420px] min-w-[280px]`, fundo `bg-popover`, borda `border-border`, sombra suave, texto `text-xs`. Funciona em hover (desktop) e tap (mobile, comportamento nativo do Radix Tooltip).

### Mudanças no código

Arquivo único: **`src/components/clientes/ClientesGeralTable.tsx`**

1. Remover `<TableHead>Responsáveis</TableHead>` do header.
2. Remover `<TableCell>` com `<CelulaResponsaveis ... />` do body.
3. Remover import `CelulaResponsaveis`.
4. Remover o bloco "Indicadores rápidos de saúde" colado ao nome do cliente (linhas ~341-498) — manter só o `Link` do nome.
5. Adicionar 4 novos `<TableHead>` antes do `Ações`: "Posts atrasados", "Tarefas atrasadas", "Tarefas urgentes", "Onboarding" (todos com `text-center` e `whitespace-nowrap`).
6. Adicionar 4 novas `<TableCell>` correspondentes, cada uma renderizando um pequeno componente badge+tooltip (extrair helper local `AlertCell` para evitar repetição). Quando contagem = 0 mostrar `<span className="text-muted-foreground">—</span>` centralizado.
7. Reaproveitar a lógica já existente de `postsAtrasados`, `demAtrasadasList`, `demUrgentesList`, `onboardingAtrasado` — apenas mover os tooltips das pílulas inline para dentro das células.
8. Remover indicador `contratoVenceEm` da exibição (não está nos requisitos; mantido só nos dados se necessário no futuro — vou remover do cálculo também para limpar).

### Não muda
- Filtros, busca, ordenação, modo compacto/confortável, slot de Ações, navegação ao clicar no nome do cliente.
- Coluna Responsáveis dentro do **Projeto Completo** e nas tarefas — intocadas.
- Banco de dados — nenhuma migração.
- `CelulaResponsaveis.tsx` permanece no projeto (ainda usada em outros lugares se houver; só deixa de ser importada aqui).

### Validação
Para um cliente com 2 posts atrasados, 3 tarefas atrasadas, 1 urgente:
- Coluna Posts atrasados: badge "2"
- Coluna Tarefas atrasadas: badge "3", tooltip lista as 3 com categoria/responsável/prazo
- Coluna Tarefas urgentes: badge "1", tooltip lista a tarefa
- Coluna Onboarding: `—` (se já ativo)
