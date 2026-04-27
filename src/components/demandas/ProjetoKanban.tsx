import { useState } from "react";
import { Demanda, useDemandas } from "@/store/demandas";
import {
  STATUS_DEMANDA,
  STATUS_DEMANDA_LABEL,
  STATUS_DEMANDA_COR,
  DemandaStatus,
} from "@/lib/demandas-categorias";
import { DemandCard } from "./DemandCard";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface Props {
  demandas: Demanda[];
  onOpen: (d: Demanda) => void;
}

export function ProjetoKanban({ demandas, onOpen }: Props) {
  const moveStatus = useDemandas((s) => s.moveStatus);
  const updateDemanda = useDemandas((s) => s.updateDemanda);
  const [dragOver, setDragOver] = useState<DemandaStatus | null>(null);

  const iniciar = (e: React.MouseEvent, d: Demanda) => {
    e.preventDefault();
    e.stopPropagation();
    updateDemanda(d.id, {
      status: "Criar",
      data_inicio: new Date().toISOString(),
    });
  };

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
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: STATUS_DEMANDA_COR[status] }}
                />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {STATUS_DEMANDA_LABEL[status]}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground bg-background rounded px-1.5 py-0.5">
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
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/demanda", d.id)
                  }
                  extraAction={
                    status === "Planejamento" ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full h-7 text-xs"
                        onClick={(e) => iniciar(e, d)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Iniciar Demanda
                      </Button>
                    ) : null
                  }
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
