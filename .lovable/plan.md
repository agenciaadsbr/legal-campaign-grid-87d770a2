
# Problema raiz

A página `/clientes` (e todo o app) lê de um **store Zustand em localStorage**, não do Supabase. Por isso:
- O cliente cadastrado não aparece para ninguém além do navegador onde foi criado.
- As colunas criadas em "Gerenciar Colunas" também ficam só no localStorage.
- Os grupos de status na tabela (`statusOptions`) estão vazios → mesmo que o cliente esteja no estado local, ele não tem onde "cair" na tabela agrupada.
- `addCliente` ainda gera cards/posts mockados automaticamente (contradiz "só dados reais").

# Solução

Refatorar `src/store/crm.ts` para virar um **client-side cache sincronizado com o Supabase** via `@tanstack/react-query` + Realtime, mantendo a mesma API pública (`useCRM()` retornando `clientes`, `colunasCliente`, `addCliente`, `updateCliente`, etc.) para não quebrar as 13 páginas/componentes que o consomem.

## 1. Novo `src/store/crm.ts` (orquestrador Supabase)

- Trocar o Zustand+persist por um hook `useCRM()` que internamente usa **React Query** (`useQuery` + `useMutation`) contra as tabelas Supabase:
  - `clientes`, `colunas_cliente`, `modelos_colunas`, `nichos`, `status_options`, `responsaveis`, `cards`, `posts`, `contratos`, `comentarios`, `alertas`, `custom_fields`.
- Mapeamento de campos (store ↔ DB):
  - `nome_cliente` ↔ `clientes.nome`
  - `status_cliente` ↔ `clientes.status`
  - `responsaveis` (array) ↔ `clientes.responsaveis_ids`
  - `observacoes` ↔ `clientes.descricao`
  - `data_inicio_contrato` / `data_fim_contrato` ↔ derivado da tabela `contratos` (lido junto via segunda query) ou movido para um campo simples.
  - `custom` ↔ `clientes.campos_personalizados`
  - `ultimo_comentario` → calculado em runtime a partir de `comentarios` (não persistir).
- Mutações (`addCliente`, `updateCliente`, `addColumn`, etc.) viram `useMutation` que faz `supabase.from(...).insert/update/delete` e invalida o cache.
- **Remover `gerarCardsEPosts`** de `addCliente` — só cria o registro do cliente + contrato. Cards/posts passam a ser criados manualmente pelo usuário (ou opcionalmente, via botão "Gerar cronograma" futuro).
- Manter o tipo `ColumnConfig` e `DropdownOption` exportados para que páginas existentes continuem compilando.

## 2. Realtime (atualização em tempo real entre usuários)

Em `useCRM`, adicionar `useEffect` que assina:
```
supabase.channel('crm').on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => qc.invalidateQueries(['clientes']))
```
Repetir para `colunas_cliente`, `cards`, `posts`, `status_options`, `nichos`, `responsaveis`. Assim, qualquer cliente cadastrado por qualquer usuário aparece imediatamente em todas as sessões.

## 3. Seed inicial das colunas e status (uma única vez)

A tabela `colunas_cliente` está vazia. Criar **migração SQL** que faz `INSERT ... ON CONFLICT DO NOTHING` das 7 colunas padrão (`nome_cliente`, `responsaveis`, `ultimo_comentario`, `nicho`, `periodo_contrato`, `posts`, `observacoes`) e dos 4 status iniciais em `status_options` (`Ativo`, `Pausado`, `Próximo da renovação`, `Finalizado`) — só se as tabelas estiverem vazias. Sem isso, mesmo conectando ao Supabase, a tabela renderiza sem colunas e sem grupos.

## 4. Ajustes em `src/pages/Clientes.tsx`

- Trocar `currentUserId = responsaveis[0]?.id` por `useAuth().user?.id` (com fallback para o `profile.responsavel_id` se existir) — assim o filtro "Minhas tarefas" funciona com o usuário logado de verdade.
- Adicionar estado de `loading` (skeleton enquanto a query inicial roda).
- Mensagem vazia mais clara quando não há `statusOptions` cadastrados ("Crie um status em Configurações para agrupar clientes").

## 5. Limpeza do localStorage antigo

No bootstrap do app (`src/main.tsx` ou `App.tsx`), remover qualquer chave `crm-juridico-*` do localStorage para evitar conflito com versões anteriores em cache no navegador do usuário.

## 6. Páginas dependentes — verificação

Após a refatoração, validar que continuam funcionando sem mudanças (a API do hook é preservada):
- `Dashboard.tsx`, `Contratos.tsx`, `Alertas.tsx`, `Relatorios.tsx`, `ClienteDetalhe.tsx`, `PostDetalhe.tsx`
- `ConfiguracoesSheet`, `GerenciarColunas`, `ResponsaveisEditor`, `OpcoesEditor`, `CamposPersonalizadosEditor`, `HistoricoComentariosDialog`, `AppLayout`

## Resultado esperado

- Cliente cadastrado em "+ Novo Cliente" aparece imediatamente na tabela e em todo o sistema (Dashboard, Contratos, Relatórios), para todos os usuários.
- Colunas criadas em "Gerenciar Colunas" persistem no banco e aparecem para todos.
- Sem dados mockados — só o que o usuário cria.
- Multi-usuário real, com sincronização ao vivo via Supabase Realtime.
