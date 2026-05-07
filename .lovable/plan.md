## Objetivo

1. Adicionar dois campos de URL — **Link do Meister** e **Link do Drive** — ao formulário "Detalhes da Tarefa" (`DemandaDetalheDialog`) **apenas** quando a categoria da demanda for uma destas:
   - Vídeo (`EditorVideo`)
   - Tráfego Pago (`TrafegoPago`)
   - Landing Page / Site (`LandingPage`)
   - IA / Atendimento (`IAAtendimento`)
   - Urgência / Outro (`Personalizado`)

2. Tornar o campo **Atividade / Briefing** com altura fixa (sem o "puxador" de redimensionamento) e scroll interno quando o texto crescer.

## Mudanças

### 1. Banco — novos campos em `demandas`

Migration adicionando duas colunas opcionais:

```sql
alter table public.demandas
  add column if not exists link_meister text,
  add column if not exists link_drive text;
```

Sem alterar RLS (campos ficam sob as políticas existentes da tabela).

### 2. `src/store/demandas.ts`

- Adicionar `link_meister: string | null` e `link_drive: string | null` à interface `Demanda`.
- `normalizeDemanda` propaga os dois campos (já vêm via `...row`, garantir defaults `null`).
- `createDemanda` / `createRascunho` aceitam e gravam os campos quando enviados.
- `updateDemanda` já encaminha qualquer patch parcial — basta funcionar via tipagem.

### 3. `src/components/demandas/DemandaDetalheDialog.tsx`

**Links Meister / Drive** (novo bloco):

- Criar constante local `CATEGORIAS_COM_LINKS = ["EditorVideo","TrafegoPago","LandingPage","IAAtendimento","Personalizado"]`.
- Renderizar o bloco logo após o card de Anexos e antes do "Atividade / Briefing", apenas se `CATEGORIAS_COM_LINKS.includes(demanda.categoria)`.
- Dois `Input type="url"` lado a lado (grid 2 colunas em md, empilha em mobile), com label `Link do Meister` e `Link do Drive`.
- Estado local com debounce de 600 ms (mesmo padrão do `descricaoLocal`) para não disparar update a cada tecla.
- Quando preenchido, mostrar pequeno ícone-link (`<a target="_blank">`) ao lado do input para abrir.

**Briefing fixo + scroll interno** (linhas 799-825):

- Substituir o `<Textarea rows={2} className="mt-1 min-h-[56px] text-xs" />` por:
  - `className="mt-1 h-32 max-h-32 resize-none overflow-y-auto text-xs"` (altura fixa ~128 px, sem handle de resize, scroll vertical interno).
- Manter toda a lógica de debounce/onBlur intacta.

### 4. Sem mudanças em outras telas

Kanban, listas e cards continuam usando os mesmos campos existentes; os novos só aparecem dentro do dialog conforme regra de categoria.

## Detalhes técnicos

- Tipagem dos novos campos é `string | null` para alinhar com Postgres `text` nullable.
- Patch de update envia `null` quando o input fica vazio (para limpar o valor no banco).
- Validação leve: se o usuário digitar algo que não comece com `http`, mostramos o ícone de link como desabilitado (sem bloquear o save — campo é livre).
- Os `Input` reutilizam `@/components/ui/input` para herdar tokens semânticos do tema (sem cores hardcoded).

## Fora de escopo

- Não exibir os links em outras visões (kanban, listas).
- Sem migração de dados antigos (campos novos começam vazios).
- Sem alteração de regras de acesso/RLS.
