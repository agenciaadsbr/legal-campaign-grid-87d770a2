import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
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
      <div className="rounded-md border border-border bg-card p-12 text-center">
        <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <div className="text-sm font-medium">Nenhuma tarefa encontrada</div>
        <div className="text-xs text-muted-foreground mt-1">
          Ajuste os filtros ou aproveite para descansar 🙂
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[180px]">Cliente</TableHead>
            <TableHead>Tarefa</TableHead>
            <TableHead className="w-[160px]">Área</TableHead>
            <TableHead className="w-[110px]">Prioridade</TableHead>
            <TableHead className="w-[110px]">Prazo</TableHead>
            <TableHead className="w-[130px]">Status</TableHead>
            <TableHead className="w-[160px] text-right">Ações</TableHead>
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
              <TableCell className="font-medium text-sm">{t.cliente_nome}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 min-w-0">
                  <PrioridadeIcons task={t} />
                  <span className="text-sm truncate">{t.titulo}</span>
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
                    className="h-8 px-2"
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
                        className="h-8"
                        onClick={() => navigate(t.link)}
                      >
                        Abrir posts
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
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
  );
}
