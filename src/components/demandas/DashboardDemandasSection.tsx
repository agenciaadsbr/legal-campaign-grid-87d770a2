import { Card, CardContent } from "@/components/ui/card";
import { useDemandas, useDemandasBootstrap } from "@/store/demandas";
import { ListChecks, AlertTriangle, Clock, RefreshCcw, CheckCircle2, Lock, Timer } from "lucide-react";
import { useMemo } from "react";
import { isAguardandoDependencia } from "@/lib/workflow";

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}20`, color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatHoras(horas: number): string {
  if (!Number.isFinite(horas) || horas <= 0) return "—";
  if (horas < 1) {
    const min = Math.round(horas * 60);
    return `${min}min`;
  }
  if (horas < 24) return `${Math.round(horas)}h`;
  const dias = Math.floor(horas / 24);
  const restoH = Math.round(horas - dias * 24);
  return restoH > 0 ? `${dias}d ${restoH}h` : `${dias}d`;
}

export function DashboardDemandasSection() {
  useDemandasBootstrap();
  const demandas = useDemandas((s) => s.demandas);
  const dependencies = useDemandas((s) => s.dependencies);

  const kpis = useMemo(() => {
    const hojeIni = new Date(); hojeIni.setHours(0, 0, 0, 0);
    const abertas = demandas.filter((d) => d.status !== "Concluido").length;
    const urgentes = demandas.filter((d) => d.prioridade === "Urgente" && d.status !== "Concluido").length;
    const atrasadas = demandas.filter((d) => d.status === "Atrasado").length;
    const emRevisao = demandas.filter((d) => d.status === "Revisar").length;
    const concluidasHoje = demandas.filter(
      (d) => d.status === "Concluido" && d.data_conclusao && new Date(d.data_conclusao) >= hojeIni
    ).length;

    const bloqueadas = demandas.filter(
      (d) => d.status !== "Concluido" && isAguardandoDependencia(d.id, dependencies)
    ).length;

    const liberadas = dependencies.filter((d) => d.liberado && d.liberado_em);
    let tempoMedio = "—";
    if (liberadas.length > 0) {
      const somaMs = liberadas.reduce((acc, d) => {
        const ini = new Date(d.created_at).getTime();
        const fim = new Date(d.liberado_em as string).getTime();
        return acc + Math.max(0, fim - ini);
      }, 0);
      tempoMedio = formatHoras(somaMs / liberadas.length / 3_600_000);
    }

    return { abertas, urgentes, atrasadas, emRevisao, concluidasHoje, bloqueadas, tempoMedio };
  }, [demandas, dependencies]);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Demandas Diárias</h2>
        <p className="text-xs text-muted-foreground">Visão rápida das tarefas internas — separado dos posts</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <Kpi label="Abertas" value={kpis.abertas} icon={ListChecks} accent="hsl(var(--primary))" />
        <Kpi label="Urgentes" value={kpis.urgentes} icon={AlertTriangle} accent="hsl(var(--destructive))" />
        <Kpi label="Atrasadas" value={kpis.atrasadas} icon={Clock} accent="hsl(var(--destructive))" />
        <Kpi label="Aguardando aprovação do cliente" value={kpis.emRevisao} icon={RefreshCcw} accent="hsl(var(--status-revisar))" />
        <Kpi label="Concluídas hoje" value={kpis.concluidasHoje} icon={CheckCircle2} accent="hsl(var(--status-postado))" />
        <Kpi label="Bloqueadas" value={kpis.bloqueadas} icon={Lock} accent="hsl(38 92% 50%)" />
        <Kpi label="Tempo médio liberação" value={kpis.tempoMedio} icon={Timer} accent="hsl(var(--info))" />
      </div>
    </section>
  );
}
