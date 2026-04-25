## Ocultar colunas quando grupos de status estão colapsados

**`src/pages/Clientes.tsx`**:
- Calcular `algumGrupoAberto = statusOptions.some(s => (grupos[s.label]?.length > 0) && !grupoColapsado[s.label])`.
- Renderizar `<thead>` condicionalmente apenas quando `algumGrupoAberto === true`.
- Ajustar `border-b` das linhas de cabeçalho de grupo para apenas quando o grupo estiver expandido, deixando o visual de "pílulas" limpo quando tudo está retraído (semelhante à imagem de referência).

**Preservado**:
- Lógica de agrupamento, filtros, busca e store `useCRM` permanecem inalterados.
- Comportamento de expandir/colapsar individual por status continua igual.
