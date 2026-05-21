import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type PeriodoPreset =
  | "todos"
  | "hoje"
  | "esta_semana"
  | "prox_7"
  | "prox_14"
  | "prox_30"
  | "ult_7"
  | "ult_14"
  | "ult_30"
  | "mes_passado"
  | "custom";

export interface FiltroPeriodo {
  tipo: PeriodoPreset;
  inicio?: string;
  fim?: string;
}

const PERIODO_LABEL: Record<PeriodoPreset, string> = {
  todos: "Período",
  hoje: "Hoje",
  esta_semana: "Esta semana",
  prox_7: "Próximos 7 dias",
  prox_14: "Próximos 14 dias",
  prox_30: "Próximos 30 dias",
  ult_7: "Últimos 7 dias",
  ult_14: "Últimos 14 dias",
  ult_30: "Últimos 30 dias",
  mes_passado: "Mês passado",
  custom: "Personalizado",
};

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

export function resolveIntervaloPeriodo(
  filtro: FiltroPeriodo | undefined,
): { inicio: Date; fim: Date } | null {
  if (!filtro || filtro.tipo === "todos") return null;
  const hoje = startOfDay(new Date());
  switch (filtro.tipo) {
    case "hoje":
      return { inicio: hoje, fim: endOfDay(hoje) };
    case "esta_semana": {
      const dow = hoje.getDay();
      const diffSeg = dow === 0 ? -6 : 1 - dow;
      const inicio = addDays(hoje, diffSeg);
      return { inicio, fim: endOfDay(addDays(inicio, 6)) };
    }
    case "prox_7": return { inicio: hoje, fim: endOfDay(addDays(hoje, 7)) };
    case "prox_14": return { inicio: hoje, fim: endOfDay(addDays(hoje, 14)) };
    case "prox_30": return { inicio: hoje, fim: endOfDay(addDays(hoje, 30)) };
    case "ult_7": return { inicio: addDays(hoje, -7), fim: endOfDay(hoje) };
    case "ult_14": return { inicio: addDays(hoje, -14), fim: endOfDay(hoje) };
    case "ult_30": return { inicio: addDays(hoje, -30), fim: endOfDay(hoje) };
    case "mes_passado": {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fim = endOfDay(new Date(hoje.getFullYear(), hoje.getMonth(), 0));
      return { inicio, fim };
    }
    case "custom": {
      if (!filtro.inicio || !filtro.fim) return null;
      return {
        inicio: startOfDay(new Date(filtro.inicio)),
        fim: endOfDay(new Date(filtro.fim)),
      };
    }
    default:
      return null;
  }
}

export function FiltroPeriodoButton({
  value,
  onChange,
  size = "sm",
}: {
  value: FiltroPeriodo;
  onChange: (v: FiltroPeriodo) => void;
  size?: "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  const [customIni, setCustomIni] = useState<Date | undefined>(
    value.tipo === "custom" && value.inicio ? new Date(value.inicio) : undefined,
  );
  const [customFim, setCustomFim] = useState<Date | undefined>(
    value.tipo === "custom" && value.fim ? new Date(value.fim) : undefined,
  );

  const ativo = value.tipo !== "todos";
  const labelAtivo =
    value.tipo === "custom" && value.inicio && value.fim
      ? `${format(new Date(value.inicio), "dd/MM")} – ${format(new Date(value.fim), "dd/MM")}`
      : PERIODO_LABEL[value.tipo];

  const selecionar = (tipo: PeriodoPreset) => { onChange({ tipo }); setOpen(false); };

  const aplicarCustom = () => {
    if (!customIni || !customFim) { toast.error("Selecione data inicial e final"); return; }
    if (customFim < customIni) { toast.error("Data final deve ser posterior à inicial"); return; }
    onChange({
      tipo: "custom",
      inicio: customIni.toISOString().slice(0, 10),
      fim: customFim.toISOString().slice(0, 10),
    });
    setOpen(false);
  };

  const Item = ({ tipo, label }: { tipo: PeriodoPreset; label: string }) => {
    const checked = value.tipo === tipo;
    return (
      <button
        type="button"
        onClick={() => selecionar(tipo)}
        className={cn(
          "w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors",
          checked && "bg-accent font-medium text-foreground",
        )}
      >
        {label}
      </button>
    );
  };

  const btnHeight = size === "xs" ? "h-7" : "h-8";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className={cn("gap-1.5 relative", btnHeight)}>
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="text-xs">{ativo ? labelAtivo : "Período"}</span>
          {ativo && (
            <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
              1
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 pb-1 font-semibold">
              📅 Futuro · planejamento
            </div>
            <div className="space-y-0.5">
              <Item tipo="hoje" label="Hoje" />
              <Item tipo="esta_semana" label="Esta semana" />
              <Item tipo="prox_7" label="Próximos 7 dias" />
              <Item tipo="prox_14" label="Próximos 14 dias" />
              <Item tipo="prox_30" label="Próximos 30 dias" />
            </div>
          </div>
          <div className="border-t pt-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 pb-1 font-semibold">
              📊 Passado · análise
            </div>
            <div className="space-y-0.5">
              <Item tipo="ult_7" label="Últimos 7 dias" />
              <Item tipo="ult_14" label="Últimos 14 dias" />
              <Item tipo="ult_30" label="Últimos 30 dias" />
              <Item tipo="mes_passado" label="Mês passado" />
            </div>
          </div>
          <div className="border-t pt-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 pb-1 font-semibold">
              ⚙️ Personalizado
            </div>
            <div className="px-1 grid grid-cols-2 gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs justify-start font-normal">
                    {customIni ? format(customIni, "dd/MM/yy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customIni} onSelect={setCustomIni} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs justify-start font-normal">
                    {customFim ? format(customFim, "dd/MM/yy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFim} onSelect={setCustomFim} locale={ptBR} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="px-1 pt-1.5">
              <Button size="sm" className="h-7 w-full text-xs" onClick={aplicarCustom}>
                Aplicar período personalizado
              </Button>
            </div>
          </div>
          {ativo && (
            <div className="border-t pt-2 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  onChange({ tipo: "todos" });
                  setCustomIni(undefined);
                  setCustomFim(undefined);
                  setOpen(false);
                }}
              >
                <X className="h-3 w-3" /> Limpar
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
