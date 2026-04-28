import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarStack } from "@/components/AvatarStack";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  titulo: string;
  icone: LucideIcon;
  total: number;
  pendentes: number;
  atrasadas: number;
  responsaveis: any[];
  onVerDetalhes: () => void;
}

export function VisaoGeralCard({
  titulo,
  icone: Icone,
  total,
  pendentes,
  atrasadas,
  responsaveis,
  onVerDetalhes,
}: Props) {
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Icone className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold flex-1 truncate">{titulo}</h3>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Mini label="Total" value={total} />
          <Mini label="Pend." value={pendentes} warn={pendentes > 0} />
          <Mini label="Atras." value={atrasadas} danger={atrasadas > 0} />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          {responsaveis.length > 0 ? (
            <AvatarStack responsaveis={responsaveis} size="xs" max={4} />
          ) : (
            <span className="text-[10px] text-muted-foreground">Sem responsáveis</span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={onVerDetalhes}
          >
            Ver detalhes <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Mini({
  label,
  value,
  warn,
  danger,
}: {
  label: string;
  value: number;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-base font-bold tabular-nums leading-tight",
          warn && "text-amber-500",
          danger && "text-destructive",
        )}
      >
        {value}
      </div>
    </div>
  );
}
