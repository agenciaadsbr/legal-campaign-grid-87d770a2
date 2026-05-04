import { useMemo, useState } from "react";
import { useCRM } from "@/store/crm";
import { useDemandas } from "@/store/demandas";
import { usePlanejamento } from "@/store/planejamento";
import { useDocumentacao } from "@/store/documentacao";
import { useAuth } from "@/hooks/useAuth";
import { useResponsavelAtual } from "@/hooks/useResponsavelAtual";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { PrioridadeIcons } from "@/components/tarefas/PrioridadeIcon";
import { PeriodoFiltro, type PeriodoValor } from "@/components/filters/PeriodoFiltro";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from "recharts";
import { AlertCircle, CheckCircle2, ListChecks, Zap } from "lucide-react";
import { buildUnifiedTasks, ordenarTarefas } from "@/lib/minhasTarefas";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

export function DashboardPorColaborador() {
  const { user } = useAuth();
  const { responsavelId: meuRespId } = useResponsavelAtual();

  const responsaveis = useCRM((s) => s.responsaveis);
  const clientes = useCRM((s) => s.clientes);
  const cards = useCRM((s) => s.cards);
  const demandas = useDemandas((s) => s.demandas);
  const planejamento = usePlanejamento((s) => s.itens);
  const documentacao = useDocumentacao((s) => s.itens);

  const [respId, setRespId] = useState<string | null>(meuRespId);
  const [periodo, setPeriodo] = useState<PeriodoValor>({ preset: "todos", inicio: null, fim: null });

  const idEfetivo = respId ?? meuRespId;

  const tarefas = useMemo(() => {
    if (!idEfetivo) return [];
    const all = buildUnifiedTasks({
      responsavelId: idEfetivo,
      authUserId: idEfetivo === meuRespId ? user?.id ?? null : null,
      demandas, cards, planejamento, documentacao, clientes,
    });
    const ini = periodo.inicio?.getTime() ?? null;
    const fim = periodo.fim?.getTime() ?? null;
    if (ini === null && fim === null) return all;
    return all.filter((t) => {
      if (!t.prazo) return false;
      const p = new Date(t.prazo).getTime();
      if (ini !== null && p < ini) return false;
      if (fim !== null && p > fim) return false;
      return true;
    });
  }, [idEfetivo, meuRespId, user?.id, demandas, cards, planejamento, documentacao, clientes, periodo]);

  const kpis = useMemo(() => {
    const total = tarefas.length;
    const pendentes = tarefas.filter((t) => t.status !== "concluido").length;
    const atrasadas = tarefas.filter((t) => t.status === "atrasado").length;
    const urgentes = tarefas.filter((t) => t.urgente && t.status !== "concluido").length;
    return { total, pendentes, atrasadas, urgentes };
  }, [tarefas]);

  const porArea = useMemo(() => {
    const m = new Map<string, number>();
    tarefas.forEach((t) => m.set(t.area, (m.get(t.area) ?? 0) + 1));
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [tarefas]);

  const top10 = useMemo(
    () => ordenarTarefas(tarefas.filter((t) => t.status !== "concluido")).slice(0, 10),
    [tarefas],
  );

  const cores = ["hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--status-revisar))", "hsl(var(--status-agendar))", "hsl(var(--status-postado))", "hsl(var(--destructive))", "hsl(var(--status-renovacao))"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={idEfetivo ?? ""} onValueChange={(v) => setRespId(v)}>
          <SelectTrigger className="h-9 w-[260px]">
            <SelectValue placeholder="Selecione um colaborador" />
          </SelectTrigger>
          <SelectContent>
            {responsaveis.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nome} {r.id === meuRespId && "(você)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <PeriodoFiltro value={periodo} onChange={setPeriodo} />
      </div>

      {!idEfetivo ? (
        <div className="rounded-md border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Selecione um colaborador para ver o painel.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard icon={ListChecks} label="Total" value={kpis.total} tone="primary" />
            <KpiCard icon={CheckCircle2} label="Pendentes" value={kpis.pendentes} tone="info" />
            <KpiCard icon={AlertCircle} label="Atrasadas" value={kpis.atrasadas}
              tone={kpis.atrasadas > 0 ? "destructive" : "default"} />
            <KpiCard icon={Zap} label="Urgentes" value={kpis.urgentes}
              tone={kpis.urgentes > 0 ? "destructive" : "default"} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Distribuição por área</CardTitle>
                <CardDescription>Tarefas atribuídas, por categoria</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {porArea.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Sem dados no período
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={porArea} layout="vertical" margin={{ left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={140}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" name="Tarefas" radius={[0, 6, 6, 0]}>
                        {porArea.map((_, i) => <Cell key={i} fill={cores[i % cores.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top 10 prioridades</CardTitle>
                <CardDescription>Ordenadas por urgência, atraso e prazo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
                {top10.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-8 text-center">Sem tarefas pendentes 🎉</div>
                ) : top10.map((t) => (
                  <div key={t.id} className="flex items-start gap-2 p-2 rounded hover:bg-accent/50">
                    <PrioridadeIcons task={t} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">{t.titulo}</div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {t.cliente_nome} · {t.area}
                        {t.prazo && ` · ${new Date(t.prazo).toLocaleDateString("pt-BR")}`}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
