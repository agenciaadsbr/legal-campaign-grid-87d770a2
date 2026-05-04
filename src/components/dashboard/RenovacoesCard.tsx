import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { useMemo } from "react";
import type { Cliente } from "@/store/crm";

interface Props {
  clientes: Cliente[];
  limit?: number;
}

export function RenovacoesCard({ clientes, limit = 5 }: Props) {
  const items = useMemo(() => {
    const now = Date.now();
    return clientes
      .filter((c) => !!c.prazo_onboarding)
      .map((c) => ({
        c,
        dias: Math.ceil((new Date(c.prazo_onboarding as string).getTime() - now) / 86400000),
      }))
      .filter((x) => x.dias <= 7)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, limit);
  }, [clientes, limit]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Renovações próximas</CardTitle>
        </div>
        <CardDescription>Onboarding terminando em até 7 dias</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Nenhuma renovação próxima
          </div>
        ) : (
          items.map(({ c, dias }) => {
            const atrasado = dias < 0;
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.nome_cliente}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {c.nicho || "—"} · {c.status_global ?? "Onboarding"}
                  </div>
                </div>
                <Badge
                  variant={atrasado ? "destructive" : dias <= 2 ? "default" : "secondary"}
                  className="shrink-0 text-[10px]"
                >
                  {atrasado
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
