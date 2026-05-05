## Aumentar altura dos cards e adicionar scroll interno na descrição

Referência: imagem do usuário (cards ocupando praticamente toda a altura útil da tela, ~700-800px), em vez dos atuais ~420px.

### Arquivo afetado
`src/components/configuracoes/DocumentosGlobaisManager.tsx`

### Mudanças

**1. Container do grid de itens (linha 477)**
Trocar `max-h-[420px]` por uma altura grande baseada em viewport para que cada card de bloco fique alto como no desenho vermelho:

- De: `max-h-[420px] overflow-y-auto`
- Para: `max-h-[calc(100vh-320px)] min-h-[480px] overflow-y-auto`

Isso faz o card crescer até quase o final da tela (mantendo espaço para header/abas) e garante uma altura mínima confortável em telas menores.

**2. Scroll interno na descrição do `ItemGlobalCard` (linhas 669-673)**
Hoje a descrição usa `line-clamp-2` (corta em 2 linhas). Para permitir rolar e ler todo o texto colado em lote dentro do próprio card do item:

- Remover `line-clamp-2`.
- Envolver o texto em um bloco com altura máxima e scroll vertical próprio:
  - `max-h-40 overflow-y-auto pr-1`
  - `whitespace-pre-wrap break-words` (preserva quebras de linha do conteúdo colado em lote)
  - Mesma estilização fina de scrollbar já usada no grid (`[&::-webkit-scrollbar]:w-1.5` etc.) para manter consistência visual com o tema escuro/claro.

**3. Bump de versão**
Atualizar `public/version.json` com novo timestamp para forçar refresh do cliente.

### Resultado esperado
- Cada bloco (Acessos, Links, Reuniões, Materiais, Documentos) ocupa altura semelhante à dos retângulos vermelhos da imagem.
- Dentro de cada item, o texto inserido em lote fica totalmente acessível via barra de rolagem interna do card, sem ser truncado em 2 linhas.
- Tokens semânticos preservados (sem cores hardcoded).