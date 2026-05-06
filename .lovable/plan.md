## Diagnóstico

O site publicado em `https://legal-campaign-grid.lovable.app` **já é público** (verificado via publish settings: `effective_publish_visibility: public`). Não há restrição no app nem no Lovable Cloud.

O motivo do "pedido para logar no Lovable" é que o link copiado vem do **preview do editor** (`id-preview--975e0162-...lovable.app`). URLs `id-preview--*.lovable.app` são protegidas pela própria plataforma Lovable e exigem login para acessar — isso não é controlável pelo app.

A solução é fazer o botão **Copiar link** sempre gerar a URL no domínio publicado (público), mesmo quando o usuário estiver navegando pelo preview.

## Mudança

Arquivo: `src/components/demandas/DemandaDetalheDialog.tsx`

Ajustar o handler `copiarLink` (linhas 240-241) para detectar quando o `window.location.hostname` é uma URL de preview do Lovable e, nesse caso, substituir pelo domínio publicado.

```ts
const PUBLISHED_ORIGIN = "https://legal-campaign-grid.lovable.app";
const isLovablePreview = /id-preview--.*\.lovable\.app$/.test(window.location.hostname);
const origin = isLovablePreview ? PUBLISHED_ORIGIN : window.location.origin;
const url = `${origin}/clientes/${demanda!.cliente_id}/projeto?tab=${categoriaParaAba(demanda!.categoria)}&demanda=${demanda!.id}`;
```

Comportamento resultante:
- Acessando pelo preview do editor → link copiado aponta para `legal-campaign-grid.lovable.app` (público, sem login Lovable).
- Acessando pelo domínio publicado ou um custom domain → mantém o `window.location.origin` atual.

## O que NÃO muda

- Nada no botão, layout ou autenticação do próprio app.
- Configuração de publish (já está pública).
- O acesso à tarefa continua exigindo login normal do Dash Tasks (Supabase auth) — isso é o login do app, não do Lovable.

## Observação

Se mais tarde você configurar um **custom domain** próprio (ex.: `app.suaempresa.com.br`), basta atualizar a constante `PUBLISHED_ORIGIN` para esse domínio.
