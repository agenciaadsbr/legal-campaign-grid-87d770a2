## Problemas identificados

### 1. Datas e links do post não salvam
A tabela `posts` no banco **não tem** as colunas `data_agendamento`, `data_postagem`, `link_post` nem `link_meister`. Esses campos só existem na interface TypeScript. Quando o usuário altera "Data agendamento" / "Data postagem" / links, a UI atualiza por um instante, mas o `updatePost` no store ignora esses campos no `dbPatch` (linhas 772-780 de `src/store/crm.ts`) — nada é gravado, e o `_loadAll()` subsequente repõe o valor antigo. É por isso que o campo "não contabiliza em tempo real".

### 2. Faltam ações no cabeçalho do detalhe (igual à imagem da Demanda)
O detalhe do Post (`src/pages/PostDetalhe.tsx`) não tem o botão de **copiar link** da tarefa nem o botão de **excluir** a tarefa. A tela de Demanda já tem ambos (`DemandaDetalheDialog.tsx` linhas 363-405) e servirá de referência visual e funcional.

## O que será feito

### A. Migração SQL — adicionar colunas em `posts`
```sql
alter table public.posts
  add column if not exists data_agendamento date,
  add column if not exists data_postagem    date,
  add column if not exists link_post        text,
  add column if not exists link_meister     text;
```
Sem alteração de RLS (políticas atuais já cobrem as colunas novas).

### B. Store `src/store/crm.ts`
1. **`mapPost`** (l. 373): ler `data_agendamento`, `data_postagem`, `link_post`, `link_meister` da linha do banco.
2. **`updatePost`** (l. 772): adicionar ao `dbPatch` os 4 novos campos quando vierem no `patch` (mesmo padrão dos demais).
3. Adicionar action **`deleteCard(cardId)`** que apaga `comentarios` (post desse card), `posts` e o `card` em si — equivalente ao `deleteDemanda`. Recarrega via `_loadAll()`.

### C. `src/pages/PostDetalhe.tsx`
1. **Botão "Copiar link"** (ícone `Link2`) ao lado do `<Select>` de status. Reaproveita a mesma lógica do `copiarLink` da demanda: troca origin para o domínio publicado quando estiver no preview Lovable. URL gerada:
   ```
   {origin}/clientes/{cliente_id}/posts/{post.id}
   ```
2. **Botão "Excluir tarefa"** (ícone `Trash2`, vermelho), visível apenas para `isAdmin` (via `useAuth`), envolto em `AlertDialog` de confirmação com texto "Esta ação não pode ser desfeita. Anexos, comentários e o post serão removidos." No confirmar: chama `deleteCard(card.id)`, mostra toast e navega de volta para `/clientes/{clienteId}?tab=posts`.
3. Os inputs de data e links continuam usando `updatePost` (já chamam corretamente — o conserto está no store).

## Layout do cabeçalho (referência: imagem enviada)

```text
[Título da tarefa ............]   [⚡ Urgente] [● Status ▾] [🔗] [🗑]
```

## Arquivos alterados

- `supabase/migrations/<novo>.sql` — adiciona 4 colunas em `posts`
- `src/store/crm.ts` — `mapPost`, `updatePost`, novo `deleteCard` + tipo na interface `CRMState`
- `src/pages/PostDetalhe.tsx` — botões copiar link e excluir no header

## Fora de escopo
- Realtime via Supabase Channels (não é necessário — o `_loadAll` já é chamado após cada `updatePost`; o "tempo real" do usuário é a persistência funcionando).
- Mudanças visuais nas datas/links em si.
