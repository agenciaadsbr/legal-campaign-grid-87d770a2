## Objetivo

Tornar o checklist do Planejamento mais compacto e visualmente mais claro, substituindo o "X" por um check verde de "Feito" — tanto no preview quanto nas exportações (TXT/PDF/PNG).

## Arquivo único alterado

`src/components/projeto/PlanejamentoTab.tsx`

## Mudanças no frontend

### 1. Remover ícones das seções
No cabeçalho de cada seção (`SecaoBlock`, ~linha 344) remover o `<span>{secao.icone}</span>`. O label da seção (já em `text-xs uppercase`) fica sozinho, mais limpo.

### 2. Reduzir tamanhos e espaços do checklist
- Cabeçalho de bloco (`p-2.5` → `p-2`), ícone chevron `h-3.5 w-3.5`, label `text-xs`.
- Card do bloco: `CardContent p-2.5 space-y-3` → `p-2 space-y-2`.
- Cabeçalho da seção: `space-y-1.5` → `space-y-1`, label `text-[10px]`, botão "+ item" mais discreto (`h-5 px-1 text-[10px]`).
- Item (`ItemRow`):
  - Padding `p-2` → `px-1.5 py-1`, gap `gap-2` → `gap-1.5`.
  - Título `text-sm` → `text-[12px] leading-tight`.
  - Descrição `text-[11px]` → `text-[10px]`.
  - Badges (situação, atrasado, prazo, responsável): `text-[9px]` → `text-[9px] py-0 px-1 h-4`, ícones `h-2 w-2`.
  - Botões de ação (mover, editar, duplicar, excluir): `h-6 w-6` → `h-5 w-5`, ícones `h-3 w-3`.
- Card de progresso geral: já compacto, sem mudança.

### 3. Substituir checkbox "X" por Check verde de "Feito"

Hoje o `<Checkbox>` do Radix mostra um Check pequeno quando marcado, mas o usuário percebe como "X". Substituir o componente por um botão custom que reflete melhor a ação:

- **Não concluído**: círculo vazio cinza (`<Circle className="h-4 w-4 text-muted-foreground" />`) — clicável.
- **Concluído**: círculo preenchido verde com check branco (`<CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />` ou `<div class="bg-emerald-500 rounded-full"><Check className="h-3 w-3 text-white"/></div>`).

Implementação: trocar `<Checkbox checked={efetivoConcluido} onCheckedChange={toggleConcluido} />` (linhas 454-458) por um `<button>` que renderiza o ícone correspondente e chama `toggleConcluido`. Usar `CheckCircle2` (já importado) verde quando concluído e `Circle` (importar do lucide-react) quando pendente.

Manter o efeito de `line-through` no título quando concluído.

## Mudanças nas exportações (TXT/PDF/PNG)

### TXT e PDF (função `construirTexto`, linhas 103-139)

Trocar a marcação atual:
- `[x]` (concluído) → `✓` (check unicode verde no preview, no PDF/TXT fica como caractere ✓)
- `[ ]` (pendente) → `☐`
- `[!]` (atrasado) → `⚠`

Resultado no arquivo:
```text
ETAPA 1 — ONBOARDING
================================================
INÍCIO DO PROJETO
  ✓ Reunião de Start do Projeto
  ☐ Envio do material de boas-vindas
       Prazo: 05/05/2026
  ⚠ Análise das informações coletadas
```

Observação: `jsPDF` com fonte `helvetica` suporta `✓ ☐ ⚠` no charset Latin-1 estendido. Se algum não renderizar, usar fallback ASCII: `[OK]`, `[ ]`, `[!]`.

### PNG (`exportarPng`)

Como o PNG é gerado a partir do nó DOM via `html-to-image`, ele já refletirá automaticamente o novo check verde do frontend — sem mudanças adicionais.

## Resultado esperado

- Checklist visivelmente mais denso (cabe ~30% mais itens na mesma altura).
- Sem ícones decorativos nas seções, apenas o nome em caps.
- Status "feito" claramente sinalizado com check verde (em vez de quadradinho com X).
- Exportações refletem o mesmo padrão visual: `✓` verde para feito.
