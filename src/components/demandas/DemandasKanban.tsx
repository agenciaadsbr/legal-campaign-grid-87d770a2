import { Demanda, useDemandas } from "@/store/demandas";
import {
  STATUS_DEMANDA,
  STATUS_DEMANDA_LABEL,
  STATUS_DEMANDA_COR,
  DemandaStatus,
} from "@/lib/demandas-categorias";
import { DemandCard } from "./DemandCard";
import { useState } from "react";

interface Props {
  demandas: Demanda[];
  onOpen: (d: Demanda) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export function DemandasKanban({ demandas, onOpen, selectionMode, selectedIds, onToggleSelect }: Props) {
  const moveStatus = useDemandas((s) => s.moveStatus);
  const [dragOver, setDragOver] = useState<DemandaStatus | null>(null);

  return (
    <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-3">
      {STATUS_DEMANDA.map((status) => {
        const items = demandas.filter((d) => d.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/demanda");
              if (id) moveStatus(id, status);
              setDragOver(null);
            }}
            className={`rounded-lg bg-muted/30 p-2 min-h-[400px] transition-colors ${
              dragOver === status ? "bg-muted/60" : ""
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2 px-1">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: STATUS_DEMANDA_COR[status] }}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-center whitespace-nowrap">
                {STATUS_DEMANDA_LABEL[status]}
              </span>
              <span className="text-[10px] text-muted-foreground bg-background rounded px-1.5 py-0.5 shrink-0">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((d) => (
                <DemandCard
                  key={d.id}
                  demanda={d}
                  onClick={() => onOpen(d)}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/demanda", d.id)}
                />
              ))}
              {items.length === 0 && (
                <div className="text-[11px] text-muted-foreground text-center py-6">
                  vazio
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
