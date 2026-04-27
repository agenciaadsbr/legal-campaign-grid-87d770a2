import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useDemandas, getResponsaveisIds } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import {
  STATUS_DEMANDA, STATUS_DEMANDA_LABEL, STATUS_DEMANDA_COR, CATEGORIAS, CATEGORIA_LABEL,
} from "@/lib/demandas-categorias";

export function RelatoriosDemandas() {
  const demandas = useDemandas((s) => s.demandas);
  const { responsaveis } = useCRM();

  const porStatus = useMemo(
    () => STATUS_DEMANDA.map((s) => ({
      name: STATUS_DEMANDA_LABEL[s],
      value: demandas.filter((d) => d.status === s).length,
      cor: STATUS_DEMANDA_COR[s],
    })),
    [demandas]
  );

  const porCategoria = useMemo(
    () => CATEGORIAS.map((c) => ({
      name: CATEGORIA_LABEL[c],
      total: demandas.filter((d) => d.categoria === c).length,
    })),
    [demandas]
  );

  const porResponsavel = useMemo(
    () => responsaveis.map((r) => ({
      name: r.nome.split(" ")[0],
      total: demandas.filter((d) => getResponsaveisIds(d).includes(r.id)).length,
      cor: r.cor,
    })),
    [responsaveis, demandas]
  );

  const concluidas = demandas.filter((d) => d.status === "Concluido").length;
  const atrasadas = demandas.filter((d) => d.status === "Atrasado").length;
  const total = demandas.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{total}</div><div className="text-xs text-muted-foreground">Demandas no período</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{concluidas}</div><div className="text-xs text-muted-foreground">Concluídas</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-destructive">{atrasadas}</div><div className="text-xs text-muted-foreground">Atrasadas</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{demandas.filter(d => d.prioridade === "Urgente").length}</div><div className="text-xs text-muted-foreground">Urgentes</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Gargalos por status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer><PieChart>
              <Pie data={porStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                {porStatus.map((e, i) => <Cell key={i} fill={e.cor} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Por categoria</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer><BarChart data={porCategoria}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Por responsável</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer><BarChart data={porResponsavel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="total" fill="hsl(var(--primary-glow))" radius={[0,4,4,0]} />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
