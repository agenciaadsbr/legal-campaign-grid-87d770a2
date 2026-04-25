## Remover coluna "Status Cliente" da grade

**`src/store/crm.ts`**:
- Remover entrada `status_cliente` do array `colunasPadrao`.
- Reindexar `ordem` das colunas seguintes (periodo_contrato → 4, posts → 5, etc.).
- Incrementar versão do persist (ou usar migration) para invalidar localStorage antigo e recarregar `colunasPadrao` para usuários existentes.

**Preservado**:
- Agrupamento colapsável por status no `src/pages/Clientes.tsx` (continua usando `cliente.status_cliente` para categorizar).
- Campo `status_cliente` continua disponível em "Novo Cliente", `ClienteDetalhe` e no painel ⚙ Configurações (Status do Cliente).