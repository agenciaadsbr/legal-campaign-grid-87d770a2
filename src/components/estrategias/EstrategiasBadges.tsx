import { useMemo } from "react";
import { useCRM } from "@/store/crm";
import {
  deriveEstrategias,
  badgesParaExibir,
  type BadgeVisual,
} from "@/lib/estrategiasAtivas";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  clienteId: string;
  /** Tamanho: padrão "sm". "xs" para uso inline em tabelas densas. */
  size?: "xs" | "sm";
  className?: string;
  /** @deprecated mantido por compatibilidade — ignorado. */
  mostrarTodos?: boolean;
}

function Badge({ item, size }: { item: BadgeVisual; size: "xs" | "sm" }) {
  const sizeClass =
    size === "xs"
      ? "h-[14px] px-1 text-[9px]"
      : "h-4 px-1.5 text-[10px]";

  const pendenteClass = item.pendente
    ? "opacity-70 border-dashed bg-transparent"
    : "";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center rounded border font-medium leading-none whitespace-nowrap",
              sizeClass,
              item.colorClass,
              pendenteClass,
            )}
          >
            {item.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="font-medium">{item.ariaLabel}</div>
          <div className="text-muted-foreground">
            {item.pendente ? "Pendente" : "Ativo"}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function EstrategiasBadges({ clienteId, size = "sm", className }: Props) {
  const cliente = useCRM((s) => s.clientes.find((c) => c.id === clienteId));

  const itens = useMemo(() => {
    if (!cliente) return [];
    return badgesParaExibir(deriveEstrategias(cliente));
  }, [cliente]);

  if (!cliente || itens.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {itens.map((i) => (
        <Badge key={i.key} item={i} size={size} />
      ))}
    </div>
  );
}
