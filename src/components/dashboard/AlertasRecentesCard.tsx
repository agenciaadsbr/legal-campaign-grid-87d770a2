import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { useMemo } from "react";
import type { Alerta, Cliente } from "@/store/crm";

interface Props {
  alertas: Alerta[];
  clientes: Cliente[];
  limit?: number;
}

export function AlertasRecentesCard({ alertas, clientes, limit = 5 }: Props) {
  const items = useMemo(
    () =>
      alertas
        .filter((a) => a.status === "Pendente")
        .sort((a, b) => new Date(b.data_alerta).getTime() - new Date(a.data_alerta).getTime())
        .slice(0, limit),
    [alertas, limit]
  );

  const clienteMap = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c.nome_cliente])),
    [clientes]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-destructive" />
          <CardTitle className="text-base">Alertas pendentes</CardTitle>
        </div>
        <CardDescription>Itens que requerem atenção</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Nenhum alerta pendente
          </div>
        ) : (
          items.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
            >
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-destructive" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.mensagem}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {clienteMap[a.cliente_id] ?? "—"} ·{" "}
                  {new Date(a.data_alerta).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
