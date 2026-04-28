# Corrigir toast "Nova versão disponível"

## Problema

O toast aparece corretamente, mas ao clicar em **"Atualizar agora"** nada acontece e a mensagem não some. Causa raiz identificada em `src/hooks/useVersionCheck.tsx`:

1. **Provider errado**: o `useVersionCheck` chama `toast(...)` do `sonner`, mas no `App.tsx` o `<Sonner />` está fora do `<BrowserRouter>` e renderizado, porém o hook é montado **antes** que o usuário esteja autenticado — ok, mas o problema real é o `action` em formato de objeto (`{ label, onClick }`). Esse formato funciona no sonner, porém quando o `onClick` é `async` e executa `window.location.reload()` depois de `await caches.delete(...)`, em alguns casos o toast permanece visível porque nunca é dispensado e o reload pode ser bloqueado se houver erro silencioso.

2. **Toast não é dispensado** mesmo quando o reload funciona, e se algum `await` (ex.: `caches.keys()` em ambiente sem suporte) lança, a função aborta antes do `reload()`.

3. **`duration: Infinity`** combinado com `notifiedRef.current = true` impede qualquer nova chance de fechar o toast manualmente — não há botão de "X" porque o sonner não mostra close por padrão.

## Correção

Atualizar `src/hooks/useVersionCheck.tsx`:

- Capturar o `id` retornado por `toast(...)` e chamar `toast.dismiss(id)` antes do reload, garantindo que a notificação suma imediatamente.
- Envolver toda a lógica de limpeza em `try/catch` individuais (cache API e service worker separados) para que uma falha não impeça o `reload()`.
- Forçar `window.location.reload()` em um `finally`, com fallback `window.location.href = window.location.href` caso reload seja bloqueado.
- Adicionar `cancel: { label: "Depois" }` para o usuário poder fechar manualmente se quiser adiar.
- Adicionar `console.log` no início do `onClick` para confirmar que o clique chega (diagnóstico).

### Trecho técnico

```ts
const id = toast("Nova versão disponível", {
  description: "Atualize agora para ver as últimas funcionalidades.",
  duration: Infinity,
  action: {
    label: "Atualizar agora",
    onClick: async () => {
      console.log("[CRM] Atualizar agora clicado");
      toast.dismiss(id);
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (e) { console.warn(e); }
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
      } catch (e) { console.warn(e); }
      window.location.reload();
    },
  },
  cancel: { label: "Depois", onClick: () => toast.dismiss(id) },
});
```

## Arquivos alterados

- `src/hooks/useVersionCheck.tsx` — único arquivo afetado.

## Resultado esperado

Ao clicar em "Atualizar agora", o toast desaparece imediatamente, caches/SW são limpos (best-effort) e a página recarrega buscando o bundle novo. Se o usuário quiser adiar, pode clicar em "Depois" para fechar.
