import { Button } from "@/components/ui/button";
import { Rocket, Settings2, Upload } from "lucide-react";
import {
  CentralAtivacaoFiltros,
  type AtivacaoFiltros,
} from "@/components/ativacao/CentralAtivacaoFiltros";

interface Props {
  onAbrirRegras: () => void;
  onImportar: () => void;
  filtros: AtivacaoFiltros;
  onChangeFiltros: (f: AtivacaoFiltros) => void;
  statusDisponiveis: string[];
}

export function CentralAtivacaoHeader({
  onAbrirRegras,
  onImportar,
  filtros,
  onChangeFiltros,
  statusDisponiveis,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Rocket className="h-6 w-6 text-primary" />
            Central de Ativação
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie clientes em onboarding até a ativação da operação.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <CentralAtivacaoFiltros
          filtros={filtros}
          onChange={onChangeFiltros}
          statusDisponiveis={statusDisponiveis}
        />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={onAbrirRegras}>
            <Settings2 className="h-4 w-4 mr-2" />
            Regras de Ativação
          </Button>
          <Button size="sm" onClick={onImportar}>
            <Upload className="h-4 w-4 mr-2" />
            Importar clientes
          </Button>
        </div>
      </div>
    </div>
  );
}
