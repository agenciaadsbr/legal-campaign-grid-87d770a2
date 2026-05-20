import { useState, useMemo, useEffect } from "react";
import { Demanda, getResponsaveisIds, useDemandas } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import {
  CATEGORIA_LABEL,
  CATEGORIA_SUBTIPOS,
  DemandaCategoria,
  STATUS_DEMANDA,
  STATUS_DEMANDA_COR,
} from "@/lib/demandas-categorias";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CheckSquare, X, Trash2, type LucideIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProjetoKanban } from "@/components/demandas/ProjetoKanban";
import { DemandaDetalheDialog } from "@/components/demandas/DemandaDetalheDialog";
import { AvatarStack } from "@/components/AvatarStack";
import { AtribuirResponsaveisPopover } from "@/components/demandas/AtribuirResponsaveisPopover";
import { DefinirDatasPopover } from "@/components/demandas/DefinirDatasPopover";
import { AlterarStatusPopover } from "@/components/demandas/AlterarStatusPopover";
import { toast } from "sonner";
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
  /** Quando true, exibe botão "Excluir selecionados" no modo seleção. */
  allowBulkDelete?: boolean;
  /** Slot opcional renderizado acima do Kanban (ex.: faixa de Cards Pai na Operacional). */
  extraTop?: React.ReactNode;
  /** Slot opcional dentro do dropdown de "Nova tarefa" (ex.: "Novo Card Pai"). */
  novaTarefaExtra?: React.ReactNode;
  /** Quando definido, exibe botão "+ Card Pai" ao lado de "+ Nova tarefa". */
  onNovoCardPai?: () => void | Promise<void>;
}

export function AreaTab({
  titulo,
  icone: Icone,
  clienteId,
  demandas,
  categoria,
  emptyHint,
  demandaInicial,
  allowBulkDelete,
  extraTop,
  novaTarefaExtra,
  onNovoCardPai,
}: Props) {
  const { responsaveis } = useCRM();
  const createRascunho = useDemandas((s) => s.createRascunho);
  const updateDemanda = useDemandas((s) => s.updateDemanda);
  const deleteDemanda = useDemandas((s) => s.deleteDemanda);
  const reloadDemandas = useDemandas((s) => s.load);
  const [selecionada, setSelecionada] = useState<Demanda | null>(null);
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [filtroSubtipo, setFiltroSubtipo] = useState<string>("todos");
  const [filtroResp, setFiltroResp] = useState<string>("todos");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Deep-link: abre o detalhe quando uma demanda inicial é fornecida.
  // Se a demanda inicial veio recém-criada como rascunho ("Sem título"),
  // marca como rascunho para habilitar auto-foco e descarte se vazia.
  useEffect(() => {
    if (demandaInicial) {
      setSelecionada(demandaInicial);
      if (demandaInicial.titulo === "Sem título") {
        setRascunhoId(demandaInicial.id);
      }
    }
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
            <Button
              size="sm"
              variant={selectionMode ? "secondary" : "outline"}
              onClick={() => {
                setSelectionMode((v) => !v);
                setSelectedIds(new Set());
              }}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              {selectionMode ? "Cancelar seleção" : "Selecionar"}
            </Button>
            {novaTarefaExtra ? (
              <div className="flex items-center gap-1">
                <Button size="sm" onClick={handleNovaTarefa}>
                  <Plus className="h-4 w-4 mr-1" /> Nova tarefa
                </Button>
                {novaTarefaExtra}
              </div>
            ) : (
              <Button size="sm" onClick={handleNovaTarefa}>
                <Plus className="h-4 w-4 mr-1" /> Nova tarefa de {CATEGORIA_LABEL[categoria]}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Barra de seleção em massa */}
      {selectionMode && (
        <Card>
          <CardContent className="p-3 flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={
                  filtradas.length > 0 &&
                  filtradas.every((d) => selectedIds.has(d.id))
                }
                onCheckedChange={(v) => {
                  if (v) {
                    setSelectedIds(new Set(filtradas.map((d) => d.id)));
                  } else {
                    setSelectedIds(new Set());
                  }
                }}
              />
              <span className="font-medium">Selecionar todos</span>
            </label>
            <Badge variant="secondary" className="text-xs">
              {selectedIds.size} {selectedIds.size === 1 ? "selecionada" : "selecionadas"}
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              <AtribuirResponsaveisPopover
                responsaveis={responsaveis}
                count={selectedIds.size}
                onApply={async (novosIds, modo) => {
                  const ids = Array.from(selectedIds);
                  await Promise.all(
                    ids.map((id) => {
                      const atual = demandas.find((d) => d.id === id);
                      const atuais = atual ? getResponsaveisIds(atual) : [];
                      const finalIds: string[] =
                        modo === "substituir"
                          ? novosIds
                          : Array.from(new Set([...atuais, ...novosIds]));
                      return updateDemanda(id, { responsaveis_ids: finalIds });
                    }),
                  );
                  toast.success(
                    `${ids.length} ${ids.length === 1 ? "tarefa atualizada" : "tarefas atualizadas"}`,
                  );
                  setSelectedIds(new Set());
                  setSelectionMode(false);
                }}
              />

              <DefinirDatasPopover
                count={selectedIds.size}
                onApply={async (datas) => {
                  const ids = Array.from(selectedIds);
                  await Promise.all(
                    ids.map((id) => updateDemanda(id, {
                      data_inicio: datas.data_inicio || undefined,
                      data_limite: datas.data_limite || undefined,
                    }))
                  );
                  toast.success(`${ids.length} datas atualizadas`);
                  setSelectedIds(new Set());
                  setSelectionMode(false);
                }}
              />

              <AlterarStatusPopover
                count={selectedIds.size}
                options={STATUS_DEMANDA.map(s => ({ label: s, cor: STATUS_DEMANDA_COR[s] }))}
                onApply={async (novoStatus) => {
                  const ids = Array.from(selectedIds);
                  await Promise.all(
                    ids.map((id) => updateDemanda(id, { status: novoStatus as any }))
                  );
                  toast.success(`${ids.length} status atualizados`);
                  setSelectedIds(new Set());
                  setSelectionMode(false);
                }}
              />

              {allowBulkDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={selectedIds.size === 0 || deletingBulk}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Excluir selecionados
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedIds.size === 0}
              >
                Limpar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedIds(new Set());
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {extraTop}

      {/* Kanban */}
      {filtradas.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {emptyHint ??
              `Nenhuma tarefa de ${CATEGORIA_LABEL[categoria]} ainda. Clique em "Nova tarefa" para criar.`}
          </CardContent>
        </Card>
      ) : (
        <ProjetoKanban
          demandas={filtradas}
          onOpen={setSelecionada}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={(id) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
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

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefas selecionadas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir as tarefas selecionadas? Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBulk}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingBulk}
              onClick={async (e) => {
                e.preventDefault();
                setDeletingBulk(true);
                try {
                  const ids = Array.from(selectedIds);
                  await Promise.all(ids.map((id) => deleteDemanda(id)));
                  toast.success(
                    `${ids.length} ${ids.length === 1 ? "tarefa excluída" : "tarefas excluídas"}`,
                  );
                  setSelectedIds(new Set());
                  setSelectionMode(false);
                  setConfirmDeleteOpen(false);
                  await reloadDemandas(true);
                } catch (err) {
                  toast.error("Erro ao excluir tarefas");
                } finally {
                  setDeletingBulk(false);
                }
              }}
            >
              {deletingBulk ? "Excluindo…" : "Excluir selecionados"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
