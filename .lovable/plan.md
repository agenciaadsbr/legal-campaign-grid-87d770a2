## O que vai mudar no card "Projeto completo do cliente" (DemandaDetalheDialog)

### 1) Anexos abrem em visualizador (lightbox) ao clicar

Hoje, clicar em um anexo abre uma nova aba do navegador (`<a target="_blank">`). Vamos trocar por um **visualizador embutido (modal)**:

- Imagens (png/jpg/webp/gif/svg): abrem em um **Dialog** com a imagem em tamanho grande (max 90% da viewport), com botões "Abrir em nova aba" e "Baixar".
- Arquivos não-imagem (PDF/DOC/etc): mantêm o comportamento de abrir em nova aba para download (como antes), porém com tooltip melhor.
- Hover no card do anexo continua mostrando o nome.

### 2) Botão para remover anexo

- Adicionar botão "X" (ícone Trash2) no canto superior direito de cada miniatura de anexo, visível no hover.
- Confirmação rápida via `AlertDialog` ("Remover anexo?") antes de excluir, para evitar clique acidental.
- Criar nova função `removeAnexo(id)` em `src/store/demandas.ts` que:
  - Deleta a linha em `anexos_demandas` no Supabase.
  - Remove do estado local.
  - Mostra toast de sucesso/erro.
- Respeitar permissão: botão só aparece quando `canWrite` é true.

### 3) Corrigir o campo "Atividade / Briefing" que não aceita digitação

**Causa identificada:** o `Textarea` está bindado direto em `demanda.descricao` e dispara `updateDemanda(...)` (chamada Supabase) a cada tecla. Como há subscription realtime que reescreve o objeto `demanda` no store, o cursor "trava" e a digitação não aparece de forma fluida — em alguns casos o caractere é descartado.

**Correção:**
- Manter um **estado local** `descricaoLocal` (`useState`) para o texto sendo digitado.
- Sincronizar com `demanda.descricao` quando a demanda mudar de id (`useEffect` dependendo de `demanda.id`).
- Persistir com **debounce** (500ms) via `setTimeout`, ou em `onBlur`, chamando `updateDemanda(demanda.id, { descricao: descricaoLocal })`.
- Manter o `fieldset disabled={!canWrite}` (segurança).

### Detalhes técnicos

Arquivos editados:

- `src/components/demandas/DemandaDetalheDialog.tsx`
  - Novo estado `previewAnexo: AnexoDemanda | null` + `<Dialog>` para lightbox de imagem.
  - Substituir `<a target="_blank">` por `<button onClick={() => setPreviewAnexo(a)}>` para imagens.
  - Botão de remoção (Trash2) sobreposto na miniatura, com `AlertDialog`.
  - Novo estado `descricaoLocal` + `useEffect` + debounce para o campo Atividade / Briefing.
  - Importar `removeAnexo` do store.

- `src/store/demandas.ts`
  - Adicionar à interface `State`: `removeAnexo: (id: string) => Promise<void>`.
  - Implementar `removeAnexo`: `supabase.from("anexos_demandas").delete().eq("id", id)` + atualizar estado local + toast.

- `public/version.json` — bump do timestamp.

Nada muda fora deste card. As demais abas, kanban e listas continuam iguais.
