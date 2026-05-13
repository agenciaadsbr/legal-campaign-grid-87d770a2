import { Fragment, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, AlertCircle, Clock, Circle, Zap, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ColorBadge } from "@/components/StatusBadge";
import { PrioridadeIcons } from "./PrioridadeIcon";
import type { UnifiedTask, TaskStatus } from "@/lib/minhasTarefas";
import { STATUS_LABEL } from "@/lib/minhasTarefas";
import { PRIORIDADE_COR, PRIORIDADE_LABEL } from "@/lib/demandas-categorias";
import { useCRM } from "@/store/crm";

interface Props {
  tasks: UnifiedTask[];
  onConcluir: (task: UnifiedTask) => void;
  mostrarResponsavel?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

const STATUS_COR: Record<string, string> = {
  pendente: "hsl(var(--muted-foreground))",
  em_andamento: "hsl(var(--info))",
  atrasado: "hsl(var(--destructive))",
  concluido: "hsl(var(--status-postado))",
};

type GroupKey = "urgente" | "atrasado" | "em_andamento" | "pendente" | "concluido";

const GROUP_ORDER: GroupKey[] = ["urgente", "atrasado", "em_andamento", "pendente", "concluido"];

const GROUP_META: Record<GroupKey, { label: string; icon: typeof Zap; className: string }> = {
  urgente:      { label: "Urgentes",     icon: Zap,          className: "text-destructive" },
  atrasado:     { label: "Atrasadas",    icon: AlertCircle,  className: "text-destructive" },
  em_andamento: { label: "Em andamento", icon: Clock,        className: "text-info" },
  pendente:     { label: "Pendentes",    icon: Circle,       className: "text-muted-foreground" },
  concluido:    { label: "Concluídas",   icon: CheckCircle2, className: "text-emerald-500" },
};

function groupOf(t: UnifiedTask): GroupKey {
  if (t.status === "concluido") return "concluido";
  if (t.urgente) return "urgente";
  return t.status as GroupKey;
}

function formatPrazo(p: string | null): string {
  if (!p) return "—";
  const d = new Date(p);
  return d.toLocaleDateString("pt-BR");
}

export function MinhasTarefasTabela({ 
  tasks, 
  onConcluir, 
  mostrarResponsavel = false,
  selectedIds = [],
  onSelectionChange
}: Props) {
  const navigate = useNavigate();
  const responsaveis = useCRM((s) => s.responsaveis);
  const respMap = useMemo(
    () => new Map(responsaveis.map((r) => [r.id, r.nome])),
    [responsaveis],
  );

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === tasks.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tasks.map(t => t.id));
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(x => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const grupos = useMemo(() => {
    const buckets: Record<GroupKey, UnifiedTask[]> = {
      urgente: [], atrasado: [], em_andamento: [], pendente: [], concluido: [],
    };
    for (const t of tasks) buckets[groupOf(t)].push(t);
    return GROUP_ORDER
      .map((k) => ({ key: k, items: buckets[k] }))
      .filter((g) => g.items.length > 0);
  }, [tasks]);

  const colSpan = mostrarResponsavel ? 9 : 8;

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <div className="text-xs font-medium">Nenhuma tarefa encontrada</div>
          <div className="text-xs text-muted-foreground mt-1">
            Ajuste os filtros ou aproveite para descansar 🙂
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table className="[&_th]:py-1.5 [&_th]:px-2 [&_th]:h-8 [&_th]:text-xs [&_td]:py-2 [&_td]:px-2 [&_td]:align-middle">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40px] px-2">
                  <Checkbox 
                    checked={tasks.length > 0 && selectedIds.length === tasks.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="w-[160px]">Cliente</TableHead>
                {mostrarResponsavel && <TableHead className="w-[140px]">Responsável</TableHead>}
                <TableHead>Tarefa</TableHead>
                <TableHead className="w-[120px]">Área</TableHead>
                <TableHead className="w-[90px]">Prioridade</TableHead>
                <TableHead className="w-[90px]">Prazo</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupos.map(({ key, items }) => {
                const meta = GROUP_META[key];
                const Icon = meta.icon;
                return (
                  <Fragment key={key}>
                    <TableRow key={`h-${key}`} className="hover:bg-transparent bg-muted/40 border-y border-border/60">
                      <TableCell colSpan={colSpan} className="!py-1.5">
                        <div className={cn("flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold", meta.className)}>
                          <Icon className="h-3.5 w-3.5" />
                          <span>{meta.label}</span>
                          <span className="text-muted-foreground/70 normal-case tracking-normal font-normal">
                            ({items.length})
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {items.map((t) => {
                      const isConcluido = t.status === "concluido";
                      const isUrgente = key === "urgente";
                      const isAtrasado = t.status === "atrasado";
                      return (
                        <TableRow
                          key={t.id}
                          className={cn(
                            "transition-colors",
                            isAtrasado && !isUrgente && "bg-destructive/5",
                            isUrgente && "bg-destructive/5 border-l-2 border-l-destructive",
                            isConcluido && "opacity-60",
                            selectedIds.includes(t.id) && "bg-primary/5",
                          )}
                        >
                          <TableCell className="px-2">
                            <Checkbox 
                              checked={selectedIds.includes(t.id)}
                              onCheckedChange={() => toggleOne(t.id)}
                            />
                          </TableCell>
                          <TableCell className={cn("font-medium text-xs", isConcluido && "text-muted-foreground")}>
                            {t.cliente_nome}
                          </TableCell>
                          {mostrarResponsavel && (
                            <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {t.responsaveis_ids.length > 0
                                ? t.responsaveis_ids.map((id) => respMap.get(id) ?? "—").join(", ")
                                : "—"}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-0">
                              <PrioridadeIcons task={t} />
                              <span className={cn("text-xs truncate", isConcluido && "text-muted-foreground line-through decoration-muted-foreground/50")}>
                                {t.titulo}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{t.area}</span>
                          </TableCell>
                          <TableCell>
                            <ColorBadge
                              label={PRIORIDADE_LABEL[t.prioridade]}
                              color={PRIORIDADE_COR[t.prioridade]}
                            />
                          </TableCell>
                          <TableCell>
                            <span className={cn("text-xs tabular-nums", isAtrasado && "text-destructive font-medium")}>
                              {formatPrazo(t.prazo)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex min-w-[100px]">
                              <ColorBadge label={STATUS_LABEL[t.status as TaskStatus]} color={STATUS_COR[t.status]} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => navigate(t.link)}
                                title="Abrir no projeto do cliente"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                              {t.status !== "concluido" && (
                                t.id.startsWith("posts:") ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => navigate(t.link)}
                                  >
                                    Abrir posts
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => onConcluir(t)}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    Concluir
                                  </Button>
                                )
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
