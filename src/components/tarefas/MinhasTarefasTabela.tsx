import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorBadge } from "@/components/StatusBadge";
import { PrioridadeIcons } from "./PrioridadeIcon";
import type { UnifiedTask } from "@/lib/minhasTarefas";
import { STATUS_LABEL } from "@/lib/minhasTarefas";
import { PRIORIDADE_COR, PRIORIDADE_LABEL } from "@/lib/demandas-categorias";

interface Props {
  tasks: UnifiedTask[];
  onConcluir: (task: UnifiedTask) => void;
}

const STATUS_COR: Record<string, string> = {
  pendente: "hsl(var(--muted-foreground))",
  em_andamento: "hsl(var(--info))",
  atrasado: "hsl(var(--destructive))",
  concluido: "hsl(var(--status-postado))",
};

function formatPrazo(p: string | null): string {
  if (!p) return "—";
  const d = new Date(p);
  return d.toLocaleDateString("pt-BR");
}

export function MinhasTarefasTabela({ tasks, onConcluir }: Props) {
  const navigate = useNavigate();

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
          <Table className="[&_th]:py-1 [&_th]:px-2 [&_th]:h-7 [&_th]:text-xs [&_td]:py-1 [&_td]:px-2">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[160px]">Cliente</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead className="w-[120px]">Área</TableHead>
                <TableHead className="w-[90px]">Prioridade</TableHead>
                <TableHead className="w-[90px]">Prazo</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow
                  key={t.id}
                  className={cn(
                    t.status === "atrasado" && "bg-destructive/5",
                    t.urgente && "bg-sky-500/5",
                  )}
                >
                  <TableCell className="font-medium text-xs">{t.cliente_nome}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      <PrioridadeIcons task={t} />
                      <span className="text-xs truncate">{t.titulo}</span>
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
                    <span className={cn("text-xs tabular-nums", t.status === "atrasado" && "text-destructive font-medium")}>
                      {formatPrazo(t.prazo)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ColorBadge label={STATUS_LABEL[t.status]} color={STATUS_COR[t.status]} />
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
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
