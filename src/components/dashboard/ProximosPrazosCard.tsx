import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock } from "lucide-react";
import { useMemo } from "react";
import type { Demanda } from "@/store/demandas";
import type { Cliente } from "@/store/crm";

interface Props {
  demandas: Demanda[];
  clientes: Cliente[];
  limit?: number;
}

export function ProximosPrazosCard({ demandas, clientes, limit = 6 }: Props) {
  const items = useMemo(() => {
    const now = Date.now();
    return demandas
      .filter((d) => d.status !== "Concluido" && d.data_limite)
      .map((d) => ({
        d,
        ts: new Date(d.data_limite as string).getTime(),
      }))
      .sort((a, b) => a.ts - b.ts)
      .slice(0, limit);
  }, [demandas, limit]);

  const clienteMap = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c.nome_cliente])),
    [clientes]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Próximos prazos</CardTitle>
        </div>
        <CardDescription>Demandas com vencimento mais próximo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Nenhum prazo em aberto
          </div>
        ) : (
          items.map(({ d, ts }) => {
            const dias = Math.ceil((ts - Date.now()) / 86400000);
            const atrasada = dias < 0;
            return (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.titulo}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {clienteMap[d.cliente_id] ?? "Sem cliente"}
                  </div>
                </div>
                <Badge
                  variant={atrasada ? "destructive" : dias <= 3 ? "default" : "secondary"}
                  className="shrink-0 text-[10px]"
                >
                  {atrasada
                    ? `${Math.abs(dias)}d atraso`
                    : dias === 0
                    ? "hoje"
                    : `${dias}d`}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
