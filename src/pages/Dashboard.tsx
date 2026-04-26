import { useCRM } from "@/store/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Calendar, CheckCircle2, RefreshCw, Bell } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { useMemo } from "react";
import { DashboardDemandasSection } from "@/components/demandas/DashboardDemandasSection";

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent: string }) {
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

export default function Dashboard() {
  const { clientes, posts, alertas, cards, responsaveis } = useCRM();

  const today = new Date().toISOString().slice(0, 10);
  const ativos = clientes.filter((c) => c.status_cliente === "Ativo").length;
  const postsHoje = posts.filter((p) => p.created_at.slice(0, 10) === today).length;
  const agendados = posts.filter((p) => p.status === "Agendar").length;
  const postados = posts.filter((p) => p.status === "Postado").length;
  const renovacao = clientes.filter((c) => c.status_cliente === "Próximo da renovação").length;
  const alertasPendentes = alertas.filter((a) => a.status === "Pendente").length;

  const postsPorMes = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const counts = new Array(12).fill(0);
    posts.forEach((p) => {
      const m = new Date(p.created_at).getMonth();
      counts[m]++;
    });
    return months.map((name, i) => ({ name, posts: counts[i] }));
  }, [posts]);

  const cargaPorResp = useMemo(() => {
    return responsaveis.map((r) => ({
      name: r.nome.split(" ")[0],
      cards: cards.filter((c) => c.responsaveis.includes(r.id)).length,
      cor: r.cor,
    }));
  }, [responsaveis, cards]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do CRM Jurídico</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Clientes ativos" value={ativos} icon={Users} accent="hsl(var(--primary))" />
        <Kpi label="Posts hoje" value={postsHoje} icon={FileText} accent="hsl(var(--info))" />
        <Kpi label="Agendados" value={agendados} icon={Calendar} accent="hsl(var(--status-agendar))" />
        <Kpi label="Postados" value={postados} icon={CheckCircle2} accent="hsl(var(--status-postado))" />
        <Kpi label="Renovação" value={renovacao} icon={RefreshCw} accent="hsl(var(--status-renovacao))" />
        <Kpi label="Alertas" value={alertasPendentes} icon={Bell} accent="hsl(var(--destructive))" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Posts por mês</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={postsPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--popover-foreground))" }} />
                <Bar dataKey="posts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Carga por responsável</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cargaPorResp}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--popover-foreground))" }} />
                <Legend />
                <Bar dataKey="cards" name="Cards atribuídos" fill="hsl(var(--primary-glow))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <DashboardDemandasSection />
    </div>
  );
}
