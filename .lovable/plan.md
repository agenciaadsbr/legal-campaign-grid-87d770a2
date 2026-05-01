## Quebrar título das colunas de alerta em duas linhas

Hoje as 3 colunas operacionais usam títulos longos em uma única linha (`whitespace-nowrap`), ocupando largura desnecessária:

- "Posts atrasados"
- "Tarefas atrasadas"
- "Tarefas urgentes"

A coluna "Onboarding" já é uma palavra só e não precisa quebrar.

### Mudança

Em `src/components/clientes/ClientesGeralTable.tsx` (linhas 294–297):

- Remover `whitespace-nowrap` dessas 3 colunas.
- Renderizar o título em **duas linhas** explicitamente, com a primeira palavra em cima e a segunda embaixo, mantendo `text-center` e tamanho de fonte atual:

```tsx
<TableHead className="text-center w-[90px]">
  <div className="leading-tight">
    <div>Posts</div>
    <div>atrasados</div>
  </div>
</TableHead>
<TableHead className="text-center w-[90px]">
  <div className="leading-tight">
    <div>Tarefas</div>
    <div>atrasadas</div>
  </div>
</TableHead>
<TableHead className="text-center w-[90px]">
  <div className="leading-tight">
    <div>Tarefas</div>
    <div>urgentes</div>
  </div>
</TableHead>
<TableHead className="text-center w-[110px]">Onboarding</TableHead>
```

- Largura fixa estreita (~90px) para apertar a tabela horizontalmente, já que o conteúdo das células é apenas um badge numérico pequeno.
- `leading-tight` para manter as duas linhas próximas e visualmente como um único rótulo.

### Resultado

As colunas de alerta ficam mais estreitas, sobra mais espaço para Cliente, Status e Último comentário, e os títulos continuam totalmente legíveis em duas linhas curtas.

Também atualizo `public/version.json` para refletir o deploy.