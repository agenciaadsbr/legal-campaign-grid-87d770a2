import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Campo na header global para colar link de tarefa e abrir internamente.
 * Resolve a restrição de acesso de URLs de preview do Lovable.
 */
export function AbrirTarefaPorLinkInput() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  // Atalho Ctrl+K / Cmd+K para focar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function tentarAbrir(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    let pathname = "";
    let search = "";
    try {
      // Tolera URL absoluta ou path relativo
      const url = new URL(trimmed, window.location.origin);
      pathname = url.pathname;
      search = url.search;
    } catch {
      toast.error("Link inválido");
      return;
    }

    // Match /clientes/:clienteId(/projeto)?
    const m = /^\/clientes\/([^/]+)(?:\/projeto)?\/?$/.exec(pathname);
    if (!m) {
      toast.error("Link de tarefa inválido");
      return;
    }
    const clienteId = m[1];
    const params = new URLSearchParams(search);
    const tab = params.get("tab") ?? "visao";
    const demandaId = params.get("demanda");

    const destino = demandaId
      ? `/clientes/${clienteId}/projeto?tab=${encodeURIComponent(tab)}&demanda=${encodeURIComponent(demandaId)}`
      : `/clientes/${clienteId}/projeto?tab=${encodeURIComponent(tab)}`;

    navigate(destino);
    setValue("");
    inputRef.current?.blur();
    toast.success(demandaId ? "Abrindo tarefa..." : "Abrindo projeto do cliente...");
  }

  return (
    <div
      className={cn(
        "relative flex items-center w-full max-w-md",
        "h-9 rounded-md border border-border bg-muted/40",
        "focus-within:border-primary/50 focus-within:bg-muted/60 transition-colors",
      )}
    >
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData("text");
          if (pasted) {
            e.preventDefault();
            setValue(pasted);
            tentarAbrir(pasted);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            tentarAbrir(value);
          } else if (e.key === "Escape") {
            setValue("");
            inputRef.current?.blur();
          }
        }}
        placeholder="Colar link da tarefa..."
        aria-label="Colar link da tarefa"
        className={cn(
          "w-full h-full bg-transparent border-0 outline-none",
          "pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground",
        )}
      />
      <kbd
        className={cn(
          "absolute right-2 hidden sm:inline-flex items-center gap-0.5",
          "h-5 px-1.5 rounded border border-border bg-background/60",
          "text-[10px] font-medium text-muted-foreground pointer-events-none",
        )}
      >
        Ctrl K
      </kbd>
    </div>
  );
}
