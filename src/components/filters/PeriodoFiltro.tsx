import { useMemo, useState } from "react";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  | "personalizado";

export interface PeriodoValor {
  preset: PeriodoPreset;
  inicio: Date | null;
  fim: Date | null;
}

const PRESETS: Array<{ value: PeriodoPreset; label: string; group: string }> = [
  { value: "todos", label: "Todos", group: "—" },
  { value: "hoje", label: "Hoje", group: "Futuro" },
  { value: "esta_semana", label: "Esta semana", group: "Futuro" },
  { value: "prox_7", label: "Próximos 7 dias", group: "Futuro" },
  { value: "prox_14", label: "Próximos 14 dias", group: "Futuro" },
  { value: "prox_30", label: "Próximos 30 dias", group: "Futuro" },
  { value: "ult_7", label: "Últimos 7 dias", group: "Passado" },
  { value: "ult_14", label: "Últimos 14 dias", group: "Passado" },
  { value: "ult_30", label: "Últimos 30 dias", group: "Passado" },
  { value: "mes_passado", label: "Mês passado", group: "Passado" },
  { value: "personalizado", label: "Personalizado…", group: "—" },
];

export function calcularPeriodo(preset: PeriodoPreset, custom?: { inicio: Date | null; fim: Date | null }): PeriodoValor {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fimDia = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  switch (preset) {
    case "todos":
      return { preset, inicio: null, fim: null };
    case "hoje":
      return { preset, inicio: hoje, fim: fimDia(hoje) };
    case "esta_semana": {
      const dia = hoje.getDay(); // 0 = dom
      const ini = addDays(hoje, -dia);
      return { preset, inicio: ini, fim: fimDia(addDays(ini, 6)) };
    }
    case "prox_7":
      return { preset, inicio: hoje, fim: fimDia(addDays(hoje, 7)) };
    case "prox_14":
      return { preset, inicio: hoje, fim: fimDia(addDays(hoje, 14)) };
    case "prox_30":
      return { preset, inicio: hoje, fim: fimDia(addDays(hoje, 30)) };
    case "ult_7":
      return { preset, inicio: addDays(hoje, -7), fim: fimDia(hoje) };
    case "ult_14":
      return { preset, inicio: addDays(hoje, -14), fim: fimDia(hoje) };
    case "ult_30":
      return { preset, inicio: addDays(hoje, -30), fim: fimDia(hoje) };
    case "mes_passado": {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59, 999);
      return { preset, inicio: ini, fim };
    }
    case "personalizado":
      return { preset, inicio: custom?.inicio ?? null, fim: custom?.fim ?? null };
  }
}

interface Props {
  value: PeriodoValor;
  onChange: (v: PeriodoValor) => void;
  className?: string;
}

export function PeriodoFiltro({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const labelAtual = useMemo(() => {
    const p = PRESETS.find((x) => x.value === value.preset);
    if (value.preset === "personalizado" && value.inicio && value.fim) {
      const ini = value.inicio.toLocaleDateString("pt-BR");
      const fim = value.fim.toLocaleDateString("pt-BR");
      return ini === fim ? ini : `${ini} – ${fim}`;
    }
    if (value.preset === "personalizado" && value.inicio && !value.fim) {
      return value.inicio.toLocaleDateString("pt-BR");
    }
    return p?.label ?? "Período";
  }, [value]);

  const grupos = useMemo(() => {
    const g: Record<string, typeof PRESETS> = {};
    PRESETS.forEach((p) => {
      g[p.group] = g[p.group] ?? [];
      g[p.group].push(p);
    });
    return g;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 gap-2", className)}>
          <CalendarIcon className="h-4 w-4" />
          <span className="text-xs">{labelAtual}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="p-0 w-[min(560px,calc(100vw-2rem))]"
      >
        <div className="flex">
          <div className="w-[180px] shrink-0 border-r border-border p-2 space-y-2">
            {Object.entries(grupos).map(([grupo, items]) => (
              <div key={grupo}>
                {grupo !== "—" && (
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {grupo}
                  </div>
                )}
                <div className="flex flex-col">
                  {items.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        if (p.value === "personalizado") {
                          onChange({ preset: "personalizado", inicio: value.inicio, fim: value.fim });
                          return;
                        }
                        onChange(calcularPeriodo(p.value));
                        setOpen(false);
                      }}
                      className={cn(
                        "text-left text-xs px-2 py-2 rounded hover:bg-accent transition-colors",
                        value.preset === p.value && "bg-accent text-accent-foreground font-medium",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-[320px] p-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1">
              Intervalo personalizado
            </div>
            <Calendar
              mode="range"
              locale={ptBR}
              selected={{
                from: value.inicio ?? undefined,
                to: value.fim ?? undefined,
              }}
              onSelect={(range) => {
                const from = range?.from ?? null;
                const toRaw = range?.to ?? null;
                // Se só clicou em um dia, usa o mesmo dia como fim (final do dia)
                let fim: Date | null = null;
                if (toRaw) {
                  fim = new Date(toRaw);
                  fim.setHours(23, 59, 59, 999);
                } else if (from) {
                  fim = new Date(from);
                  fim.setHours(23, 59, 59, 999);
                }
                let inicio: Date | null = null;
                if (from) {
                  inicio = new Date(from);
                  inicio.setHours(0, 0, 0, 0);
                }
                onChange({ preset: "personalizado", inicio, fim });
              }}
              numberOfMonths={1}
              className="p-3 pointer-events-auto"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(calcularPeriodo("todos"));
                  setOpen(false);
                }}
              >
                Limpar
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
