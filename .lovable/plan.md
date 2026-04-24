## Padronização de Tema Escuro (Azul Profundo) e Tema Claro (Consistente)

### Contexto
O sistema atual possui tokens CSS em `src/index.css` com uma paleta dark que usa cinzas-escuros próximos ao preto no fundo e sidebar. O usuário solicita que **todo o dark mode seja azul escuro profundo**, sem cinzas, e que o light mode seja igualmente padronizado. Isso deve valer para o sistema atual e todas as atualizações futuras.

### Problemas Identificados
1. **Dark background** usa `222 47% 6%` (quase preto acinzentado), longe de um azul escuro.
2. **Sidebar dark** usa `222 47% 4%` (preto-azulado muito profundo), destoando do restante.
3. **Cards no dark** usam `222 47% 9%` — falta saturação azulada.
4. **Bordas no dark** usam `217 33% 17%` — tom acinzentado.
5. **Texto no dark** usa `210 40% 98%` (branco puro) em vez de branco-azulado.

### Alterações Propostas

#### 1. `src/index.css` — Refatoração completa dos tokens HSL

Reescrita da seção `:root` (light) e `.dark` para criar duas identidades coesas:

**Light Mode (corrente → refinado):**
- Mantém superfícies claras (branco/cinza muito claro).
- **Sidebar** permanece azul escuro (`222 47% 11%`) para identidade jurídica consistente.
- Ajusta `foreground` para um azul-escuro de leitura (`222 40% 12%`).
- Unifica `border`, `input`, `muted` para tons de azul claro frio.

**Dark Mode (refatoração radical):**
- **Background** → `222 47% 8%` (azul extremamente escuro, não cinza).
- **Card / Popover** → `222 45% 11%` (azul escuro com leve saturação).
- **Foreground** → `215 25% 92%` (branco-azulado suave).
- **Secondary / Muted / Accent** → tons de azul escuro profundo (`220 35% 16%` etc.), **zero cinza puro**.
- **Border / Input** → `220 25% 18%` (azul médio escuro).
- **Sidebar** → `222 47% 10%` (alinhado com o background geral, não preto).
- **Sidebar-accent / border** → tons azulados equivalentes.

#### 2. `src/components/AppSidebar.tsx` — Remoção de hardcoded colors
O componente já usa `text-sidebar-foreground`, `bg-sidebar-accent` etc. Verificar e garantir que não há cores hex hardcoded nos avatares ou badges que quebrem a coerência no dark mode (ex.: `bg-primary/20` pode funcionar, mas revisar contrastes).

#### 3. `src/components/AppLayout.tsx` — Header e estrutura
O header usa `bg-card` e `border-b`. Com os novos tokens, herdará automaticamente o azul escuro no dark. Nenhuma mudança de código necessária, apenas validação visual.

#### 4. Validação de componentes de página
Verificar `src/pages/Dashboard.tsx`, `src/pages/Clientes.tsx`, `src/pages/ClienteDetalhe.tsx` e `src/pages/PostDetalhe.tsx` para garantir que nenhuma cor fixa (hex, rgb) escape dos tokens CSS. Todos os elementos devem usar `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, etc.

#### 5. Criação de memória de design
Salvar em `mem://design/color-tokens` a regra definitiva:
> **Dark mode = azul profundo em TUDO.** Nenhum cinza-escuro ou preto puro. Background ~HSL 222 47% 8%, cards ~222 45% 11%, bordas ~220 25% 18%, texto branco-azulado.
> **Light mode = superfícies claras frias com sidebar azul escuro.** Background ~HSL 220 25% 98%, cards branco, texto azul-escuro.

### Resumo Técnico
- Arquivo principal afetado: `src/index.css` (tokens HSL).
- Arquivos secundários: possíveis ajustes menores em `AppSidebar.tsx`, `Dashboard.tsx` caso se encontrem cores hardcoded.
- Sem alterações no `tailwind.config.ts` (as chaves mapeiam `var(--...)` e permanecem válidas).
- Resultado: dark mode visualmente coeso em azul profundo jurídico; light mode limpo e consistente.