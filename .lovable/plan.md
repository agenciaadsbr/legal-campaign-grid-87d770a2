## Diagnóstico

O espaço excessivo marcado em vermelho é o **espaço horizontal entre as colunas** da tabela (principalmente entre "Cliente", "Responsáveis" e "Última atividade"). Como a tabela usa largura 100% e as colunas não têm largura definida, o navegador distribui o excesso uniformemente, gerando grandes vazios.

## Plano de correção

Editar **`src/components/demandas/ClientesDemandasTable.tsx`** aplicando larguras fixas/máximas em cada coluna, mantendo exatamente o mesmo layout, design, cores e componentes:

1. Adicionar `className="w-full table-fixed"` ou usar larguras explícitas via `<TableHead>`:
   - **Cliente**: `w-[28%]` (texto principal, precisa de espaço)
   - **Responsáveis**: `w-[110px]` (avatares pequenos)
   - **Última atividade**: `w-[110px]`
   - **Total / Atrasadas / Urgentes**: `w-[80px]` cada, centralizado
   - **Ações**: `w-[110px]`, alinhado à direita
2. Envolver a tabela em um container `max-w-5xl` para que, em telas largas (1576px), a tabela não estique até a borda — eliminando 100% do vazio entre colunas sem alterar o visual de cada célula.
3. Não alterar paddings, fontes, badges, AvatarStack, nem o card externo — apenas larguras de coluna e largura máxima do container.

## Resultado esperado

As colunas ficam justas entre si, eliminando o vazio horizontal destacado em vermelho, mantendo o mesmo design (badges, avatares, tipografia, cores e espaçamento vertical já compactado anteriormente).
