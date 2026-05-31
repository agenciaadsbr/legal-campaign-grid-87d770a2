import { Badge } from "@/components/ui/badge";
import type { StatusVisual } from "@/lib/ativacaoRules";

const STYLES: Record<StatusVisual, string> = {
  "No prazo":
    "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15 dark:text-emerald-400",
  "Atenção":
    "bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/15 dark:text-amber-400",
  Risco:
    "bg-orange-500/15 text-orange-600 border-orange-500/30 hover:bg-orange-500/15 dark:text-orange-400",
  Atrasado:
    "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/15",
  Travado:
    "bg-violet-500/15 text-violet-600 border-violet-500/30 hover:bg-violet-500/15 dark:text-violet-400",
};

export function StatusVisualBadge({ status }: { status: StatusVisual }) {
  return <Badge className={STYLES[status] + " border"}>{status}</Badge>;
}
