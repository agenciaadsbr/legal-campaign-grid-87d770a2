import { Zap, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnifiedTask } from "@/lib/minhasTarefas";
import { diasParaPrazo } from "@/lib/minhasTarefas";

export function PrioridadeIcons({ task, className }: { task: UnifiedTask; className?: string }) {
  const dias = diasParaPrazo(task.prazo);
  const proximo = dias !== null && dias >= 0 && dias <= 3 && task.status !== "concluido";
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {task.urgente && (
        <Zap className="h-3.5 w-3.5 fill-sky-500 text-sky-500" aria-label="Urgente" />
      )}
      {task.status === "atrasado" && (
        <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-label="Atrasada" />
      )}
      {proximo && task.status !== "atrasado" && (
        <Clock className="h-3.5 w-3.5 text-amber-500" aria-label="Próximo prazo" />
      )}
    </span>
  );
}
