## Diagnóstico

A foto enviada em **Configurações → Meu Perfil** é gravada apenas em `profiles.avatar_url`. Já os ícones de avatar exibidos em cards, kanban (Posts/Vídeos/etc.), listas de responsáveis e popovers vêm da tabela `responsaveis` (campo `responsaveis.avatar_url`), via `useCRM().responsaveis` e `AvatarStack`.

Como o upload nunca propaga para `responsaveis`, usuários como o Robson ficam com foto no perfil mas com inicial colorida nos cards.

## Plano

### 1. Propagar upload/remoção em `MeuPerfil.tsx`
Após atualizar `profiles.avatar_url`:
- Buscar `profiles.responsavel_id` do usuário logado.
- Se existir, fazer `update` em `responsaveis.avatar_url` com a mesma URL (ou `null` ao remover).
- Disparar `loadAll()` do store `useCRM` para refletir imediatamente em toda a UI.

### 2. Backfill dos usuários que já têm foto no perfil
Criar migração SQL que copia `profiles.avatar_url` → `responsaveis.avatar_url` quando:
- `profiles.responsavel_id IS NOT NULL`
- `profiles.avatar_url IS NOT NULL`
- e o `responsaveis.avatar_url` correspondente está vazio.

Isso resolve o caso do Robson sem precisar pedir novo upload.

### 3. Fallback defensivo no carregamento (`src/store/crm.ts`)
Em `loadAll`, ao montar o array `responsaveis`, se `responsavel.avatar_url` estiver vazio e existir um `profile` vinculado com `avatar_url`, usar o do profile como fallback. Garante consistência mesmo se algum upload futuro falhar em propagar.

### 4. Realtime (opcional, recomendado)
Assinar mudanças na tabela `responsaveis` no `useCRM` para invalidar/recarregar quando outro usuário atualizar a foto, evitando precisar de refresh manual em outras sessões abertas.

## Componentes envolvidos (sem mudança de lógica visual)
- `src/components/MeuPerfil.tsx` — propagação no upload/remoção.
- `src/store/crm.ts` — fallback profile→responsavel e (opcional) realtime.
- Nova migração Supabase para o backfill.

Nenhuma alteração nos componentes que renderizam o avatar (`AvatarStack`, `CelulaResponsaveis`, `AtribuirResponsaveisPopover`, AppSidebar) — eles já leem corretamente de `avatar_url`.