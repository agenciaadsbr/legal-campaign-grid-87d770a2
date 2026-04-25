## Fase 3 — Gestão de Usuários completa

### 1) Migration SQL
- `profiles`: adicionar `ativo boolean default true`, `cargo text`, `telefone text`
- Criar tabela `cargos` (id, label, created_at) com RLS read-auth / write-admin
- Seeds: "Social Media", "Designer", "Redator", "Gestor de Tráfego", "Atendimento", "Administrador"

### 2) Edge Function `admin-update-user`
- Valida caller é admin
- Atualiza: `nome`, `cargo`, `telefone`, `ativo`, `role`, `responsavel_id`
- `ativo=false` → `auth.admin.updateUserById` com `ban_duration: '876000h'`
- `ativo=true` → `ban_duration: 'none'`
- Bloqueia auto-desativação e auto-rebaixamento de admin

### 3) Sidebar
- Item "Configurações" (ícone `Settings`) visível a todos

### 4) `/configuracoes` em Tabs
- **Aparência** (existente)
- **Meu perfil** — usuário edita nome/cargo/telefone próprios (novo `MeuPerfil.tsx`)
- **Equipe & Acessos** (admin only) — versão expandida do `EquipeAcessosManager`:
  - Tabela com Avatar+Nome, Email, Cargo (Select + "Outro" texto livre), Papel (badge), Vínculo responsável, Status (Switch), Ações (Editar)
  - Dialog "Convidar" ampliado com cargo
  - Dialog "Editar usuário" completo
  - Filtro por papel + busca
  - Self-protection: campos desabilitados na própria conta
  - Sem botão excluir (só desativar — soft delete)

### 5) Bloqueio de inativos
- `useAuth` carrega `profile.ativo`; se `false` → `signOut()` + toast "Conta desativada"

### 6) Esconder ações para `viewer`
Usar `canWrite` para ocultar botões criar/editar/excluir em:
- `Clientes.tsx`, `ClienteDetalhe.tsx`, `PostDetalhe.tsx` (manter comentários), `Contratos.tsx`, `Alertas.tsx`

### Arquivos
**Criar:** migration, `admin-update-user/index.ts` + `deno.json`, `MeuPerfil.tsx`
**Editar:** `AppSidebar.tsx`, `Configuracoes.tsx`, `EquipeAcessosManager.tsx`, `useAuth.tsx`, páginas listadas acima
