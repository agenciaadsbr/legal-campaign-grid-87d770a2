import { useMemo } from "react";
import { Demanda, useDemandas } from "@/store/demandas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getPais,
  getFilhas,
  getDemandasPais,
  getDemandasFilhas,
  isAguardandoDependencia,
} from "@/lib/workflow";
import { Lock, Link2, ArrowRight, Unlock, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  demanda: Demanda;
  onOpenDemanda?: (d: Demanda) => void;
}

export function EtapasRelacionadas({ demanda, onOpenDemanda }: Props) {
  const { dependencies, demandas, liberarDependencia } = useDemandas();
  const { canWrite } = useAuth();

  const pais = getPais(demanda.id, dependencies);
  const filhas = getFilhas(demanda.id, dependencies);

  const parentFlow = useMemo(() => {
    if (demanda.parent_id) {
      return demandas.find(d => d.id === demanda.parent_id);
    }
    return null;
  }, [demanda.parent_id, demandas]);

  const subEtapas = useMemo(() => {
    if (demanda.is_parent) {
      return demandas.filter(d => d.parent_id === demanda.id);
    }
    return [];
  }, [demanda.id, demanda.is_parent, demandas]);

  if (pais.length === 0 && filhas.length === 0 && !parentFlow && subEtapas.length === 0) return null;

  const demandasPais = getDemandasPais(demanda.id, dependencies, demandas);
  const demandasFilhas = getDemandasFilhas(demanda.id, dependencies, demandas);

  return (
    <Card className="shrink-0 overflow-hidden">
      <CardHeader className="pb-1.5 pt-2.5 px-3">
        <CardTitle className="text-xs uppercase tracking-wide flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5" />
          Etapas relacionadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {/* Vínculo com Fluxo Pai */}
        {parentFlow && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" /> Pertence ao fluxo
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-primary/5 border-primary/20 px-2 py-1.5">
              <button
                type="button"
                onClick={() => onOpenDemanda?.(parentFlow)}
                className="text-xs flex-1 text-left truncate hover:underline font-medium"
              >
                {parentFlow.titulo}
              </button>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Sub etapas se for um card pai */}
        {subEtapas.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Etapas deste fluxo
            </div>
            <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
              {subEtapas.map(s => {
                const concluida = s.status === "Concluido" || s.status === "Entregue";
                const aguardando = s.status === "Aguardando etapa anterior" || isAguardandoDependencia(s.id, dependencies);
                return (
                  <div key={s.id} className="flex items-center gap-2 rounded-md border bg-muted/20 px-2 py-1">
                    {concluida ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : aguardando ? (
                      <Lock className="h-3 w-3 text-amber-500 shrink-0" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 ml-1 mr-0.5" />
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenDemanda?.(s)}
                      className="text-[11px] flex-1 text-left truncate hover:underline"
                    >
                      {s.titulo}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {demandasPais.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Depende de
            </div>
            {demandasPais.map((p) => {
              const dep = pais.find((x) => x.depends_on_task_id === p.id);
              const liberado = dep?.liberado;
              const concluida = p.status === "Concluido" || p.status === "Entregue";
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                >
                  {liberado || concluida ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenDemanda?.(p)}
                    className="text-xs flex-1 text-left truncate hover:underline"
                  >
                    {p.titulo}
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    {liberado ? "liberada" : concluida ? "concluída" : "aguardando"}
                  </span>
                  {!liberado && dep && canWrite && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => liberarDependencia(dep.id)}
                    >
                      <Unlock className="h-3 w-3 mr-1" /> Liberar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {demandasFilhas.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Próximas etapas
            </div>
            {demandasFilhas.map((f) => {
              const aguardando = isAguardandoDependencia(f.id, dependencies);
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <button
                    type="button"
                    onClick={() => onOpenDemanda?.(f)}
                    className="text-xs flex-1 text-left truncate hover:underline"
                  >
                    {f.titulo}
                  </button>
                  {aguardando && (
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" /> aguardando
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
