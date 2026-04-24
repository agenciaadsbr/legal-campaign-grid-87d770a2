## Unificar Colunas de Data na Tabela de Clientes

### Objetivo
Substituir as colunas separadas "Data Início" e "Data Fim" por uma única coluna "Período do Contrato", onde as duas datas serão exibidas verticalmente (uma acima da outra) dentro da mesma célula da tabela.

### Arquivos a Modificar

1.  **`src/store/crm.ts`** (Linha 188+): Atualizar o array `colunasPadrao`.
    *   **Remover** as colunas `data_inicio_contrato` (tipo: data) e `data_fim_contrato` (tipo: data).
    *   **Adicionar** uma nova coluna `periodo_contrato` (tipo: texto, fixa: true, largura: 160) com o label "Período do Contrato".

2.  **`src/pages/Clientes.tsx`** (Linha 246+): Atualizar o componente `CelulaValor`.
    *   **Adicionar** um caso específico para quando `col.key === "periodo_contrato"`.
    *   Neste caso, renderizar um container `div` com layout `flex-col` (flex-direction: column).
    *   Exibir `cliente.data_inicio_contrato` com um label "Início" em fonte menor/muted.
    *   Exibir `cliente.data_fim_contrato` com um label "Fim" em fonte menor/muted, abaixo da data de início.
    *   Garantir que ambas as datas sejam formatadas para o padrão local (pt-BR) usando `toLocaleDateString`.

### Resultado Esperado
Na tabela de clientes, as colunas individuais de Data Início e Data Fim desaparecerão. Surgirá uma coluna única "Período do Contrato". Cada linha nesta coluna mostrará:
```
Início: 01/04/2026
Fim:    01/07/2026
```
Isso economiza espaço horizontal na tabela e melhora a experiência do usuário ao visualizar o vínculo temporal do contrato de forma compacta.