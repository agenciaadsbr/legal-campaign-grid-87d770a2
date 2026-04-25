## Botão "Copiar link de acesso" em Equipe & Acessos

### Arquivo
- Editar: `src/components/EquipeAcessosManager.tsx`

### Implementação
- Adicionar botão `variant="ghost" size="icon"` com ícone `Link2` (lucide-react) na coluna **Ações** da tabela, ao lado do botão "Editar"
- Envolver com `Tooltip` ("Copiar link de acesso")
- Handler `handleCopyLink(user)`:
  - Monta mensagem: saudação com nome + link `${window.location.origin}/auth` + e-mail do usuário + instrução sobre senha
  - Copia via `navigator.clipboard.writeText()`
  - Toast `sonner`: success ("Link de acesso copiado!") ou error em fallback

### Texto copiado
```
Olá, {nome}! Seu acesso ao CRM da Ads BR:

🔗 Link: {origin}/auth
📧 E-mail: {email}

Use a senha definida no momento do cadastro.
Recomendamos trocar a senha no primeiro acesso.
```

### Sem mudanças em
- Migrations, edge functions, dependências, outros arquivos