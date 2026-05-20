import { useMemo } from "react";
import { useCRM } from "@/store/crm";
import { useDemandas, useDemandasBootstrap, getResponsaveisIds } from "@/store/demandas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, Bell, Calendar, CheckCircle2, Clock, FileText, ListChecks,
  Pause, PenLine, RefreshCcw, RefreshCw, Search, Sparkles, UserCheck, Users,
} from "lucide-react";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { StatusClientesDonut } from "@/components/dashboard/StatusClientesDonut";
import { DemandasStackedBar } from "@/components/dashboard/DemandasStackedBar";
import { ProximosPrazosCard } from "@/components/dashboard/ProximosPrazosCard";
import { AlertasRecentesCard } from "@/components/dashboard/AlertasRecentesCard";
import { RenovacoesCard } from "@/components/dashboard/RenovacoesCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardPorColaborador } from "@/components/dashboard/DashboardPorColaborador";

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

export default function Dashboard() {
  useDemandasBootstrap();
  const { clientes: clientesAll, posts, alertas, cards, responsaveis } = useCRM();
  const clientes = useMemo(() => clientesAll.filter((c) => !c.oculto), [clientesAll]);
  const demandas = useDemandas((s) => s.demandas);

  const today = new Date().toISOString().slice(0, 10);

  // ---------- Clientes ----------
  const clientesKpis = useMemo(() => {
    const total = clientes.length;
    const onboarding = clientes.filter((c) => (c.status_global ?? "Onboarding") === "Onboarding").length;
    const ativos = clientes.filter((c) => (c.status_global ?? "Onboarding") === "Ativo").length;
    const pausados = clientes.filter((c) => (c.status_global ?? "Onboarding") === "Pausado").length;
    const renovacao = clientes.filter((c) => {
      if (!c.prazo_onboarding) return false;
      const dias = Math.ceil((new Date(c.prazo_onboarding).getTime() - Date.now()) / 86400000);
      return dias >= 0 && dias <= 7;
    }).length;
    const pctAtivos = total > 0 ? Math.round((ativos / total) * 100) : 0;
    return { total, onboarding, ativos, pausados, renovacao, pctAtivos };
  }, [clientes]);

  // ---------- Posts ----------
  const postsKpis = useMemo(() => {
    const totalCards = cards.length;
    const criar = cards.filter((c) => c.status_card === "Criar").length;
    const revisar = cards.filter((c) => c.status_card === "Revisar").length;
    const agendar = cards.filter((c) => c.status_card === "Agendar").length;
    const postados = cards.filter((c) => c.status_card === "Postado").length;
    const postsHoje = posts.filter((p) => p.created_at.slice(0, 10) === today).length;
    return { totalCards, criar, revisar, agendar, postados, postsHoje };
  }, [cards, posts, today]);

  // ---------- Demandas ----------
  const demandasKpis = useMemo(() => {
    const hojeIni = new Date(); hojeIni.setHours(0, 0, 0, 0);
    const abertas = demandas.filter((d) => d.status !== "Concluido").length;
    const urgentes = demandas.filter((d) => d.prioridade === "Urgente" && d.status !== "Concluido").length;
    const atrasadas = demandas.filter((d) => d.status === "Atrasado").length;
    const emRevisao = demandas.filter((d) => d.status === "Revisar").length;
    const concluidasHoje = demandas.filter(
      (d) => d.status === "Concluido" && d.data_conclusao && new Date(d.data_conclusao) >= hojeIni
    ).length;
    return { abertas, urgentes, atrasadas, emRevisao, concluidasHoje };
  }, [demandas]);

  // ---------- Posts por mês (últimos 12) ----------
  const postsPorMes = useMemo(() => {
    const m = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    const buckets: { name: string; posts: number; key: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      buckets.push({ name: m[d.getMonth()], posts: 0, key });
    }
    posts.forEach((p) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const b = buckets.find((x) => x.key === key);
      if (b) b.posts++;
    });
    return buckets;
  }, [posts]);

  // ---------- Carga por responsável ----------
  const cargaPosts = useMemo(
    () =>
      responsaveis
        .map((r) => ({
          name: r.nome.split(" ")[0],
          cards: cards.filter((c) => c.responsaveis.includes(r.id)).length,
          cor: r.cor || "hsl(var(--primary))",
        }))
        .filter((x) => x.cards > 0)
        .sort((a, b) => b.cards - a.cards),
    [responsaveis, cards]
  );

  const cargaDemandas = useMemo(
    () =>
      responsaveis
        .map((r) => ({
          name: r.nome.split(" ")[0],
          demandas: demandas.filter((d) => getResponsaveisIds(d).includes(r.id)).length,
          cor: r.cor || "hsl(var(--primary))",
        }))
        .filter((x) => x.demandas > 0)
        .sort((a, b) => b.demandas - a.demandas),
    [responsaveis, demandas]
  );

  return (
    <div className="px-5 py-4 space-y-3 animate-fade-in">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight leading-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Visão geral em tempo real do Dash Tasks
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          Atualizado em {new Date().toLocaleString("pt-BR")}
        </div>
      </header>

      <Tabs defaultValue="geral" className="space-y-3">
        <TabsList className="h-8">
          <TabsTrigger value="geral" className="text-xs h-7">Visão Geral</TabsTrigger>
          <TabsTrigger value="colaborador" className="text-xs h-7">Por Colaborador</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4 mt-2">
      {/* SEÇÃO 1 — Clientes */}
      <section className="space-y-3">
        <SectionHeader title="Clientes" subtitle="Visão geral da base" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard compact icon={Users} label="Total" value={clientesKpis.total} tone="primary" />
          <KpiCard compact icon={Sparkles} label="Em onboarding" value={clientesKpis.onboarding} tone="info" />
          <KpiCard compact icon={UserCheck} label="Ativos" value={clientesKpis.ativos} tone="success" />
          <KpiCard compact icon={Pause} label="Pausados" value={clientesKpis.pausados} tone="warning" />
          <KpiCard compact icon={RefreshCw} label="Renovação ≤ 7d" value={clientesKpis.renovacao}
            tone={clientesKpis.renovacao > 0 ? "warning" : "default"} />
        </div>
      </section>

      {/* SEÇÃO 2 — Posts */}
      <section className="space-y-3">
        <SectionHeader title="Conteúdo & Posts" subtitle="Pipeline editorial" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard compact icon={FileText} label="Total cards" value={postsKpis.totalCards} tone="primary" />
          <KpiCard compact icon={PenLine} label="Em criação" value={postsKpis.criar} />
          <KpiCard compact icon={Search} label="Aguardando aprovação do cliente" value={postsKpis.revisar} tone="info" />
          <KpiCard compact icon={Calendar} label="Agendados" value={postsKpis.agendar} tone="warning" />
          <KpiCard compact icon={CheckCircle2} label="Postados" value={postsKpis.postados} tone="success" />
        </div>
      </section>

      {/* SEÇÃO 3 — Demandas */}
      <section className="space-y-3">
        <SectionHeader title="Demandas internas" subtitle="Tarefas operacionais do time" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard compact icon={ListChecks} label="Abertas" value={demandasKpis.abertas} tone="primary" />
          <KpiCard compact icon={AlertTriangle} label="Urgentes" value={demandasKpis.urgentes}
            tone={demandasKpis.urgentes > 0 ? "destructive" : "default"} />
          <KpiCard compact icon={Clock} label="Atrasadas" value={demandasKpis.atrasadas}
            tone={demandasKpis.atrasadas > 0 ? "destructive" : "default"} />
          <KpiCard compact icon={RefreshCcw} label="Em revisão" value={demandasKpis.emRevisao} tone="info" />
          <KpiCard compact icon={CheckCircle2} label="Concluídas hoje" value={demandasKpis.concluidasHoje} tone="success" />
        </div>
      </section>

      {/* SEÇÃO 4 — Gráficos */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm">Posts por mês</CardTitle>
            <CardDescription className="text-xs">Volume de posts criados nos últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 h-56">
            <ResponsiveContainer>
              <AreaChart data={postsPorMes} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashPostsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="posts" stroke="hsl(var(--primary))" strokeWidth={2}
                  fill="url(#dashPostsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="lg:col-span-4">
          <StatusClientesDonut clientes={clientes} />
        </div>

        <Card className="lg:col-span-6">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm">Carga por responsável — Posts</CardTitle>
            <CardDescription className="text-xs">Cards atribuídos por pessoa</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 h-56">
            {cargaPosts.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={cargaPosts} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={80}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="cards" name="Posts" radius={[0, 6, 6, 0]}>
                    {cargaPosts.map((e, i) => <Cell key={i} fill={e.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm">Carga por responsável — Demandas</CardTitle>
            <CardDescription className="text-xs">Demandas internas atribuídas por pessoa</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 h-56">
            {cargaDemandas.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={cargaDemandas} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={80}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="demandas" name="Demandas" radius={[0, 6, 6, 0]}>
                    {cargaDemandas.map((e, i) => <Cell key={i} fill={e.cor} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-7">
          <DemandasStackedBar demandas={demandas} />
        </div>

        <div className="lg:col-span-5">
          <ProximosPrazosCard demandas={demandas} clientes={clientes} />
        </div>
      </section>

      {/* SEÇÃO 5 — Atividade */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <AlertasRecentesCard alertas={alertas} clientes={clientes} />
        <RenovacoesCard clientes={clientes} />
      </section>
        </TabsContent>

        <TabsContent value="colaborador" className="mt-2">
          <DashboardPorColaborador />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {subtitle && <span className="text-xs text-muted-foreground">— {subtitle}</span>}
    </div>
  );
}
