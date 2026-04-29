## Renomear sistema para "Dash Tasks"

### Contexto sobre o banco de dados
Verifiquei o schema do Supabase e **não existe nenhuma tabela ou coluna que armazene o nome do sistema** ("CRM Jurídico"). O nome aparece apenas como texto fixo no frontend (sidebar, título da aba do navegador, página de login, dashboard e metadados SEO). Portanto, **não há migração de banco a ser feita** — toda a alteração é em arquivos do código.

Se no futuro você quiser que o nome do sistema seja configurável dinamicamente (ex.: tabela `app_settings`), posso criar isso em uma etapa separada. Hoje não é necessário.

### Arquivos a alterar

1. **`index.html`** — atualizar título da aba, `meta description`, `meta author`, `og:title`, `twitter:title`, `og:description`, `twitter:description`:
   - Título: `Dash Tasks — Gestão de Tarefas e Conteúdo`
   - Author: `Dash Tasks`
   - Descrição: `Dash Tasks: gestão completa de clientes, demandas, Kanban, posts e alertas em um só lugar.`

2. **`src/components/AppSidebar.tsx`** (linha 51-52) — texto do header da sidebar:
   - `CRM Jurídico` → `Dash Tasks`
   - Subtítulo `Marketing & Conteúdo` → `Gestão de Tarefas` (mantendo o estilo)

3. **`src/pages/Auth.tsx`** (linha 45) — `CardTitle` da tela de login:
   - `CRM Jurídico` → `Dash Tasks`

4. **`src/pages/Dashboard.tsx`** (linha 79) — subtítulo:
   - `Visão geral do CRM Jurídico` → `Visão geral do Dash Tasks`

### O que NÃO será alterado (para evitar quebrar código)
- Identificadores técnicos internos como o store `useCRM`, `useCRMBootstrap` e o arquivo `src/store/crm.ts` — são nomes de variáveis/módulos sem impacto visual e renomeá-los exigiria refatoração ampla sem benefício para o usuário.
- A categoria `"CRM"` em `src/lib/demandas-categorias.ts` (linha 67) — é uma palavra-chave de busca de subtipo de demanda na categoria "Tecnologia", não se refere ao nome do sistema.
- A frase `"Seu acesso ao CRM da Ads BR"` em `EquipeAcessosManager.tsx` (mensagem de WhatsApp) — refere-se a uma marca externa diferente. **Pergunto abaixo se devo alterar.**

### Atualização de memória
Atualizarei `mem://index.md` para substituir a referência "CRM Jurídico" por "Dash Tasks".

### Pergunta antes de executar
A mensagem automática de boas-vindas via WhatsApp diz: _"Seu acesso ao CRM da Ads BR"_. Devo trocar para _"Seu acesso ao Dash Tasks"_? (Posso confirmar ao executar; se não responder, mantenho como está.)
