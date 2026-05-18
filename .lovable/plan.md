## Causa identificada

A tela fica presa em "Carregando CRM..." por uma combinação de dois problemas, ambos confirmados pelos logs do console/rede:

1. **Refresh token falhando indefinidamente**: o navegador está mostrando, a cada 20s, `POST /auth/v1/token?grant_type=refresh_token` → `Failed to fetch`. Enquanto isso, todas as próximas chamadas Supabase ficam aguardando o token ser renovado e travam silenciosamente — nunca dão erro, nunca resolvem.

2. **`_loadAll` do `useCRM` dispara antes da sessão estar pronta e não tem timeout/abort**:
   - `useCRMBootstrap()` (em `AppLayout`) chama `s._loadAll()` no mount sem checar `useAuth().loading` ou `user`.
   - Dentro de `_loadAll` há `if (get().loading) return;` + `set({ loading: true })`. Se as 10 queries do `Promise.all` ficarem penduradas (refresh token travado), `loading` permanece `true` para sempre e o overlay "Carregando CRM..." nunca some.
   - O `try/catch` só recupera em caso de erro lançado — uma promise que nunca resolve não cai no `catch`.
   - O bloco `if (!get().heavyDataLoading)` também sofre do mesmo problema na fase pesada.

O `RequireAuth` não chega a redirecionar para `/auth` porque o `getSession()` inicial resolve com a sessão antiga válida em cache (refresh ainda não venceu), então `user` existe e a UI tenta renderizar `AppLayout` → dispara `_loadAll` → trava nas queries.

## Correções (mínimas, sem mexer em layout, componentes ou dados)

### 1. `src/store/crm.ts` — tornar `_loadAll` resiliente

- Adicionar **timeout de segurança** (ex.: 20s) em torno do `Promise.all` essencial. Se estourar:
  - `set({ loading: false })`
  - mostrar `toast.error("Falha ao carregar dados — verifique sua conexão.")`
  - logar no console o motivo
- Envolver também o bloco pesado (cards/posts/comentários/alertas) em try/catch próprio, com `set({ heavyDataLoading: false })` no `finally`, para nunca deixar `heavyDataLoading: true` preso.
- Manter o guard `if (get().loading) return;`, mas adicionar contraponto: se já houver `loaded: true`, permitir reload (já é o caso, ok).
- Tratar erros parciais das queries (`res.error`) com `console.warn` em vez de descartar silenciosamente.

### 2. `src/store/crm.ts` — `useCRMBootstrap` gated por auth

- Importar `useAuth` (ou usar `supabase.auth.getSession()` direto) e só chamar `s._loadAll()` quando houver `user` e `loading === false`.
- Não iniciar `startRealtime()` antes de ter sessão (canal realtime sem auth costuma ficar pendurado também).
- Manter idempotência (sem disparar duas vezes).

### 3. `src/hooks/auth-provider.tsx` — não travar em refresh token

- O `onAuthStateChange` já lida com `SIGNED_OUT`. Adicionar tratamento de `TOKEN_REFRESHED` falho:
  - Se `supabase.auth.getSession()` retornar erro de rede, ainda assim chamar `setLoading(false)` (já é feito) e limpar sessão para `RequireAuth` redirecionar a `/auth`, evitando UI presa.
- Garantir que `setLoading(false)` esteja em `finally` do `getSession().then(...)` (atualmente está dentro do `.then` — se rejeitar, fica `loading=true` para sempre). Trocar para `.then(...).catch(...).finally(() => setLoading(false))`.

### 4. Pequenos logs temporários (removidos depois)

Logs mínimos no `_loadAll` apenas durante esta correção: início, contagem de cada array retornado, erros. Remover ao final ou deixar atrás de `if (import.meta.env.DEV)`.

## Arquivos afetados

- `src/store/crm.ts` — timeout em `_loadAll`, `finally` para `heavyDataLoading`, gate de auth em `useCRMBootstrap`, realtime só após sessão.
- `src/hooks/auth-provider.tsx` — `.finally(setLoading(false))` no `getSession()`.

## O que NÃO será alterado

- Layout, componentes visuais, textos, ordem de elementos, tema.
- Schema, dados, políticas RLS (não vou rodar migrations — o erro é cliente, não banco).
- Estrutura dos stores, mappers, queries (somente envolver com timeout/try-finally).
- Auth, filtros, módulos, funcionalidades existentes.

## Como validar

1. Recarregar `/clientes` → overlay "Carregando CRM..." some em ≤20s mesmo se refresh token continuar falhando.
2. Em caso de falha real de rede, aparece toast de erro em vez de tela travada.
3. Login/logout e troca de cliente seguem funcionando.
4. Abas Projeto Completo, Posts, Demandas continuam exibindo dados.
