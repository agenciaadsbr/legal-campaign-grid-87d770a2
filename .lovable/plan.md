## Problema

Em **Minhas Tarefas**, o botão de ícone (`ExternalLink`, marcado em vermelho na imagem) hoje sempre navega para `t.link`. Para tarefas individuais (demandas) o link é genérico `/clientes/{id}/projeto`, que cai na aba "Visão Geral" — o usuário precisa caçar a tarefa manualmente. Para Posts já funciona (vai para `?tab=posts`).

## Comportamento desejado

- **Tarefa do tipo Posts** (`id` começa com `posts:`): abrir o cliente já na aba **Posts** (já funciona — manter).
- **Tarefa única** (demanda, planejamento, documentação): abrir o cliente já na **aba correspondente à área da tarefa** e, quando for demanda, **abrir automaticamente o modal de detalhe** daquela demanda específica.

Escopo: apenas o módulo Minhas Tarefas. Nada do Projeto Completo, Clientes, criação de cards ou banco de dados é alterado de forma destrutiva — apenas leitura de um novo query param.

## Mudanças

### 1. `src/lib/minhasTarefas.ts` — gerar links específicos

Atualizar o campo `link` de cada `UnifiedTask` para apontar para a aba correta do Projeto Completo, e (no caso de demandas) incluir o id da demanda como query param para deep-link:

- **Demanda**: `link: /clientes/{cliente_id}/projeto?tab={aba}&demanda={demanda_id}` onde `aba` vem de um helper local equivalente a `categoriaParaAba()` de `ProjetoCliente.tsx`:
  - `EditorVideo` → `videos`
  - `TrafegoPago` → `trafego`
  - `LandingPage` → `lp`
  - `IAAtendimento` → `ia`
  - `Briefing` → `briefing`
  - `Planejamento` → `planejamento`
  - `Personalizado` / `Suporte` / `Designer` (legado) / `Tecnologia` (legado) → `urgencias`
- **Planejamento**: `link: /clientes/{cliente_id}/projeto?tab=planejamento`
- **Documentação**: `link: /clientes/{cliente_id}/projeto?tab=documentacao`
- **Posts** (mantém): `link: /clientes/{cliente_id}/projeto?tab=posts`

### 2. `src/pages/ProjetoCliente.tsx` — abrir demanda automaticamente via query param

Ler `searchParams.get("demanda")`. Quando presente:
- Localizar a demanda em `demandasCli` pelo id.
- Garantir que a `tab` ativa é a correspondente (a tab já vem na URL via `?tab=...`, mas tratamos como fallback caso só venha `?demanda=...`).
- Passar essa demanda para a `AreaTab` correta como prop nova `demandaInicial?: Demanda` (opcional, não-quebrável).
- Após consumir, remover `demanda` da URL via `setSearchParams` (replace) para evitar reabrir ao trocar de aba.

### 3. `src/components/projeto/AreaTab.tsx` — aceitar prop `demandaInicial`

Adicionar prop opcional `demandaInicial?: Demanda | null`. Em um `useEffect`, se vier valor e ainda não houver `selecionada`, chamar `setSelecionada(demandaInicial)` — abrindo o `DemandaDetalheDialog` que já existe no componente. Nenhuma assinatura existente quebra (prop opcional).

### 4. `src/components/tarefas/MinhasTarefasTabela.tsx`

Nenhuma mudança lógica necessária — o botão `ExternalLink` já navega para `t.link`. Como `t.link` agora carrega `?tab=...&demanda=...` para tarefas únicas, o comportamento fica correto automaticamente. Manter o botão "Abrir posts" / "Concluir" como está.

### 5. `public/version.json`

Bump de versão.

## Resultado

- Clicar no ícone azul/externo de uma tarefa de **Posts** → abre cliente na aba Posts (mantido).
- Clicar no ícone de uma tarefa de **Vídeo / Tráfego / LP / IA / Briefing / Planejamento / Urgência** → abre cliente na aba certa **e** o dialog da demanda específica abre automaticamente.
- Clicar em uma tarefa de **Planejamento** ou **Documentação** → abre direto na aba correspondente.
- Sistema antigo (Projeto Completo, criação de demandas, kanban) continua intacto: a única adição é leitura opcional de `?demanda=` e uma prop opcional em `AreaTab`.