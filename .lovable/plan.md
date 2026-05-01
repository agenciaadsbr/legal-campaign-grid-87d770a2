## Problema

Dentro de "Projeto Completo" (`/clientes/:id/projeto`), o cabeçalho global renderiza um botão de ação no canto superior direito (ex.: "Adicionar item", "Editar briefing", "Adicionar documentação", "Adicionar Tarefa") que **duplica** o botão já existente dentro da própria aba:

- Aba **Planejamento**: já tem "TXT" + "Adicionar item" na toolbar interna → cabeçalho mostra outro "Adicionar item".
- Aba **Documentação**: já tem "Adicionar" interno → cabeçalho mostra "Adicionar documentação".
- Aba **Briefing**: já tem "Editar briefing" interno → cabeçalho mostra outro "Editar briefing".
- Abas de área (Vídeos, Tráfego, LP, IA, Urgências): `AreaTab` já tem "Nova tarefa de …" interno → cabeçalho mostra "Adicionar Tarefa".

Ou seja, o botão global do cabeçalho é redundante em todas as abas.

## Solução

Remover de uma vez o botão de ação global do cabeçalho do Projeto Completo, mantendo apenas os botões internos de cada aba (que já estão posicionados de forma contextual e correta).

## Mudanças técnicas

**`src/pages/ProjetoCliente.tsx`**
- Remover o bloco `headerBtn` (linhas ~151-158) que calcula qual botão mostrar.
- Remover a renderização condicional `{headerBtn && (<Button …>)}` no header (linhas ~205-209).
- Manter intactos os states `novaTarefaOpen`, `novoDocOpen`, `novoPlanOpen`, `editarBriefingTrigger` — eles continuam sendo usados pelos botões internos das abas (que já recebem `novoOpenExterno`/`onNovoOpenChangeExterno`/`modoEdicaoExterno`).
- O dialog `NovaDemandaDialog` global (controlado por `novaTarefaOpen`) permanece, pois cada `AreaTab` continua disparando "Nova tarefa" pelo seu próprio botão interno.

**`public/version.json`**
- Atualizar timestamp.

## Validação

Após aplicar:
- Em **Planejamento**: aparece somente o par "TXT" + "Adicionar item" dentro da aba; cabeçalho não tem botão.
- Em **Documentação**, **Briefing** e abas de área: somente os botões internos respectivos.
- Aba **Visão Geral** e **Posts** continuam sem botão no cabeçalho (já era o comportamento).
- Todos os fluxos de criação/edição continuam funcionando pelos botões internos.
