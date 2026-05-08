## Corrigir ações do lightbox de Anexos

Arquivo: `src/components/demandas/DemandaDetalheDialog.tsx` (linhas 1145–1161, lightbox do anexo).

### Mudanças

1. **Remover** o link "Abrir em nova aba" (`<a target="_blank">`) — apenas deletar o elemento.

2. **Substituir o `<a download>`** por um `<button>` que faz download real via blob:
   - Handler `async` faz `fetch(previewAnexo.url)` → `response.blob()` → cria `URL.createObjectURL(blob)` → cria `<a>` temporário com `download={previewAnexo.nome}` → `click()` → remove e `revokeObjectURL`.
   - O bucket `anexos` é público no Supabase Storage, mas é cross-origin em relação ao app, então o atributo `download` é ignorado pelo navegador hoje (causa abertura em nova aba/visualização em vez de download). Buscar como blob primeiro força o download real.
   - Try/catch com `toast.error("Falha ao baixar anexo")` em caso de erro de rede.
   - Estilo mantido (`text-xs text-primary hover:underline px-2`).

### Fora do escopo

- Outras telas de anexo (não há outras com esses dois botões).
- Mudanças no upload, remoção, ou listagem de anexos.
- Mudanças de design / layout do lightbox.