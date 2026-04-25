
# Reestruturação do Painel "Clientes"

Objetivo: tornar o painel mais operacional — Status de Posts vira a hierarquia principal; Status do Cliente vira metadado (badge + filtro). Alertas absorvem as situações que hoje "poluem" a tabela.

---

## 1. `src/pages/Clientes.tsx` — refatorar tabela e topo

### 1.1 Remover agrupamento por Status do Cliente
- Eliminar o bloco `statusOptions.map((status) => ...)` (linhas ~857-898) que renderiza as seções **Ativo / Pausado / Próx. renovação / Finalizado**.
- Remover o `useMemo grupos` (linhas ~780-788) e simplificar `algumGrupoAberto` para considerar apenas `gruposPosts`.

### 1.2 Status de Posts vira a seção principal
- Manter os grupos dinâmicos vindos de `statusPostOptions` (Criar, Revisar, Agendado, Postado, Atrasado).
- Remover o subtítulo "Status de Posts" (linhas ~900-906) já que agora é o único agrupamento — não precisa de label divisor.
- Aumentar contraste do header de cada grupo:
  - Trocar `bg-muted/30` por `bg-muted/60` + `border-l-4` colorida com `style={{ borderLeftColor: status.cor }}`.
  - Aumentar fonte do badge (`text-sm` em vez de `text-xs`) e do contador, exibindo-o em formato destacado: `<span className="ml-2 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tabular-nums">{items.length}</span>`.
  - Padding `py-2` em vez de `py-1`.

### 1.3 Adicionar filtro por Status do Cliente no topo
- Novo estado `const [filtroStatusCliente, setFiltroStatusCliente] = useState<string>("todos");`
- Adicionar componente `<Select>` no bloco de `FiltrosTopo` (ou ao lado dele dentro do header), populado a partir de `statusOptions` + opção "Todos".
- Aplicar no `filtrados` useMemo: `.filter((c) => filtroStatusCliente === "todos" || c.status_cliente === filtroStatusCliente)`.

### 1.4 Status do Cliente como badge ao lado do nome
- Na célula da coluna `nome_cliente` (linhas ~885-888), envolver em flex e adicionar badge pequeno após o link:
  ```tsx
  <div className="flex items-center gap-1.5 min-w-0">
    <Link to={`/clientes/${cliente.id}`} className="text-primary text-xs font-medium hover:underline truncate">
      {cliente.nome_cliente}
    </Link>
    {(() => {
      const opt = statusOptions.find(s => s.label === cliente.status_cliente);
      return opt ? (
        <span
          className="shrink-0 inline-flex items-center h-4 px-1.5 rounded text-[9px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: `${opt.cor}22`, color: opt.cor }}
          title={`Status do cliente: ${opt.label}`}
        >
          {opt.label}
        </span>
      ) : null;
    })()}
  </div>
  ```

### 1.5 Resumo de posts por cliente (na linha do cliente)
- Hoje a coluna `posts` já mostra `X/Y postados`. Vamos enriquecer dentro de `CelulaValor` (case `col.key === "posts"`):
  - Calcular `atrasados = cardsCliente.filter(c => c.status_card === "Atrasado").length`.
  - Render:
    ```tsx
    <div className="flex flex-col leading-tight tabular-nums">
      <span className="text-xs font-medium">{postados}/{total} posts</span>
      {atrasados > 0 && (
        <span className="text-[11px] text-destructive font-semibold flex items-center gap-1">
          ⚠ {atrasados} atrasado{atrasados>1?"s":""}
        </span>
      )}
    </div>
    ```
- Não criar coluna nova — apenas melhorar a célula existente. Caso a coluna `posts` esteja oculta, a info ainda fica visível via grupo "Atrasado".

### 1.6 Hierarquia visual (ajustes finos)
- Linhas dos clientes ganham `font-medium` no nome e `text-muted-foreground` levemente mais discreto nas demais colunas (manter atual — já está bom).
- Header do grupo de Status de Posts vira o ponto focal (item 1.2).

---

## 2. `src/pages/Alertas.tsx` + `src/store/crm.ts` — novas regras de alerta

