import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useCRM } from "@/store/crm";
import { getResponsaveisIds, type Demanda } from "@/store/demandas";
import {
  CATEGORIAS, CATEGORIA_LABEL, PRIORIDADES, PRIORIDADE_COR, PRIORIDADE_LABEL,
  STATUS_DEMANDA, STATUS_DEMANDA_COR, STATUS_DEMANDA_LABEL, statusMatchesColuna,
} from "@/lib/demandas-categorias";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { AlertTriangle, CheckCircle2, ListTodo, Loader2, Percent, Zap } from "lucide-react";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

const CAT_PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--status-criar))",
  "hsl(var(--status-revisar))",
  "hsl(var(--status-agendar))",
  "hsl(var(--status-postado))",
  "hsl(var(--status-renovacao))",
  "hsl(var(--info))",
  "hsl(var(--primary-glow))",
];

interface Props {
  demandas: Demanda[];
}

export function RelatoriosDemandas({ demandas }: Props) {
  const { responsaveis } = useCRM();

  const porStatus = useMemo(
    () =>
      STATUS_DEMANDA.map((s) => ({
        name: STATUS_DEMANDA_LABEL[s],
        value: demandas.filter((d) => d.status === s).length,
        cor: STATUS_DEMANDA_COR[s],
      })),
    [demandas]
  );

  const porCategoria = useMemo(
    () =>
      CATEGORIAS.map((c, i) => ({
        name: CATEGORIA_LABEL[c],
        total: demandas.filter((d) => d.categoria === c).length,
        cor: CAT_PALETTE[i % CAT_PALETTE.length],
      })),
    [demandas]
  );

  const porResponsavel = useMemo(
    () =>
      responsaveis
        .map((r) => ({
          name: r.nome.split(" ")[0],
          total: demandas.filter((d) => getResponsaveisIds(d).includes(r.id)).length,
          cor: r.cor || "hsl(var(--primary))",
        }))
        .sort((a, b) => b.total - a.total),
    [responsaveis, demandas]
  );

  const porPrioridade = useMemo(
    () =>
      PRIORIDADES.map((p) => ({
        name: PRIORIDADE_LABEL[p],
        total: demandas.filter((d) => d.prioridade === p).length,
        cor: PRIORIDADE_COR[p],
      })),
    [demandas]
  );

  const total = demandas.length;
  const concluidas = demandas.filter((d) => d.status === "Concluido").length;
  const atrasadas = demandas.filter((d) => d.status === "Atrasado").length;
  const urgentes = demandas.filter((d) => d.prioridade === "Urgente").length;
  const emAndamento = demandas.filter((d) => d.status === "Criar" || d.status === "Revisar").length;
  const taxa = total ? Math.round((concluidas / total) * 100) : 0;
  const totalStatus = porStatus.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={ListTodo} label="Total" value={total} tone="primary" />
        <KpiCard icon={CheckCircle2} label="Concluídas" value={concluidas} tone="success" />
        <KpiCard icon={Loader2} label="Em andamento" value={emAndamento} tone="info" />
        <KpiCard icon={AlertTriangle} label="Atrasadas" value={atrasadas} tone="destructive" />
        <KpiCard icon={Zap} label="Urgentes" value={urgentes} tone="warning" />
        <KpiCard icon={Percent} label="Taxa conclusão" value={`${taxa}%`} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gargalos por status</CardTitle>
            <CardDescription>Onde estão concentradas as demandas</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={porStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {porStatus.map((e, i) => <Cell key={i} fill={e.cor} stroke="hsl(var(--card))" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [`${v} (${Math.round((Number(v) / totalStatus) * 100)}%)`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por categoria</CardTitle>
            <CardDescription>Volume por área de trabalho</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={porCategoria} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {porCategoria.map((e, i) => <Cell key={i} fill={e.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por responsável</CardTitle>
            <CardDescription>Carga distribuída entre o time</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={porResponsavel} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" name="Demandas" radius={[0, 6, 6, 0]}>
                  {porResponsavel.map((e, i) => <Cell key={i} fill={e.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por prioridade</CardTitle>
            <CardDescription>Pressão sobre o time</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={porPrioridade} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {porPrioridade.map((e, i) => <Cell key={i} fill={e.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
