## Diagnóstico

A tela não está mais presa por falta de `finally`, mas ainda aparece `Carregando CRM...` porque o carregamento essencial do CRM depende de 10 queries Supabase em paralelo. Se qualquer uma delas fica pendurada por falha de rede/REST/Supabase, o `Promise.all` inteiro estoura o timeout e descarta também as queries que poderiam ter retornado dados.

Sinais confirmados:
- Console: `Timeout em carregamento essencial do CRM após 20000ms`.
- Network: várias chamadas `/rest/v1/...` com `Failed to fetch`.
- Supabase read query também falhou com `Connection terminated due to connection timeout`, indicando instabilidade/timeout na camada Supabase, não exclusão de dados.
- O overlay some após o timeout, mas os clientes podem ficar vazios porque o bloco essencial é tratado como tudo-ou-nada.

## Correção proposta

### 1. Tornar o carregamento essencial tolerante a falhas parciais
Arquivo: `src/store/crm.ts`

- Trocar o `Promise.all` essencial por um carregamento individual/seguro por tabela.
- Cada query terá timeout próprio curto, fallback para array vazio e `console.warn` específico.
- Se `clientes` responder mas `profiles`, `custom_fields` ou outra tabela falhar, a lista de clientes ainda será exibida.
- Se `clientes` falhar, o loading finaliza e a UI mostra estado vazio/toast, sem travar.

### 2. Evitar que reloads/realtime fiquem disparando loops durante instabilidade
Arquivo: `src/store/crm.ts`

- Ajustar `_scheduleReload()` para não iniciar novo carregamento enquanto `loading` ou `heavyDataLoading` estiverem ativos.
- Evitar múltiplas tentativas sobrepostas quando o Supabase está retornando `Failed to fetch`.

### 3. Garantir estado final consistente após falha
Arquivo: `src/store/crm.ts`

- Em qualquer falha essencial: `loading=false` sempre.
- Em qualquer falha pesada: `heavyDataLoading=false` sempre.
- Manter `loaded=true` para remover o overlay e impedir tela presa.
- Não alterar layout, textos, filtros, componentes, dados ou permissões.

### 4. Ajuste pequeno na condição do overlay se necessário
Arquivo: `src/pages/Clientes.tsx`

- Manter o visual igual.
- Apenas garantir que o overlay dependa do estado real de carregamento inicial, sem reaparecer indefinidamente por carga pesada com lista vazia após falha.

## O que não será feito

- Não remover funcionalidades.
- Não apagar registros.
- Não alterar RLS ou schema sem evidência direta.
- Não refatorar módulos inteiros.
- Não alterar layout/experiência visual.

## Como validar

1. Abrir `/clientes`.
2. Confirmar que `Carregando CRM...` finaliza mesmo se alguma query Supabase falhar.
3. Confirmar que clientes aparecem quando a query de `clientes` responde, mesmo que tabelas auxiliares falhem.
4. Confirmar que console mostra qual tabela falhou, sem loop infinito.
5. Confirmar que posts/dados pesados seguem carregando em segundo plano quando Supabase responde.

## Resposta final após implementação

Informarei:
- causa do problema;
- arquivos ajustados;
- queries/estados corrigidos;
- como o loading passa a finalizar sempre;
- se foi erro de Supabase/RLS/auth/query/useEffect;
- como testar.