import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/AvatarStack";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VisaoGeralItem {
  key: string;
  titulo: string;
  icone: LucideIcon;
  total: number;
  pendentes: number;
  atrasadas: number;
  responsaveis: any[];
  onVerDetalhes: () => void;
  /** Conteúdo opcional renderizado quando a linha está expandida (ex.: lista resumida das tarefas) */
  detalhe?: React.ReactNode;
}

export function VisaoGeralLista({ itens }: { itens: VisaoGeralItem[] }) {
  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
      {itens.map((it) => (
        <LinhaVisaoGeral key={it.key} item={it} />
      ))}
    </div>
  );
}

function LinhaVisaoGeral({ item }: { item: VisaoGeralItem }) {
  const [open, setOpen] = useState(false);
  const Icone = item.icone;
  const hasAtrasadas = item.atrasadas > 0;
  const hasPendentes = item.pendentes > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
                open && "rotate-90",
              )}
            />
            <Icone className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{item.titulo}</span>
          </button>
        </CollapsibleTrigger>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <Stat label="Total" value={item.total} />
            <Stat label="Pend." value={item.pendentes} warn={hasPendentes} />
            <Stat label="Atras." value={item.atrasadas} danger={hasAtrasadas} />
          </div>

          {item.responsaveis.length > 0 ? (
            <AvatarStack responsaveis={item.responsaveis} size="xs" max={4} />
          ) : (
            <span className="text-[10px] text-muted-foreground hidden md:inline">Sem responsáveis</span>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              item.onVerDetalhes();
            }}
          >
            Ver <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-9 pb-3 pt-1 bg-muted/20 border-t border-border/50">
          <div className="grid grid-cols-3 gap-3 max-w-md mb-2 sm:hidden">
            <StatBox label="Total" value={item.total} />
            <StatBox label="Pendentes" value={item.pendentes} warn={hasPendentes} />
            <StatBox label="Atrasadas" value={item.atrasadas} danger={hasAtrasadas} />
          </div>
          {item.detalhe ?? (
            <p className="text-xs text-muted-foreground">
              {item.total === 0
                ? "Nenhum item cadastrado nesta categoria."
                : `${item.pendentes} pendentes de ${item.total} no total.`}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Stat({
  label,
  value,
  warn,
  danger,
}: { label: string; value: number; warn?: boolean; danger?: boolean }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-bold tabular-nums",
          warn && "text-amber-500",
          danger && "text-destructive",
        )}
      >
        {value}
      </span>
    </span>
  );
}

function StatBox({
  label,
  value,
  warn,
  danger,
}: { label: string; value: number; warn?: boolean; danger?: boolean }) {
  return (
    <div className="rounded-md bg-background px-2 py-1.5 border border-border">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-base font-bold tabular-nums",
          warn && "text-amber-500",
          danger && "text-destructive",
        )}
      >
        {value}
      </div>
    </div>
  );
}
