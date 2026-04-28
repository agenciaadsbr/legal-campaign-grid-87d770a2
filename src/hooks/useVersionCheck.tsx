import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Detecta novas versões do app em runtime.
 * - Faz polling em /version.json a cada 60s.
 * - Também verifica quando a aba volta a ficar visível.
 * - Quando detecta versão diferente, mostra toast com botão "Atualizar agora"
 *   que limpa caches e recarrega a página.
 *
 * Garante que TODOS os usuários (incluindo os que ficam com a aba aberta
 * por dias) recebam o bundle novo automaticamente após cada deploy.
 */
export function useVersionCheck() {
  const currentVersion = useRef<string>(
    typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev"
  );
  const notifiedRef = useRef(false);

  useEffect(() => {
    console.log("[CRM] App version:", currentVersion.current);

    let cancelled = false;

    async function check() {
      if (notifiedRef.current || cancelled) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        const remote = String(data.version ?? "");
        if (!remote) return;
        if (remote !== currentVersion.current) {
          notifiedRef.current = true;
          console.log(
            "[CRM] Nova versão detectada:",
            remote,
            "atual:",
            currentVersion.current
          );
          const id = toast("Nova versão disponível", {
            description:
              "Atualize agora para ver as últimas funcionalidades.",
            duration: Infinity,
            action: {
              label: "Atualizar agora",
              onClick: async () => {
                console.log("[CRM] Atualizar agora clicado");
                try {
                  toast.dismiss(id);
                } catch {}
                try {
                  if ("caches" in window) {
                    const keys = await caches.keys();
                    await Promise.all(keys.map((k) => caches.delete(k)));
                  }
                } catch (e) {
                  console.warn("[CRM] cache clear falhou", e);
                }
                try {
                  if ("serviceWorker" in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(regs.map((r) => r.unregister()));
                  }
                } catch (e) {
                  console.warn("[CRM] sw unregister falhou", e);
                }
                try {
                  window.location.reload();
                } catch {
                  window.location.href = window.location.href;
                }
              },
            },
            cancel: {
              label: "Depois",
              onClick: () => {
                try {
                  toast.dismiss(id);
                } catch {}
                notifiedRef.current = false;
              },
            },
          });
        }
      } catch {
        // offline ou erro de rede — ignora silenciosamente
      }
    }

    // primeira verificação após 5s
    const initial = window.setTimeout(check, 5000);
    const interval = window.setInterval(check, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
