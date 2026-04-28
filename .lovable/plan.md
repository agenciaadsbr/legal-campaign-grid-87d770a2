## Correção

O botão **"Voltar para Visão Geral"** no detalhe do Post está enviando para a aba "Visão Geral" do hub. O correto é voltar para o **Kanban da aba de origem** (no caso do print, aba **Posts**).

No `DemandaDetalheDialog` (modal de Vídeos, Tráfego, LP, IA, Briefing, Planejamento) já está correto: o botão só fecha o modal e o usuário continua exatamente na aba que estava.

O problema é só no `PostDetalhe`, que é uma página em rota separada (`/posts/:postId`) — ao voltar, ela cai no estado padrão do hub (`tab="visao"`).

## Mudanças

### 1. `src/pages/PostDetalhe.tsx`
Trocar a navegação do botão Voltar para incluir a aba de destino na URL:

```ts
navigate(`/clientes/${card.cliente_id}?tab=posts`);
```

### 2. `src/pages/ProjetoCliente.tsx`
Fazer a página respeitar o parâmetro `?tab=` da URL ao montar e manter a URL sincronizada quando o usuário troca de aba:

- Ler `searchParams.get("tab")` para inicializar o estado `tab` (fallback `"visao"`).
- No `onValueChange` das Tabs, atualizar a URL com `setSearchParams` (replace, sem empilhar histórico).
- Se a aba for `"visao"`, remover o parâmetro para manter URL limpa.

## Resultado

- Abrir um Post pela aba **Posts** → clicar **Voltar** → retorna direto ao Kanban de Posts (não mais à Visão Geral).
- Abrir um card de Vídeo/Tráfego/etc. (modal) → clicar **Voltar** → fecha o modal e mantém a aba ativa (já funcionava).
- Compartilhar/recarregar a URL `/clientes/:id?tab=trafego` agora abre direto na aba Tráfego Pago — bônus útil.

## Detalhes técnicos

- Sem mudanças no banco, no `DemandaDetalheDialog` ou no `VoltarVisaoGeralButton`.
- Sem efeitos colaterais nas demais abas — comportamento atual preservado quando não há `?tab=`.
