## Diagnóstico

A screenshot do **robsonlobato31@gmail.com** mostra a versão **antiga** do app:
- Sidebar **sem** o item "Demandas"
- Dashboard **sem** a seção "Demandas Operacionais"
- Dados de exemplo antigos (Ana, Bruno, Carla, Diego)

Já o admin (`agenciaadsbr@gmail.com`) vê a versão nova, com Demandas e dados reais. Isso confirma que **o código está correto** (verifiquei `AppSidebar.tsx` — "Demandas" está fixo no menu, sem filtro por role) e que **a publicação está ativa** (`legal-campaign-grid.lovable.app`, visibilidade pública).

### Causa raiz

O problema é **bundle JavaScript antigo cacheado** no navegador do Robson. As meta tags `Cache-Control` no `index.html` só evitam cache do HTML, mas **não obrigam recarga quando um novo bundle é publicado** enquanto a aba já está aberta. Como o Robson provavelmente deixou a aba aberta antes de novos deploys, o app continua executando JS antigo.

Hard refresh resolve pontualmente, mas precisamos de uma **solução definitiva** que detecte novas versões em runtime e atualize automaticamente.

---

## Plano de correção

### 1. Sistema de auto-update em runtime (definitivo)

Implementar um detector de versão que faz o app se atualizar sozinho quando há deploy novo, sem o usuário precisar fazer hard refresh.

**Como vai funcionar:**

- Gerar uma constante `APP_VERSION` em build (timestamp do build, injetado via `define` no `vite.config.ts`).
- Criar arquivo estático `public/version.json` com o mesmo timestamp, gerado no build.
- Hook novo `useVersionCheck` em `src/hooks/useVersionCheck.tsx`:
  - A cada 60 segundos faz `fetch('/version.json?t=' + Date.now())`.
  - Se a versão remota for diferente da `APP_VERSION` em memória → mostra toast "Nova versão disponível" com botão **"Atualizar agora"** que executa `window.location.reload()`.
  - Também checa quando a aba volta a ficar visível (`visibilitychange`).
- Plugar o hook em `src/App.tsx` (uma vez, dentro do provider raiz).

### 2. Cache busting forte no HTML

- Adicionar `<meta http-equiv="Cache-Control" content="no-store">` reforçado e remover qualquer service worker remanescente.
- Garantir que `index.html` nunca seja cacheado (já está configurado, mas vou validar headers).
- Vite já adiciona hash nos bundles JS/CSS, então o `index.html` novo aponta para arquivos com nome novo automaticamente.

### 3. Garantir que "Demandas" carregue mesmo se o store falhar

Reforço defensivo em `src/components/AppSidebar.tsx`: o item "Demandas" continua fixo (já está) e adicionar log de versão no console para diagnóstico futuro:
```ts
console.log('[CRM] App version:', APP_VERSION);
```

### 4. Republicar o app

Após implementar, **republicar** para que o `legal-campaign-grid.lovable.app` sirva o novo bundle com o sistema de auto-update embutido. A partir desse deploy, **todos os usuários** (incluindo o Robson) recebem updates automáticos sem hard refresh.

### 5. Ação imediata para o Robson (uma única vez)

Para sair do bundle antigo agora, o Robson precisa fazer **uma vez**:
- `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac), **ou**
- Abrir em aba anônima e logar.

Depois desse refresh único, ele vai carregar o bundle novo com o auto-update, e nunca mais vai ficar travado em versão antiga.

---

## Arquivos que serão alterados/criados

- `vite.config.ts` — injetar `__APP_VERSION__` via `define`, plugin para gerar `public/version.json` no build.
- `src/hooks/useVersionCheck.tsx` — **novo**, lógica de polling + toast.
- `src/App.tsx` — invocar `useVersionCheck()` no nível raiz.
- `src/vite-env.d.ts` — declarar `__APP_VERSION__` global.
- `index.html` — reforçar `no-store`.
- `src/components/AppSidebar.tsx` — log de versão (diagnóstico).

## Resultado esperado

- Próximo deploy: todos os usuários autenticados recebem em até 60s um toast "Nova versão disponível — Atualizar agora", e ao clicar a página recarrega no bundle novo.
- Robson, após o hard refresh único, passa a ver "Demandas" no menu, "Demandas Operacionais" no Dashboard, e todas as próximas atualizações automaticamente.
- Não mexe em layout, dados, RLS ou roles — é só infraestrutura de versão.
