# Plano de Otimização e Correção do Módulo de Clientes

O problema de \\"tela branca\\" e lentidão ocorre porque o sistema tenta carregar todos os dados de uma vez (Clientes, Contratos, Cards, Posts, Comentários, Alertas, etc.) antes de exibir qualquer informação. Com 93 clientes e potencialmente milhares de cards e comentários, o processamento inicial e o mapeamento de dados tornam-se um gargalo.

## Objetivos
- Eliminar a tela branca carregando os dados de forma assíncrona/lazy.
- Melhorar a performance de carregamento utilizando cache e carregamento sob demanda.
- Manter o funcionamento em tempo real (Realtime) sem quebrar funcionalidades.

## Ações Técnicas

### 1. Refatoração do Store (Zustand)
- Alterar `_loadAll` para carregar dados essenciais primeiro (Clientes, Responsáveis, Opções) e carregar dados pesados (Cards, Posts, Comentários) em segundo plano ou sob demanda.
- Implementar carregamento parcial: a tabela de clientes exibirá as informações básicas enquanto os contadores (Posts atrasados, etc.) são calculados assim que os dados chegarem.

### 2. Otimização da Página de Clientes
- Adicionar um estado de `loading` visual na tabela para evitar a tela branca total.
- Utilizar `useMemo` de forma mais agressiva para evitar re-renderizações desnecessárias.

### 3. Melhoria nas Consultas Supabase
- Ativar o carregamento por partes para tabelas que crescem indefinidamente (comentários e posts).
- Adicionar tratamento de erro individual por tabela para que falhas em dados secundários não bloqueiem a visualização principal.

### 4. Interface (UX)
- Exibir placeholders (skeletons) ou um indicador de progresso enquanto os dados pesados são baixados.
- Garantir que a transição entre estados de carregamento seja fluida.

---

**Detalhes Técnicos:**
- Modificação no arquivo `src/store/crm.ts` para separar as chamadas do `Promise.all`.
- Atualização em `src/pages/Clientes.tsx` para lidar com o estado `loading` global do store.
- Otimização da lógica de mapeamento em `mapCliente` para lidar com dados ainda não carregados.
