## Diagnóstico

O usuário conseguiu entrar no app publicado, mas o item **Demandas** não aparece na sidebar. Pelo screenshot, a sidebar exibida está com a lista antiga:

```text
Dashboard
Clientes
Contratos
Alertas
Relatórios
Configurações
```

No código atual, `AppSidebar.tsx` já contém o item **Demandas**, então o problema mais provável é que a correção anterior ainda não esteja refletida de forma confiável no build publicado/cache do usuário ou que exista uma renderização/menu antigo sendo servido. Também vou reforçar a navegação para garantir que **Demandas** fique visível para todo usuário autenticado, sem depender de perfil/role.

## Plano de correção

1. **Reforçar a sidebar principal**
   - Manter **Demandas** no array fixo de navegação de `src/components/AppSidebar.tsx`.
   - Garantir que o item fique na ordem correta:
     ```text
     Dashboard
     Clientes
     Contratos
     Demandas
     Alertas
     Relatórios
     Configurações
     ```
   - Não aplicar nenhum filtro por role/permissão no item **Demandas**.

2. **Adicionar fallback de acesso direto ao módulo**
   - Incluir um atalho visível para **Demandas** também no topo/layout quando o usuário estiver autenticado, se necessário, para evitar que cache ou sidebar antiga bloqueie o acesso.
   - A rota `/demandas` continuará protegida apenas por login, não por role específica.

3. **Revisar autenticação sem bloqueio indevido**
   - Ajustar `useAuth.tsx` para separar melhor:
     - carregamento da sessão/login;
     - carregamento de roles/perfil.
   - O menu e as rotas básicas não devem depender de `roles` para aparecer.
   - Manter apenas a validação de usuário logado em `RequireAuth`.

4. **Verificar rotas do módulo Demandas**
   - Confirmar que continuam registradas:
     - `/demandas`
     - `/demandas/cliente/:clienteId`
   - Não alterar módulos de Clientes, Posts, Kanban atual ou cards existentes.

5. **Validação**
   - Rodar verificação de TypeScript/build.
   - Confirmar que, para usuário comum autenticado, o menu lateral mostra **Demandas** e o acesso direto a `/demandas` funciona.

## Arquivos previstos

- `src/components/AppSidebar.tsx`
- `src/hooks/useAuth.tsx` se necessário para remover dependência indireta de roles no carregamento
- `src/App.tsx` apenas para conferência/ajuste mínimo de rotas, se necessário

## Resultado esperado

Qualquer usuário criado no sistema e autenticado com login e senha conseguirá ver e acessar o módulo **Demandas**, sem bloqueio extra por role ou permissão.