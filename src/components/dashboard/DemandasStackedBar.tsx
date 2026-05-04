import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Demanda } from "@/store/demandas";
import { STATUS_DEMANDA, STATUS_DEMANDA_COR, STATUS_DEMANDA_LABEL } from "@/lib/demandas-categorias";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

const PRIORIDADES = ["Baixa", "Media", "Alta", "Urgente"] as const;

export function DemandasStackedBar({ demandas }: { demandas: Demanda[] }) {
  const data = useMemo(() => {
    return PRIORIDADES.map((p) => {
      const row: any = { name: p === "Media" ? "Média" : p };
      STATUS_DEMANDA.forEach((s) => {
        row[s] = demandas.filter((d) => d.prioridade === p && d.status === s).length;
      });
      return row;
    });
  }, [demandas]);

  const isEmpty = demandas.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Demandas por prioridade × status</CardTitle>
        <CardDescription>Distribuição cruzada das demandas internas</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {isEmpty ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Nenhuma demanda registrada
          </div>
        ) : (
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {STATUS_DEMANDA.map((s) => (
                <Bar
                  key={s}
                  dataKey={s}
                  name={STATUS_DEMANDA_LABEL[s]}
                  stackId="a"
                  fill={STATUS_DEMANDA_COR[s]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
