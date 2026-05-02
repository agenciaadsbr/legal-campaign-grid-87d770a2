import { useMemo, useState } from "react";
import { useCRM } from "@/store/crm";
import { useDemandas, getResponsaveisIds } from "@/store/demandas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, BarChart3, Briefcase, CalendarDays, CheckCircle2, Download, FileText,
  ListChecks, PauseCircle, Sparkles, TrendingUp, Users,
} from "lucide-react";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { RelatoriosPosts } from "@/components/relatorios/RelatoriosPosts";
import { RelatoriosDemandas } from "@/components/demandas/RelatoriosDemandas";

type RangeKey = "7d" | "30d" | "90d" | "year" | "all";
const RANGE_LABEL: Record<RangeKey, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  year: "Ano corrente",
  all: "Tudo",
};

function rangeStart(range: RangeKey): Date | null {
  const now = new Date();
  if (range === "all") return null;
  if (range === "year") return new Date(now.getFullYear(), 0, 1);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

const STATUS_GLOBAL_COLOR: Record<string, string> = {
  Onboarding: "hsl(var(--status-criar))",
  Ativo: "hsl(var(--status-postado))",
  Pausado: "hsl(var(--status-renovacao))",
  Encerrado: "hsl(var(--muted-foreground))",
};

export default function Relatorios() {
  const { posts, cards, clientes, responsaveis } = useCRM();
  const demandas = useDemandas((s) => s.demandas);

  const [range, setRange] = useState<RangeKey>("30d");
  const [respFilter, setRespFilter] = useState<string>("all");

  const start = useMemo(() => rangeStart(range), [range]);

  // ---------- Datasets filtrados ----------
  const fCards = useMemo(() => {
    return cards.filter((c) => {
      const d = new Date(c.created_at);
      if (start && d < start) return false;
      if (respFilter !== "all" && !c.responsaveis.includes(respFilter)) return false;
      return true;
    });
  }, [cards, start, respFilter]);

  const fPosts = useMemo(() => {
    if (!start) return posts;
    return posts.filter((p) => new Date(p.created_at) >= start);
  }, [posts, start]);

  const fDemandas = useMemo(() => {
    return demandas.filter((d) => {
      const dt = new Date(d.created_at);
      if (start && dt < start) return false;
      if (respFilter !== "all" && !getResponsaveisIds(d).includes(respFilter)) return false;
      return true;
    });
  }, [demandas, start, respFilter]);

  // ---------- KPIs Visão Geral ----------
  const kpiTotalPosts = fCards.length;
  const kpiPostados = fCards.filter((c) => c.status_card === "Postado").length;
  const kpiPendentes = fCards.filter((c) =>
    ["Criar", "Revisar", "Agendar"].includes(String(c.status_card))
  ).length;
  const kpiDemandas = fDemandas.length;
  const kpiConcluidas = fDemandas.filter((d) => d.status === "Concluido").length;
  const kpiAtrasadas = fDemandas.filter((d) => d.status === "Atrasado").length;

  // ---------- Charts Visão Geral ----------
  const atividade30 = useMemo(() => {
    const dias = 30;
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const out: { name: string; posts: number; demandas: number }[] = [];
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      out.push({
        name: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        posts: posts.filter((p) => {
          const pd = new Date(p.created_at);
          return pd >= d && pd < next;
        }).length,
        demandas: demandas.filter((dem) => {
          if (dem.status !== "Concluido" || !dem.data_conclusao) return false;
          const dd = new Date(dem.data_conclusao);
          return dd >= d && dd < next;
        }).length,
      });
    }
    return out;
  }, [posts, demandas]);

  const statusClientes = useMemo(() => {
    const order = ["Onboarding", "Ativo", "Pausado", "Encerrado"] as const;
    return order.map((s) => ({
      name: s,
      value: clientes.filter((c) => c.status_global === s).length,
      cor: STATUS_GLOBAL_COLOR[s],
    }));
  }, [clientes]);

  const topResp = useMemo(() => {
    return responsaveis
      .map((r) => ({
        name: r.nome.split(" ")[0],
        cards: cards.filter((c) => c.responsaveis.includes(r.id)).length,
        demandas: demandas.filter((d) => getResponsaveisIds(d).includes(r.id)).length,
        cor: r.cor || "hsl(var(--primary))",
      }))
      .map((r) => ({ ...r, total: r.cards + r.demandas }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [responsaveis, cards, demandas]);

  const postsAno = useMemo(() => {
    const m = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const arr = new Array(12).fill(0);
    posts.forEach((p) => arr[new Date(p.created_at).getMonth()]++);
    return m.map((name, i) => ({ name, posts: arr[i] }));
  }, [posts]);

  // ---------- Charts Clientes ----------
  const porNicho = useMemo(() => {
    const map = new Map<string, number>();
    clientes.forEach((c) => {
      const n = (c.nicho || "Sem nicho").trim() || "Sem nicho";
      map.set(n, (map.get(n) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [clientes]);

  const cargaClientes = useMemo(
    () =>
      responsaveis
        .map((r) => ({
          name: r.nome.split(" ")[0],
          total: clientes.filter((c) => c.responsaveis?.includes(r.id)).length,
          cor: r.cor || "hsl(var(--primary))",
        }))
        .sort((a, b) => b.total - a.total),
    [responsaveis, clientes]
  );

  const kpiClientes = clientes.length;
  const kpiAtivos = clientes.filter((c) => c.status_global === "Ativo").length;
  const kpiOnboarding = clientes.filter((c) => c.status_global === "Onboarding").length;
  const kpiPausados = clientes.filter((c) => c.status_global === "Pausado").length;

  // ---------- Export CSV ----------
  function exportCsv(rows: Record<string, any>[], filename: string) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: any) => {
      const s = String(v ?? "");
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(";"),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(";")),
    ].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    exportCsv(
      [
        { metrica: "Período", valor: RANGE_LABEL[range] },
        { metrica: "Posts (cards)", valor: kpiTotalPosts },
        { metrica: "Postados", valor: kpiPostados },
        { metrica: "Pendentes", valor: kpiPendentes },
        { metrica: "Demandas", valor: kpiDemandas },
        { metrica: "Concluídas", valor: kpiConcluidas },
        { metrica: "Atrasadas", valor: kpiAtrasadas },
        { metrica: "Clientes ativos", valor: kpiAtivos },
        { metrica: "Clientes em onboarding", valor: kpiOnboarding },
      ],
      `relatorio-dash-tasks-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  return (
    <div className="animate-fade-in space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão analítica do Dash Tasks · {RANGE_LABEL[range]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[180px]">
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
                <SelectItem key={k} value={k}>{RANGE_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={respFilter} onValueChange={setRespFilter}>
            <SelectTrigger className="w-[200px]">
              <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {responsaveis.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview"><Sparkles className="mr-1.5 h-4 w-4" />Visão Geral</TabsTrigger>
          <TabsTrigger value="posts"><FileText className="mr-1.5 h-4 w-4" />Posts</TabsTrigger>
          <TabsTrigger value="demandas"><ListChecks className="mr-1.5 h-4 w-4" />Demandas</TabsTrigger>
          <TabsTrigger value="clientes"><Briefcase className="mr-1.5 h-4 w-4" />Clientes</TabsTrigger>
        </TabsList>

        {/* ===================== Visão Geral ===================== */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard icon={FileText} label="Posts (período)" value={kpiTotalPosts} tone="primary" />
            <KpiCard icon={CheckCircle2} label="Postados" value={kpiPostados} tone="success" />
            <KpiCard icon={TrendingUp} label="Pendentes" value={kpiPendentes} tone="info" />
            <KpiCard icon={ListChecks} label="Demandas" value={kpiDemandas} tone="primary" />
            <KpiCard icon={CheckCircle2} label="Concluídas" value={kpiConcluidas} tone="success" />
            <KpiCard icon={PauseCircle} label="Atrasadas" value={kpiAtrasadas} tone="destructive" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Atividade — últimos 30 dias</CardTitle>
                </div>
                <CardDescription>Posts criados vs demandas concluídas</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <AreaChart data={atividade30} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gPosts" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gDem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--status-postado))" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(var(--status-postado))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} interval={Math.floor(atividade30.length / 8)} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="posts" name="Posts criados" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gPosts)" />
                    <Area type="monotone" dataKey="demandas" name="Demandas concluídas" stroke="hsl(var(--status-postado))" strokeWidth={2} fill="url(#gDem)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status dos clientes</CardTitle>
                <CardDescription>Distribuição global do portfólio</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusClientes} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {statusClientes.map((e, i) => <Cell key={i} fill={e.cor} stroke="hsl(var(--card))" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top 5 responsáveis</CardTitle>
                <CardDescription>Carga combinada (posts + demandas)</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <BarChart data={topResp} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="cards" name="Posts" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="demandas" name="Demandas" stackId="a" fill="hsl(var(--primary-glow))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Posts por mês — ano corrente</CardTitle>
                <CardDescription>Volume mensal acumulado</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <BarChart data={postsAno} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="posts" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== Posts ===================== */}
        <TabsContent value="posts" className="mt-4">
          <RelatoriosPosts cards={fCards} posts={fPosts} />
        </TabsContent>

        {/* ===================== Demandas ===================== */}
        <TabsContent value="demandas" className="mt-4">
          <RelatoriosDemandas demandas={fDemandas} />
        </TabsContent>

        {/* ===================== Clientes ===================== */}
        <TabsContent value="clientes" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard icon={Briefcase} label="Total" value={kpiClientes} tone="primary" />
            <KpiCard icon={CheckCircle2} label="Ativos" value={kpiAtivos} tone="success" />
            <KpiCard icon={Sparkles} label="Onboarding" value={kpiOnboarding} tone="info" />
            <KpiCard icon={PauseCircle} label="Pausados" value={kpiPausados} tone="warning" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status global</CardTitle>
                <CardDescription>Onde está cada cliente no ciclo de vida</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={statusClientes} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {statusClientes.map((e, i) => <Cell key={i} fill={e.cor} stroke="hsl(var(--card))" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-7">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top nichos</CardTitle>
                <CardDescription>Distribuição por segmento</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <BarChart data={porNicho} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="total" name="Clientes" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-12">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Carga de clientes por responsável</CardTitle>
                <CardDescription>Quantos clientes cada pessoa atende</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <BarChart data={cargaClientes} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="total" name="Clientes" radius={[6, 6, 0, 0]}>
                      {cargaClientes.map((e, i) => <Cell key={i} fill={e.cor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
