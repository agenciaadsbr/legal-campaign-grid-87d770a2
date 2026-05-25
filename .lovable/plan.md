## Objetivo
Garantir que, quando qualquer usuário atualizar a foto em **Configurações > Meu perfil**, essa foto apareça em todos os avatares e ícones do sistema sem depender de fallback manual ou de dados antigos.

## O que vou fazer
1. **Reforçar a sincronização do avatar na origem**
   - Revisar o fluxo de upload/remoção em `MeuPerfil.tsx` para garantir atualização consistente em `profiles` e `responsaveis`.
   - Forçar recarga/refresh do estado global após a alteração para refletir a foto imediatamente na interface.

2. **Padronizar a resolução do avatar no store**
   - Ajustar `src/store/crm.ts` para sempre priorizar a melhor fonte disponível de foto por usuário.
   - Garantir fallback defensivo entre `responsaveis.avatar_url` e `profiles.avatar_url` em todos os mapeamentos usados pela UI.

3. **Corrigir componentes que ainda desenham avatar manualmente**
   - Substituir avatares locais baseados só em cor/iniciais por renderização que respeite `avatar_url`.
   - Pontos já identificados:
     - `src/components/HistoricoComentariosDialog.tsx`
     - `src/components/demandas/DemandaDetalheDialog.tsx`
   - Revisar também os pontos de atividade/histórico ligados ao autor para evitar exibição parcial do nome/fallback sem foto.

4. **Validar telas onde o problema ainda aparece**
   - Conferir especialmente o fluxo mostrado no print do usuário, incluindo quadro operacional e cards atribuídos.
   - Verificar listas, stacks e áreas de comentários/atividade para confirmar que os ícones passaram a mostrar a foto correta.

## Resultado esperado
- Sempre que um usuário atualizar sua foto no perfil, o avatar novo deve aparecer em todo o sistema.
- Quando a foto existir em pelo menos uma das fontes válidas, o sistema não deve mais cair para a inicial/color badge.
- Os cards operacionais, comentários, histórico e demais áreas atribuídas ao usuário passam a ficar consistentes.

## Detalhes técnicos
- Arquivos principais: `src/components/MeuPerfil.tsx`, `src/store/crm.ts`, `src/components/HistoricoComentariosDialog.tsx`, `src/components/demandas/DemandaDetalheDialog.tsx`.
- Estratégia: centralizar a lógica de resolução do avatar e remover renderizações paralelas que ignoram `avatar_url`.
- Validação: revisar a UI nas áreas afetadas após a implementação para confirmar propagação completa.