import { useState } from "react";
import { useCRM } from "@/store/crm";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { AvatarStack } from "@/components/AvatarStack";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  clienteId: string;
  ids: string[];
}

/**
 * Célula clicável de Responsáveis para tabelas de Clientes.
 * Abre popover com checkboxes para atribuir/remover responsáveis do CLIENTE.
 * Persiste imediatamente via updateCliente.
 */
export function CelulaResponsaveis({ clienteId, ids }: Props) {
  const { responsaveis, updateCliente } = useCRM();
  const [open, setOpen] = useState(false);
  const selecionados = responsaveis.filter((r) => ids.includes(r.id));

  const toggle = (rid: string) => {
    const next = ids.includes(rid) ? ids.filter((v) => v !== rid) : [...ids, rid];
    updateCliente(clienteId, { responsaveis: next });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="group relative w-full text-left rounded px-1 py-0.5 -mx-1 -my-0.5 hover:bg-accent transition-colors flex items-center gap-1 min-h-[24px]"
          title="Clique para adicionar/remover responsáveis"
        >
          {selecionados.length > 0 ? (
            <AvatarStack responsaveis={selecionados} size="xs" max={4} />
          ) : (
            <span className="text-muted-foreground text-[11px] opacity-60 group-hover:opacity-100">
              + atribuir
            </span>
          )}
          <Plus className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-2"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[11px] text-muted-foreground px-2 pb-1.5">Responsáveis</div>
        <div className="max-h-60 overflow-auto space-y-0.5">
          {responsaveis.map((r) => {
            const checked = ids.includes(r.id);
            return (
              <button
                type="button"
                key={r.id}
                onClick={() => toggle(r.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
                  checked && "bg-accent"
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
                    r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")
                  )}
                </div>
                <span className="truncate">{r.nome}</span>
              </button>
            );
          })}
          {responsaveis.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-3 text-center">
              Nenhum responsável cadastrado
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
