## Diagnóstico

O erro "The object exceeded the maximum allowed size" exibido no toast é retornado pelo próprio Supabase Storage **antes** de gravar o arquivo. Verifiquei o bucket `anexos` no banco:

- `file_size_limit = NULL` → cai no limite **global** do projeto Supabase, que é de 50 MB por arquivo no plano padrão.
- O vídeo `DEMISSÃO JUGEND.mp4` que o usuário tentou enviar passa desse limite, então o upload é rejeitado e nada é salvo.

Não é bug de policy nem de código no front — o front está correto, mas o bucket precisa aceitar arquivos maiores.

## Correção

### 1. Migration: aumentar `file_size_limit` do bucket `anexos`

Subir o limite por arquivo do bucket para **5 GB** (5368709120 bytes), que é o teto máximo suportado pelo Supabase Storage. Isso cobre vídeos longos em alta resolução sem reaparecer esse erro.

```sql
update storage.buckets
   set file_size_limit = 5368709120  -- 5 GB
 where id = 'anexos';
```

### 2. `DemandaDetalheDialog.tsx` — melhorar UX de erro e progresso

- Adicionar uma checagem client-side antes do upload: se `file.size > 5 GB`, mostrar toast claro ("Arquivo maior que 5 GB não é suportado") e pular esse arquivo, em vez de tentar e falhar feio.
- Quando o erro do `supabase.storage.upload` contiver "exceeded the maximum allowed size" ou "Payload too large", traduzir para uma mensagem em PT clara informando o tamanho do arquivo e o limite.
- Manter o estado de "Enviando..." que já existe; não precisa adicionar barra de progresso real agora (o SDK do supabase-js v2 ainda não expõe progresso de upload de forma estável). Posso fazer numa próxima iteração se o usuário quiser.

### Fora do escopo

- Aumentar o limite global do projeto Supabase: não é necessário, o `file_size_limit` por bucket sobrepõe o global para cima até o teto do plano.
- Mudar para upload resumível (TUS): só vale a pena para arquivos > 1 GB com conexões instáveis; podemos atacar depois se aparecer necessidade.
- Migrar anexos antigos em base64: continua fora do escopo.

## Observação importante para o usuário

O teto de 5 GB **por arquivo** depende também do plano do projeto Supabase. No plano Free o limite efetivo costuma ser menor (até ~50 MB por arquivo, mesmo configurando o bucket para mais). Se mesmo após esta correção o erro voltar para vídeos grandes, vai ser necessário **upgrade do plano do Supabase** (Pro ou superior) para liberar uploads de até 5 GB.
