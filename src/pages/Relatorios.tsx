import { useCRM } from "@/store/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RelatoriosDemandas } from "@/components/demandas/RelatoriosDemandas";

export default function Relatorios() {
  const { posts, responsaveis, cards } = useCRM();

  const porMes = useMemo(() => {
    const m = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const c = new Array(12).fill(0);
    posts.forEach((p) => c[new Date(p.created_at).getMonth()]++);
    return m.map((name, i) => ({ name, posts: c[i] }));
  }, [posts]);

  const carga = useMemo(
    () => responsaveis.map((r) => ({ name: r.nome.split(" ")[0], cards: cards.filter((c) => c.responsaveis.includes(r.id)).length, cor: r.cor })),
    [responsaveis, cards]
  );

  const funil = useMemo(() => {
    const order = ["Criar", "Revisar", "Agendar", "Postado", "Renovação"] as const;
    return order.map((s) => ({ name: s, value: cards.filter((c) => c.status_card === s).length }));
  }, [cards]);

  const cores = ["hsl(var(--status-criar))","hsl(var(--status-revisar))","hsl(var(--status-agendar))","hsl(var(--status-postado))","hsl(var(--status-renovacao))"];

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Visão analítica do CRM</p>
      </div>
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="demandas">Demandas</TabsTrigger>
        </TabsList>
        <TabsContent value="posts" className="mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Posts por mês</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer><BarChart data={porMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="posts" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Carga por responsável</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer><BarChart data={carga} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="cards" fill="hsl(var(--primary-glow))" radius={[0,4,4,0]} />
            </BarChart></ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Funil de status</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer><PieChart>
              <Pie data={funil} dataKey="value" nameKey="name" outerRadius={100} label>
                {funil.map((_, i) => <Cell key={i} fill={cores[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend />
            </PieChart></ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
        </TabsContent>
        <TabsContent value="demandas" className="mt-4">
          <RelatoriosDemandas />
        </TabsContent>
      </Tabs>
    </div>
  );
}