### 2.1 Ampliar `TipoAlerta`
- Em `src/store/crm.ts` (linha 9), expandir a union:
  ```ts
  export type TipoAlerta =
    | "Renovacao"           // ≤ 7 dias para data_fim_contrato
    | "Posts_Pendentes"     // legado já existente
    | "Contrato_Finalizando"// legado
    | "Cliente_Pausado"     // novo
    | "Sem_Posts_Ativos"    // novo: 0 cards com status ≠ Postado/Atrasado
    | "Posts_Atrasados";    // novo: cliente tem ≥1 card "Atrasado"
  ```
- Atualizar mapa de cor em `src/pages/Alertas.tsx` (`tipoCor`) com novas chaves (cinza para Pausado, vermelho para Posts_Atrasados, âmbar para Sem_Posts).

### 2.2 Geração derivada (client-side, sem migração)
- Em `Alertas.tsx`, **derivar alertas em tempo real** a partir do estado do CRM em vez de depender exclusivamente da tabela `alertas`:
  ```ts
  const alertasDerivados = useMemo(() => {
    const out: Alerta[] = [];
    const hoje = new Date();
    clientes.forEach((c) => {
      // 1. Renovação ≤ 7 dias
      if (c.data_fim_contrato) {
        const fim = new Date(c.data_fim_contrato);
        const dias = (fim.getTime() - hoje.getTime()) / 86400000;
        if (dias >= 0 && dias <= 7) push("Renovacao", c, `Renovação em ${Math.ceil(dias)} dia(s)`);
      }
      // 2. Pausado
      if (c.status_cliente === "Pausado") push("Cliente_Pausado", c, "Cliente em pausa");
      // 3. Sem posts ativos
      const ativos = cards.filter(k => k.cliente_id === c.id && k.status_card !== "Postado");
      if (ativos.length === 0) push("Sem_Posts_Ativos", c, "Sem posts em andamento");
      // 4. Posts atrasados
      const atrasados = cards.filter(k => k.cliente_id === c.id && k.status_card === "Atrasado");
      if (atrasados.length > 0) push("Posts_Atrasados", c, `${atrasados.length} post(s) atrasado(s)`);
    });
    return out;
  }, [clientes, cards]);
  ```
- Combinar `alertasDerivados` com `alertas` persistidos (resolvidos vão para a aba histórico via tabela real). Para resolver um alerta derivado, criar entrada em `alertas` com status `Resolvido` (reaproveita `resolverAlerta` existente / usar `addAlerta` se necessário).
- **Sem mudança de schema** nessa primeira iteração — alertas derivados são efêmeros e recomputados; persistimos apenas quando o usuário clica "Resolver" (insert direto via `supabase.from('alertas').insert({...})`).

### 2.3 (Opcional, fora do MVP) Cron para snapshot
- Não incluído nesta etapa para manter a entrega focada. Os alertas vão funcionar puramente pelo cálculo client-side em cima de `clientes` + `cards`.

---

## 3. Arquivos tocados (resumo)

| Arquivo | Mudanças |
|---|---|
| `src/pages/Clientes.tsx` | Remover grupos por status do cliente; promover Status de Posts; novo filtro topo; badge de status ao lado do nome; resumo de atrasados na célula `posts`. |
| `src/pages/Alertas.tsx` | Adicionar derivação de 4 regras; expandir `tipoCor`; permitir resolver alertas derivados (insert em `alertas`). |
| `src/store/crm.ts` | Expandir `TipoAlerta` com 3 novos valores. |

Nenhuma migração de banco é necessária — todas as colunas já existem (`status_cliente`, `data_fim_contrato`, `cards.status`).

---

## 4. Resultado visual esperado

```
┌──────────────────────────────────────────────────────────┐
│ Clientes                  [Status: Todos ▾] [Filtros] [+]│
├──────────────────────────────────────────────────────────┤
│ ▼ █ CRIAR  ⓷                                             │
│   Cliente A  [ATIVO]   ...   2/12 posts                  │
│   Cliente B  [PAUSADO] ...   0/8 posts ⚠ 1 atrasado      │
│ ▼ █ REVISAR ⓵                                             │
│   Cliente C  [ATIVO]   ...   5/12 posts                  │
│ ▶ █ AGENDADO ⓸                                            │
│ ▶ █ POSTADO  ⓻                                            │
│ ▼ █ ATRASADO ⓶                                            │
│   ...                                                    │
└──────────────────────────────────────────────────────────┘
```

Pronto para implementar assim que aprovado.
