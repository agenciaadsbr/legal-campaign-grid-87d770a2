import { useState } from "react";
import { Responsavel } from "@/store/crm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModoAtribuicao = "substituir" | "adicionar";

interface Props {
  responsaveis: Responsavel[];
  count: number;
  onApply: (ids: string[], modo: ModoAtribuicao) => Promise<void> | void;
  disabled?: boolean;
}

export function AtribuirResponsaveisPopover({
  responsaveis,
  count,
  onApply,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [modo, setModo] = useState<ModoAtribuicao>("substituir");
  const [aplicando, setAplicando] = useState(false);

  const toggle = (id: string) =>
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const aplicar = async () => {
    if (selecionados.length === 0 || count === 0) return;
    setAplicando(true);
    try {
      await onApply(selecionados, modo);
      setSelecionados([]);
      setOpen(false);
    } finally {
      setAplicando(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="default"
          className="h-8"
          disabled={disabled || count === 0}
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Atribuir responsáveis
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold mb-1.5">Modo</div>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-0.5">
              <button
                type="button"
                onClick={() => setModo("substituir")}
                className={cn(
                  "text-xs py-1.5 rounded transition-colors",
                  modo === "substituir"
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Substituir
              </button>
              <button
                type="button"
                onClick={() => setModo("adicionar")}
                className={cn(
                  "text-xs py-1.5 rounded transition-colors",
                  modo === "adicionar"
                    ? "bg-background shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Adicionar
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
              {modo === "substituir"
                ? "Os responsáveis selecionados substituirão os atuais."
                : "Os selecionados serão somados aos responsáveis atuais."}
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold mb-1.5">Responsáveis</div>
            <div className="max-h-56 overflow-auto space-y-0.5 -mx-1 px-1">
              {responsaveis.map((r) => {
                const checked = selecionados.includes(r.id);
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => toggle(r.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
                      checked && "bg-accent",
                    )}
                  >
                    <Checkbox checked={checked} />
                    <div
                      className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0 overflow-hidden"
                      style={{ backgroundColor: r.avatar_url ? undefined : r.cor }}
                    >
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt={r.nome} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        r.nome
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                      )}
                    </div>
                    <span className="truncate">{r.nome}</span>
                  </button>
                );
              })}
              {responsaveis.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhum responsável disponível
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={aplicar}
            disabled={selecionados.length === 0 || count === 0 || aplicando}
            className="w-full h-8 text-xs"
            size="sm"
          >
            {aplicando ? "Aplicando..." : `Aplicar em ${count} ${count === 1 ? "tarefa" : "tarefas"}`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
