## Objetivo

Hoje o usuário preenche **dois formulários** para criar uma tarefa:
1. Um modal pequeno (`NovaDemandaDialog` ou `DemandaRapidaDialog`) — só com título, cliente, categoria, subtipo, responsáveis, prazo e descrição.
2. Logo depois precisa abrir o card da tarefa (`DemandaDetalheDialog`) para de fato trabalhar nela (anexos, briefing, status, comentários, urgência etc.).

A meta é eliminar o passo 1. **A criação passa a abrir diretamente o formulário detalhado** (o mesmo da imagem enviada). Edição já usa esse mesmo formulário — então criação e edição ficam idênticas.

## Como vai funcionar (fluxo novo)

Em **qualquer botão** que hoje cria tarefa:
- "Nova tarefa de Vídeo / Tráfego Pago / Landing Page / IA·Atendimento / Urgência·Outro" (abas do Projeto Completo do cliente)
- "Nova Tarefa" e "Demanda rápida" (página /demandas)

→ Ao clicar, o sistema **cria imediatamente um rascunho** de demanda no banco (com cliente, categoria e subtipo já preenchidos pelo contexto do botão, status `Criar`, prioridade `Media`, título vazio = "Sem título") e **abre o `DemandaDetalheDialog` desse rascunho**.

O usuário preenche tudo dentro do mesmo card (título, datas, responsáveis, anexos, briefing, urgência, status). Como o `DemandaDetalheDialog` já salva campo a campo (debounced), nada de "Salvar/Cancelar" extra — é instantâneo.

Se o usuário **fechar sem dar título**, o rascunho é descartado (deletado) automaticamente para não poluir o Kanban com cards vazios.

## Mudanças no código

### 1) `src/components/demandas/DemandaDetalheDialog.tsx`
- Aceitar nova prop opcional `isRascunho?: boolean`. Quando `true`:
  - Foco automático no campo de título ao abrir.
  - Ao fechar (`onOpenChange(false)`), se `demanda.titulo` estiver vazio/igual a "Sem título" e **não houver** comentários/anexos/edições, chamar `deleteDemanda(demanda.id)` silenciosamente.
- O título já é editado inline no card (linha 194-201) — só precisa ganhar `autoFocus` quando `isRascunho`.
- Se a categoria for editável no rascunho: adicionar um pequeno seletor de Categoria + Subtipo no header do card (logo abaixo do título), reutilizando os componentes de `NovaDemandaDialog` (`CATEGORIAS`, `CATEGORIA_SUBTIPOS`, `VideoSubtipoCascade`). Isso permite mudar categoria depois de criada (útil quando vier da página /demandas, onde não há categoria no contexto).

### 2) Novo helper em `src/store/demandas.ts`
- `createRascunho({ cliente_id, categoria, subtipo? }) → Promise<Demanda | null>`: insere uma linha mínima e retorna o objeto já normalizado, pronto para ser passado ao `DemandaDetalheDialog`.
- Reaproveita `createDemanda` internamente, mas garante valores default (titulo: "Sem título", status: "Criar", prioridade: "Media").

### 3) `src/components/projeto/AreaTab.tsx`
- Remover `<NovaDemandaDialog>`.
- Botão "Nova tarefa de X" passa a chamar `createRascunho({ cliente_id, categoria })` e setar a demanda retornada em `selecionada`, abrindo direto o `DemandaDetalheDialog` com `isRascunho`.

### 4) `src/pages/Demandas.tsx`
- **Remover** os dois botões "Demanda rápida" e "Nova Tarefa" e substituir por um único botão **"Nova Tarefa"**.
- Esse botão abre um mini-popover/seletor pedindo só **Cliente** (campo obrigatório que não pode ser inferido) e, opcionalmente, **Categoria**. Ao confirmar → cria rascunho → abre `DemandaDetalheDialog`.
- Alternativa mais simples (recomendada): clicar em "Nova Tarefa" abre direto o `DemandaDetalheDialog` em modo rascunho com um seletor de Cliente + Categoria visível no topo do card (já que a página /demandas não tem cliente no contexto).
- Remover imports e estado de `DemandaRapidaDialog`.

### 5) Arquivos a deletar
- `src/components/demandas/NovaDemandaDialog.tsx`
- `src/components/demandas/DemandaRapidaDialog.tsx`

(O componente `VideoSubtipoCascade` será movido para dentro de `DemandaDetalheDialog.tsx` ou para `src/lib/demandas-categorias.tsx` para reuso.)

### 6) `public/version.json` — bump.

## Fluxos resultantes

```text
ANTES:
[Botão "Nova tarefa de Vídeo"] → Modal pequeno (preenche 6 campos) → [Salvar]
                                                                        ↓
                                                             card aparece no Kanban
                                                                        ↓
                                                       usuário clica no card → Modal grande
                                                                        ↓
                                                          preenche o resto (anexos, briefing...)

DEPOIS:
[Botão "Nova tarefa de Vídeo"] → Rascunho criado em silêncio → Modal grande já aberto
                                                                        ↓
                                                preenche tudo num lugar só (auto-save)
                                                                        ↓
                                            fecha → se sem título, rascunho é descartado
```

## Riscos e mitigações
- **Cards "Sem título" órfãos** se o usuário fechar a aba antes do cleanup: cleanup roda em `onOpenChange`. Em casos extremos (crash do browser), um job opcional poderia limpar rascunhos com `titulo='Sem título'` e `created_at < now() - 1h`, mas não é necessário no escopo inicial.
- **Permissões**: `createRascunho` exige `canWrite`. Já é o comportamento atual de `createDemanda`.
- **Realtime**: como o card é criado de verdade no banco, ele aparece instantaneamente para os outros usuários como "Sem título". É aceitável — assim que o autor digita, o título sincroniza (debounced 600ms já existe).

## Não muda
- `IniciarTarefaDialog` (esse é específico do fluxo de Posts/Cards de conteúdo, não de Demandas — não está no escopo).
- Schema do banco — nenhuma migração necessária.
- Lógica de listagem, Kanban, filtros, relatórios.
