## Diagnóstico

Investiguei o problema e **não existe bug no código**. Veja o que verifiquei:

### 1. Banco de dados (Supabase)
O usuário `robsonlobato31@gmail.com` ("Lobato Teste") está:
- `ativo = true` ✅
- `role = editor` ✅

### 2. Código do menu (`src/components/AppSidebar.tsx`)
O item **"Demandas"** está hardcoded na lista `items` (linha 17), **sem nenhum filtro por role ou por usuário**. Ou seja, o menu deve aparecer para **todos** os usuários autenticados, inclusive editors.

```ts
const items = [
  { title: "Dashboard", url: "/", ... },
  { title: "Clientes", url: "/clientes", ... },
  { title: "Contratos", url: "/contratos", ... },
  { title: "Demandas", url: "/demandas", icon: ListChecks }, // <- já está aqui
  { title: "Alertas", url: "/alertas", ... },
  ...
];
```

### 3. Sem sistema de "menus visíveis por usuário"
Pesquisei em todo o projeto (`EquipeAcessosManager`, `Configuracoes`, etc.) e **não existe** controle granular de visibilidade de menus por usuário. Logo, nada está escondendo "Demandas" do Lobato.

### 4. Conclusão — Causa raiz
A screenshot enviada mostra o menu **sem "Demandas"**, mas o código atual claramente inclui o item. Isso só pode ser explicado por **cache do bundle JavaScript antigo no navegador do Lobato** (a versão anterior à criação do módulo Demandas).

O Vite já faz hash dos assets, mas o `index.html` pode estar sendo servido de cache pelo Service Worker do navegador / CDN edge cache, fazendo com que ele continue carregando a versão antiga do app.

---

## Plano de correção (incremental e seguro)

### Etapa 1 — Solução imediata (sem código)
Pedir ao Lobato para fazer **hard refresh** no navegador:
- **Windows/Linux:** `Ctrl + Shift + R` ou `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`
- Ou abrir em aba anônima para confirmar que é cache

### Etapa 2 — Garantir que o `index.html` nunca seja cacheado
Adicionar meta tags no `index.html` para evitar cache do shell HTML (os assets JS/CSS já têm hash, então só o `index.html` precisa desse cuidado):

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

Isso garante que, em deploys futuros, qualquer usuário receba o `index.html` mais recente (que aponta para os bundles JS novos com hash atualizado).

### Etapa 3 — Verificar Service Worker
Verificar se há algum Service Worker registrado em `public/` ou `index.html` que esteja servindo a versão antiga em cache. Se houver, ajustar a estratégia para `network-first` no `index.html`.

### Etapa 4 — Validação
1. Pedir ao Lobato para acessar novamente após o deploy.
2. Confirmar que "Demandas" aparece no menu lateral entre "Contratos" e "Alertas".
3. Confirmar acesso à rota `/demandas` (sem necessidade de role admin).

---

## O que NÃO será feito
- ❌ Nenhuma alteração em `AppSidebar.tsx` (já está correto).
- ❌ Nenhuma mudança nas roles do banco (`editor` já tem acesso).
- ❌ Nenhuma alteração no roteamento (`/demandas` em `App.tsx` já está dentro do `RequireAuth`, sem filtro de role).
- ❌ Nada destrutivo em módulos existentes.

## Observação
Se após o hard refresh o menu **ainda não aparecer** para o Lobato, será necessário investigar logs do console do navegador dele especificamente — mas pelo código atual, não há razão técnica para o item estar oculto.
