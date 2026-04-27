## Problema

Na página **Demandas**, o filtro "Responsáveis" funciona de forma inconsistente: alguns responsáveis filtram corretamente, outros não retornam nada — mesmo havendo clientes claramente atribuídos a eles (ex.: avatares verdes "R" visíveis na aba Clientes).

## Causa raiz

O filtro de responsável em duas abas só olha para `d.responsavel_id` (campo singular da demanda):

1. **`src/pages/Demandas.tsx`** (linha 67) — usado para Quadro Geral, Minhas, Novas, Calendário.
2. **`src/components/demandas/ClientesDemandasTable.tsx`** (linhas 47–52) — usado na aba **Clientes** (a da captura de tela).

Porém os responsáveis exibidos na coluna "Responsáveis" da aba Clientes vêm do **cliente** (`cliente.responsaveis[]` — array), não das demandas. Resultado:

- Responsáveis que possuem ao menos UMA demanda atribuída → aparecem ao filtrar.
- Responsáveis que estão atribuídos APENAS ao cliente (sem nenhuma demanda individual) → não aparecem ao filtrar, mesmo com o badge verde visível.

Isso bate exatamente com o sintoma "filtra alguns e outros não".

## Correção (escopo mínimo, somente módulo Demandas)

### 1) `src/components/demandas/ClientesDemandasTable.tsx` (aba Clientes)

Alterar a lógica do filtro para casar contra a união:
- Responsáveis das demandas do cliente, OU
- `cliente.responsaveis[]` (array do próprio cliente).

Pseudo:
```ts
if (filtroResp !== "todos") {
  const clienteTemRespNoCard = (c.responsaveis ?? []).includes(filtroResp);
  const clienteTemDemandaComResp = demandas.some(
    d => d.cliente_id === c.id && d.responsavel_id === filtroResp
  );
  if (!clienteTemRespNoCard && !clienteTemDemandaComResp) return; // pula cliente
}
```

A filtragem de demandas (para contar `total/atrasadas/urgentes`) continua por `d.responsavel_id === filtroResp` quando esse filtro está ativo, mas a linha do cliente passa a ser exibida sempre que ele tiver o responsável atribuído (mesmo com `total=0`).

### 2) `src/pages/Demandas.tsx` (demais abas: Quadro, Minhas, Novas, Calendário)

Manter o filtro atual por `d.responsavel_id`, mas adicionar fallback considerando responsáveis do cliente, para coerência:

```ts
if (fResp !== "todos") {
  const cli = clientes.find(c => c.id === d.cliente_id);
  const matchDemanda = d.responsavel_id === fResp;
  const matchCliente = (cli?.responsaveis ?? []).includes(fResp);
  if (!matchDemanda && !matchCliente) return false;
}
```

## Fora de escopo

- Nenhuma alteração em Clientes, Posts/Kanban, Alertas, Relatórios, Configurações, Contratos, ProjetoCliente.
- Sem mudanças no schema/Supabase.
- Sem alterações de UI/labels.

## Arquivos editados

- `src/components/demandas/ClientesDemandasTable.tsx`
- `src/pages/Demandas.tsx`
