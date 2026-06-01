import { useMemo } from "react";
import { useCRM } from "@/store/crm";
import { useDemandas } from "@/store/demandas";
import { useAtivacaoRegras } from "@/hooks/useAtivacaoRegras";
import {
  deriveEstrategias,
  estrategiasVisiveis,
  statusIcone,
  statusLabel,
  type EstrategiaItem,
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
  /** Mostrar inclusive os "não iniciados" (•). Default false → mais limpo. */
  mostrarTodos?: boolean;
  /** Tamanho: padrão "sm". "xs" para uso inline em tabelas densas. */
  size?: "xs" | "sm";
  className?: string;
}

function EstrategiaBadge({ item, size }: { item: EstrategiaItem; size: "xs" | "sm" }) {
  const icone = statusIcone(item.status);
  const dim = item.status === "nao_iniciado" ? "opacity-60" : "";
  const sizeClass =
    size === "xs"
      ? "h-4 px-1 text-[9px] gap-0.5"
      : "h-5 px-1.5 text-[10px] gap-1";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center rounded-md border font-semibold tabular-nums whitespace-nowrap leading-none",
              sizeClass,
              item.colorClass,
              dim,
            )}
          >
            <span>{item.label}</span>
            <span aria-hidden>{icone}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="font-medium">{item.ariaLabel}</div>
          <div className="text-muted-foreground">{statusLabel(item.status)}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function EstrategiasBadges({ clienteId, mostrarTodos = false, size = "sm", className }: Props) {
  const cliente = useCRM((s) => s.clientes.find((c) => c.id === clienteId));
  const cards = useCRM((s) => s.cards);
  const demandas = useDemandas((s) => s.demandas);
  const { regras } = useAtivacaoRegras();

  const itens = useMemo(() => {
    if (!cliente) return [];
    const all = deriveEstrategias(cliente, demandas, cards, regras);
    return mostrarTodos ? all : estrategiasVisiveis(all);
  }, [cliente, demandas, cards, regras, mostrarTodos]);

  if (!cliente || itens.length === 0) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }

  return (
    <div className={cn("flex flex-nowrap items-center gap-1 overflow-hidden", className)}>
      {itens.map((i) => (
        <EstrategiaBadge key={i.id} item={i} size={size} />
      ))}
    </div>
  );
}
