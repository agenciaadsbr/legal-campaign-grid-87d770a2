import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useCRM } from "@/store/crm";

export interface AtivacaoFiltros {
  busca: string;
  responsavelId: string;
  risco: string;
  statusPrincipal: string;
}

export const FILTROS_VAZIOS: AtivacaoFiltros = {
  busca: "",
  responsavelId: "todos",
  risco: "todos",
  statusPrincipal: "todos",
};

interface Props {
  filtros: AtivacaoFiltros;
  onChange: (f: AtivacaoFiltros) => void;
  statusDisponiveis: string[];
}

export function CentralAtivacaoFiltros({ filtros, onChange, statusDisponiveis }: Props) {
  const responsaveis = useCRM((s) => s.responsaveis);

  const set = <K extends keyof AtivacaoFiltros>(k: K, v: AtivacaoFiltros[K]) =>
    onChange({ ...filtros, [k]: v });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={filtros.busca}
          onChange={(e) => set("busca", e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      <Select value={filtros.responsavelId} onValueChange={(v) => set("responsavelId", v)}>
        <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos responsáveis</SelectItem>
          {responsaveis.map((r) => (
            <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtros.risco} onValueChange={(v) => set("risco", v)}>
        <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Risco" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos riscos</SelectItem>
          <SelectItem value="Critico">Crítico</SelectItem>
          <SelectItem value="Atencao">Atenção</SelectItem>
          <SelectItem value="OK">OK</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filtros.statusPrincipal} onValueChange={(v) => set("statusPrincipal", v)}>
        <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="Status principal" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos status</SelectItem>
          {statusDisponiveis.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(FILTROS_VAZIOS)}
        className="text-muted-foreground"
      >
        <X className="h-4 w-4 mr-1" />
        Limpar
      </Button>
    </div>
  );
}
