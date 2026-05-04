import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Cliente } from "@/store/crm";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

const STATUS_COLOR: Record<string, string> = {
  Onboarding: "hsl(217 91% 60%)",
  Ativo: "hsl(160 84% 39%)",
  Pausado: "hsl(38 92% 50%)",
  Encerrado: "hsl(var(--muted-foreground))",
};

export function StatusClientesDonut({ clientes }: { clientes: Cliente[] }) {
  const data = useMemo(() => {
    const order = ["Onboarding", "Ativo", "Pausado", "Encerrado"] as const;
    return order
      .map((s) => ({
        name: s,
        value: clientes.filter((c) => (c.status_global ?? "Onboarding") === s).length,
        cor: STATUS_COLOR[s],
      }))
      .filter((d) => d.value > 0);
  }, [clientes]);

  const total = data.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Status dos clientes</CardTitle>
        <CardDescription>Distribuição do ciclo de vida</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            Sem dados
          </div>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {data.map((e, i) => (
                  <Cell key={i} fill={e.cor} stroke="hsl(var(--card))" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: any, n: any) => [
                  `${v} (${Math.round((Number(v) / total) * 100)}%)`,
                  n,
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
