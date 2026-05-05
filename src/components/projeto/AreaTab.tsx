import { useState, useMemo, useEffect } from "react";
import { Demanda, getResponsaveisIds, useDemandas } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import {
  CATEGORIA_LABEL,
  CATEGORIA_SUBTIPOS,
  DemandaCategoria,
} from "@/lib/demandas-categorias";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, type LucideIcon } from "lucide-react";
import { ProjetoKanban } from "@/components/demandas/ProjetoKanban";
import { DemandaDetalheDialog } from "@/components/demandas/DemandaDetalheDialog";
import { AvatarStack } from "@/components/AvatarStack";
import { cn } from "@/lib/utils";

interface Props {
  titulo: string;
  icone: LucideIcon;
  clienteId: string;
  /** Lista das demandas do cliente já filtradas para esta área. */
  demandas: Demanda[];
  /** Categoria que será pré-selecionada e travada ao criar nova tarefa. */
  categoria: DemandaCategoria;
  /** Texto vazio customizado. */
  emptyHint?: string;
  /** Demanda a ser aberta automaticamente (deep-link de Minhas Tarefas). */
  demandaInicial?: Demanda | null;
}

export function AreaTab({
  titulo,
  icone: Icone,
  clienteId,
  demandas,
  categoria,
  emptyHint,
  demandaInicial,
}: Props) {
  const { responsaveis } = useCRM();
  const createRascunho = useDemandas((s) => s.createRascunho);
  const [selecionada, setSelecionada] = useState<Demanda | null>(null);
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [filtroSubtipo, setFiltroSubtipo] = useState<string>("todos");
  const [filtroResp, setFiltroResp] = useState<string>("todos");

  // Deep-link: abre o detalhe quando uma demanda inicial é fornecida
  useEffect(() => {
    if (demandaInicial) setSelecionada(demandaInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandaInicial?.id]);

  const handleNovaTarefa = async () => {
    const novo = await createRascunho({ cliente_id: clienteId, categoria });
    if (novo) {
      setSelecionada(novo);
      setRascunhoId(novo.id);
    }
  };

  const subtipos = CATEGORIA_SUBTIPOS[categoria] ?? [];

  const respsArea = useMemo(() => {
    const ids = new Set<string>();
    demandas.forEach((d) => getResponsaveisIds(d).forEach((r) => ids.add(r)));
    return responsaveis.filter((r) => ids.has(r.id));
  }, [demandas, responsaveis]);

  const filtradas = useMemo(() => {
    return demandas.filter((d) => {
      if (filtroSubtipo !== "todos" && d.subtipo !== filtroSubtipo) return false;
      if (filtroResp !== "todos" && !getResponsaveisIds(d).includes(filtroResp)) return false;
      return true;
    });
  }, [demandas, filtroSubtipo, filtroResp]);

  const total = demandas.length;
  const pendentes = demandas.filter(
    (d) => !["Concluido", "Entregue"].includes(d.status),
  ).length;
  const atrasadas = demandas.filter((d) => d.status === "Atrasado").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Icone className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{titulo}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline">Total {total}</Badge>
            <Badge variant="outline" className={cn(pendentes > 0 && "text-amber-500")}>
              Pendentes {pendentes}
            </Badge>
            <Badge variant="outline" className={cn(atrasadas > 0 && "text-destructive")}>
              Atrasadas {atrasadas}
            </Badge>
          </div>
          {respsArea.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Equipe:</span>
              <AvatarStack responsaveis={respsArea} size="xs" max={5} />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {subtipos.length > 0 && (
              <select
                value={filtroSubtipo}
                onChange={(e) => setFiltroSubtipo(e.target.value)}
                className="h-9 rounded-md border bg-background text-xs px-2"
              >
                <option value="todos">Todos subtipos</option>
                {subtipos.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            {respsArea.length > 0 && (
              <select
                value={filtroResp}
                onChange={(e) => setFiltroResp(e.target.value)}
                className="h-9 rounded-md border bg-background text-xs px-2"
              >
                <option value="todos">Todos responsáveis</option>
                {respsArea.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            )}
            <Button size="sm" onClick={handleNovaTarefa}>
              <Plus className="h-4 w-4 mr-1" /> Nova tarefa de {CATEGORIA_LABEL[categoria]}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kanban */}
      {filtradas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {emptyHint ??
              `Nenhuma tarefa de ${CATEGORIA_LABEL[categoria]} ainda. Clique em "Nova tarefa" para criar.`}
          </CardContent>
        </Card>
      ) : (
        <ProjetoKanban demandas={filtradas} onOpen={setSelecionada} />
      )}

      <DemandaDetalheDialog
        demanda={selecionada}
        isRascunho={!!selecionada && selecionada.id === rascunhoId}
        onOpenChange={(v) => {
          if (!v) {
            setSelecionada(null);
            setRascunhoId(null);
          }
        }}
      />
    </div>
  );
}
