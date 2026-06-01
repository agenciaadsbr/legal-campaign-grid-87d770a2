import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Filter, X } from "lucide-react";
import type { Cliente } from "@/store/crm";
import { AREAS_DISPONIVEIS, STATUS_LABEL, type TaskStatus } from "@/lib/minhasTarefas";
import { PeriodoFiltro, type PeriodoValor } from "@/components/filters/PeriodoFiltro";
import { ESTRATEGIAS_FILTRO, type EstrategiaId } from "@/lib/estrategiasAtivas";

export type ContextoFiltro = "todos" | "criacao" | "postagem";

export interface FiltrosState {
  cliente: string; // "all" | id
  areas: string[];
  status: TaskStatus[];
  busca: string;
  periodo: PeriodoValor;
  contexto: ContextoFiltro;
  estrategia: EstrategiaId | "todas";
}

interface Props {
  value: FiltrosState;
  onChange: (next: FiltrosState) => void;
  clientes: Cliente[];
  /** Lista de áreas de fato presentes nas tarefas, para enxugar opções. */
  areasDisponiveis?: string[];
}

export function MinhasTarefasFiltros({ value, onChange, clientes, areasDisponiveis }: Props) {
  const areas = useMemo(
    () => Array.from(new Set([...(areasDisponiveis ?? []), ...AREAS_DISPONIVEIS])),
    [areasDisponiveis],
  );
  const set = (patch: Partial<FiltrosState>) => onChange({ ...value, ...patch });

  const toggleArea = (a: string) => {
    const next = value.areas.includes(a)
      ? value.areas.filter((x) => x !== a)
      : [...value.areas, a];
    set({ areas: next });
  };

  const toggleStatus = (s: TaskStatus) => {
    const next = value.status.includes(s)
      ? value.status.filter((x) => x !== s)
      : [...value.status, s];
    set({ status: next });
  };

  const totalFiltros =
    (value.cliente !== "all" ? 1 : 0) +
    value.areas.length +
    value.status.length +
    (value.busca ? 1 : 0) +
    (value.periodo.preset !== "todos" ? 1 : 0) +
    (value.contexto !== "todos" ? 1 : 0) +
    (value.estrategia !== "todas" ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Busca */}
      <div className="relative min-w-[220px]">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.busca}
          onChange={(e) => set({ busca: e.target.value })}
          placeholder="Buscar tarefa ou cliente…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      {/* Cliente */}
      <Select value={value.cliente} onValueChange={(v) => set({ cliente: v })}>
        <SelectTrigger className="h-8 w-[200px] text-xs">
          <SelectValue placeholder="Cliente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os clientes</SelectItem>
          {clientes
            .slice()
            .sort((a, b) => a.nome_cliente.localeCompare(b.nome_cliente))
            .map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Área */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Área {value.areas.length > 0 && `(${value.areas.length})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 pb-1">
            Categorias
          </div>
          <div className="max-h-64 overflow-y-auto">
            {areas.map((a) => (
              <label
                key={a}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
              >
                <Checkbox
                  checked={value.areas.includes(a)}
                  onCheckedChange={() => toggleArea(a)}
                />
                {a}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Status */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Status {value.status.length > 0 && `(${value.status.length})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
            <label
              key={s}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
            >
              <Checkbox
                checked={value.status.includes(s)}
                onCheckedChange={() => toggleStatus(s)}
              />
              {STATUS_LABEL[s]}
            </label>
          ))}
        </PopoverContent>
      </Popover>

      {/* Período */}
      <PeriodoFiltro value={value.periodo} onChange={(p) => set({ periodo: p })} />

      {/* Contexto (Posts: Criação vs Postagem) */}
      <Select value={value.contexto} onValueChange={(v) => set({ contexto: v as ContextoFiltro })}>
        <SelectTrigger className="h-8 w-[170px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Contexto: Todos</SelectItem>
          <SelectItem value="criacao">Contexto: Criação</SelectItem>
          <SelectItem value="postagem">Contexto: Postagem</SelectItem>
        </SelectContent>
      </Select>

      {/* Estratégia ativa */}
      <Select
        value={value.estrategia}
        onValueChange={(v) => set({ estrategia: v as EstrategiaId | "todas" })}
      >
        <SelectTrigger className="h-8 w-[170px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Estratégia: Todas</SelectItem>
          {ESTRATEGIAS_FILTRO.map((e) => (
            <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {totalFiltros > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={() =>
            onChange({
              cliente: "all",
              areas: [],
              status: [],
              busca: "",
              periodo: { preset: "todos", inicio: null, fim: null },
              contexto: "todos",
              estrategia: "todas",
            })
          }
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
