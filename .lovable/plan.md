## Diagnóstico

O erro atual não é mais apenas o bucket de vídeos. Ao tentar salvar uma aula, o Supabase retorna:

`Could not find the table 'public.aulas' in the schema cache`

Confirmei que a tabela `public.aulas` não existe no banco atual. Por isso falha tanto com YouTube quanto com upload do computador: o vídeo até pode ter URL, mas o cadastro da aula não consegue ser salvo porque a tabela de persistência está ausente.

## Plano de correção

1. **Criar a tabela `public.aulas` no Supabase**
   - Campos compatíveis com o formulário e a tela atual:
     - `id`
     - `titulo`
     - `descricao`
     - `tipo_video` (`youtube`, `drive`, `upload`)
     - `video_url`
     - `categoria`
     - `ordem`
     - `thumbnail_url`
     - `anexo_url`
     - `anexo_nome`
     - `created_by`
     - `created_at`
     - `updated_at`
   - Criar trigger para atualizar `updated_at` automaticamente.
   - Criar índices para ordenação/listagem por categoria, ordem e data de criação.

2. **Adicionar RLS/políticas de acesso na tabela**
   - Leitura (`SELECT`): usuários autenticados podem visualizar aulas.
   - Criação/edição/exclusão (`INSERT`, `UPDATE`, `DELETE`): apenas usuários com permissão de escrita via `public.can_write(auth.uid())`, seguindo o padrão já usado no projeto.

3. **Ajustar o frontend para ficar mais robusto**
   - Validar URLs de YouTube antes de salvar, para evitar cadastro com link inválido.
   - Normalizar links do YouTube/Drive no player, incluindo URLs com parâmetros extras.
   - Melhorar mensagens de erro para diferenciar:
     - erro ao enviar arquivo;
     - erro ao salvar aula;
     - URL inválida.

4. **Atualizar os tipos Supabase do projeto**
   - Incluir a tabela `aulas` em `src/integrations/supabase/types.ts` para o app reconhecer a estrutura recém-criada.

## Resultado esperado

Depois da correção:

- Aulas com link do YouTube poderão ser salvas e reproduzidas.
- Aulas com vídeo enviado pelo computador poderão ser salvas e reproduzidas.
- A tela `/aulas` deixará de cair no erro de tabela ausente.
- O bucket `aulas-assets` já existente continuará sendo usado para vídeos, thumbnails e anexos.