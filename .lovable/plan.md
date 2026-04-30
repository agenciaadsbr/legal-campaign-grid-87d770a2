## Objetivo

Remover a aba **Responsáveis** do Projeto Completo do cliente, pois ela exibe as mesmas informações (responsáveis por área com Total / Abertos / Atrasados) que já estão presentes na aba **Visão Geral**.

## Alterações em `src/pages/ProjetoCliente.tsx`

1. **Remover o `TabsTrigger` da aba** (linha 227):
   - Apagar `<TabsTrigger value="responsaveis" ...>Responsáveis</TabsTrigger>`.

2. **Remover o `TabsContent` da aba** (linhas 335–338):
   - Apagar o bloco `<TabsContent value="responsaveis">...<ResponsaveisTab .../></TabsContent>`.

3. **Limpar código órfão**:
   - Remover o componente interno `ResponsaveisTab` (definido a partir da linha 638) e seu array auxiliar `SECOES_RESPONSAVEIS` (linhas 627–636), já que não serão mais usados.
   - Remover imports que ficarem sem uso após a limpeza (verificar `Users` do lucide-react e quaisquer helpers usados apenas dentro de `ResponsaveisTab`).

4. **Fallback de rota de aba**:
   - Verificar se há lógica que define `responsaveis` como aba padrão ou que faz `setTab("responsaveis")`. Caso exista, redirecionar para `"visao"`.

5. **Bump de versão**: atualizar `public/version.json`.

## Validação

- A barra de abas continua rolável e mostra: Visão Geral, Posts, Vídeos, Tráfego Pago, LP/Site, IA/Atendimento, Urgências, Documentação, Briefing, Planejamento, Atividades, Relatórios.
- Visão Geral continua exibindo os cards de responsáveis por área (comportamento inalterado).
- Sem warnings de imports não utilizados.
