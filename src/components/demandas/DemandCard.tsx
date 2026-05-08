import { Demanda, getResponsaveisIds, useDemandas } from "@/store/demandas";
import {
  PRIORIDADE_COR,
  PRIORIDADE_LABEL,
  STATUS_DEMANDA_COR,
  STATUS_DEMANDA_LABEL,
  CATEGORIA_LABEL,
} from "@/lib/demandas-categorias";
import { isAguardandoDependencia, getFilhas } from "@/lib/workflow";
import { useCRM } from "@/store/crm";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertTriangle, Lock, Link2 } from "lucide-react";
import { AvatarStack } from "@/components/AvatarStack";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Props {
  demanda: Demanda;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  extraAction?: React.ReactNode;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function DemandCard({
  demanda,
  onClick,
  draggable,
  onDragStart,
  extraAction,
  selectionMode,
  selected,
  onToggleSelect,
}: Props) {
  const { clientes, responsaveis } = useCRM();
  const cliente = clientes.find((c) => c.id === demanda.cliente_id);
  const respIds = getResponsaveisIds(demanda);
  const resps = responsaveis.filter((r) => respIds.includes(r.id));

  const dataLimite = demanda.data_limite ? new Date(demanda.data_limite) : null;
  const atrasada = demanda.status === "Atrasado";
  const urgente = demanda.prioridade === "Urgente";

  const handleClick = () => {
    if (selectionMode) {
      onToggleSelect?.();
    } else {
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      draggable={draggable && !selectionMode}
      onDragStart={onDragStart}
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer space-y-2 relative",
        atrasada && "border-destructive/50",
        urgente && !atrasada && "border-status-renovacao/60",
        selectionMode && selected && "ring-2 ring-primary border-primary",
      )}
    >
      {selectionMode && (
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
        >
          <Checkbox checked={!!selected} className="bg-background" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className={cn("text-sm font-semibold leading-tight line-clamp-2 flex-1", selectionMode && "pr-7")}>
          {demanda.titulo}
        </div>
        {urgente && !selectionMode && (
          <Badge
            className="text-[10px] px-1.5 py-0 h-5 shrink-0"
            style={{ background: PRIORIDADE_COR.Urgente, color: "white" }}
          >
            <AlertTriangle className="h-3 w-3 mr-0.5" />
            URGENTE
          </Badge>
        )}
      </div>

      <div className="text-xs text-muted-foreground truncate">
        {cliente?.nome_cliente ?? "—"}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-5 font-normal"
        >
          {CATEGORIA_LABEL[demanda.categoria]}
        </Badge>
        {demanda.subtipo && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 font-normal"
          >
            {demanda.subtipo}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t">
        <div className="flex items-center gap-1.5">
          {resps.length > 0 ? (
            <AvatarStack responsaveis={resps} size="sm" max={3} />
          ) : (
            <span className="text-[10px] text-muted-foreground">Sem responsável</span>
          )}
        </div>

        {dataLimite && (
          <div
            className={cn(
              "flex items-center gap-1 text-[11px]",
              atrasada ? "text-destructive font-medium" : "text-muted-foreground"
            )}
          >
            <Calendar className="h-3 w-3" />
            {dataLimite.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: STATUS_DEMANDA_COR[demanda.status] }}
        />
        <span className="text-[10px] text-muted-foreground">
          {STATUS_DEMANDA_LABEL[demanda.status]} · {PRIORIDADE_LABEL[demanda.prioridade]}
        </span>
      </div>

      {extraAction && (
        <div onClick={(e) => e.stopPropagation()} className="pt-1">
          {extraAction}
        </div>
      )}
    </div>
  );
}
