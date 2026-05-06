## Problema identificado

A aba "Posts" do cliente **Timidati advogados** está diferente do padrão do sistema porque os 12 cards no banco foram criados com o título genérico **"Criar Post"** em vez do padrão usado por todos os outros clientes: **"Post Mês X - Semana Y"**.

### Como isso afeta a tela
O componente `PostsKanbanCliente.tsx` detecta o título "placeholder" via regex `^Post Mês \d+ - Semana \d+$`. Quando o título bate com esse padrão e o card está em "Planejamento", a UI mostra:
- O texto cinza/itálico "Definir título da tarefa"
- O botão "Iniciar tarefa" funcionando como esperado

Como os cards do Timidati têm título "Criar Post", o regex não bate e a aba aparece "fora do padrão" (mostra literal "Criar Post" em todos os 12 cards, sem o tratamento de placeholder).

### Diagnóstico
- Cliente Timidati (`b265e560-abd5-4a0e-9a39-0c3bd1bc16ba`): **12/12 cards** com título "Criar Post", todos em status "Planejamento", `posicao` 0–11.
- Demais clientes: cards seguem padrão "Post Mês X - Semana Y" (ex.: cliente 44880f3b... mostra "Post Mês 1 - Semana 1" … "Post Mês 2 - Semana 2").
- Outros clientes têm no máximo 1–2 cards com título customizado, o que é esperado (edições legítimas do usuário).

## Correção

Migração SQL única para padronizar os 12 cards do Timidati que ainda estão como rascunho ("Planejamento") e cujo título é exatamente "Criar Post":

```sql
UPDATE public.cards
SET titulo = 'Post Mês ' || (floor(posicao / 4)::int + 1) || ' - Semana ' || ((posicao % 4) + 1),
    updated_at = now()
WHERE cliente_id = 'b265e560-abd5-4a0e-9a39-0c3bd1bc16ba'
  AND status = 'Planejamento'
  AND titulo = 'Criar Post';
```

Resultado esperado:
- posicao 0 → "Post Mês 1 - Semana 1"
- posicao 1 → "Post Mês 1 - Semana 2"
- … 
- posicao 11 → "Post Mês 3 - Semana 4"

Após o UPDATE, a aba Posts do Timidati passa a se comportar exatamente como a dos demais clientes (placeholder "Definir título da tarefa", botão "Iniciar tarefa", agrupamento por mês no filtro etc.).

## Escopo

- Apenas 1 migração SQL (não há mudança de código).
- Nenhum outro cliente é afetado (filtro por `cliente_id` específico).
- Cards já editados manualmente pelo usuário (com outro título) ficam intactos pelo filtro `titulo = 'Criar Post'`.

## Investigar a causa raiz (opcional, fora deste fix)

Vale checar depois de onde veio o título "Criar Post" para esses cards (provavelmente uma criação manual em lote anterior à padronização). O código atual em `src/store/crm.ts` já gera o título correto ao criar rascunhos, então o problema não deve se repetir para novos clientes.
