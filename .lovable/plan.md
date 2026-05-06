Vou corrigir o `Detalhe da Demanda` para abrir centralizado, sem barra de rolagem no modal principal e com todos os campos/seções visíveis na viewport atual.

Plano de alteração:

1. Ajustar o container do modal em `src/components/demandas/DemandaDetalheDialog.tsx`
   - Remover `overflow-y-auto` e a limitação que cria a barra do `DialogContent`.
   - Usar altura controlada por viewport (`max-h`/`h` compatível com a tela), mantendo o modal centralizado.
   - Ajustar largura para um padrão mais confortável sem voltar ao tamanho excessivo.

2. Compactar o layout sem remover nada
   - Reduzir paddings, gaps e margens desnecessárias nos cards, cabeçalho, seções, labels e inputs.
   - Reduzir discretamente tamanhos de fonte onde houver excesso, preservando legibilidade.
   - Reduzir altura dos campos de data/select/input e do bloco de anexos.
   - Reduzir a altura do campo `Atividade / Briefing` para caber sem rolagem.

3. Reorganizar visualmente dentro do layout existente
   - Manter os mesmos campos, seções e funcionalidades: título, urgência, status, excluir, categoria, subtipo, prioridade, datas, responsáveis, anexos, briefing, comentários, composer e histórico.
   - Usar uma composição mais compacta, provavelmente em duas áreas/colunas em telas desktop, para evitar que todo o conteúdo fique empilhado verticalmente.
   - Manter comportamento responsivo: em telas menores, se não houver espaço físico suficiente, o layout continuará adaptado sem quebrar campos.

4. Remover barras internas desnecessárias relacionadas ao modal
   - Eliminar a barra principal do formulário.
   - Revisar o bloco de comentários (`max-h-80 overflow-auto`) para não exibir uma segunda barra grande dentro do modal no estado padrão; se houver muitos comentários, manter o conteúdo acessível de forma controlada sem afetar o formulário principal.

Resultado esperado:
- O formulário abre centralizado.
- A barra de rolagem principal do `Detalhe da Demanda` desaparece.
- Todos os campos e seções continuam existindo e visíveis.
- O modal fica compacto o suficiente para a viewport mostrada pelo usuário, sem remover funcionalidades ou alterar o fluxo existente.