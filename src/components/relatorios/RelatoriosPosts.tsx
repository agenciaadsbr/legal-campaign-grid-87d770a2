import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useCRM, type Card as CardType, type Post } from "@/store/crm";
import { KpiCard } from "./KpiCard";
import { Activity, CalendarClock, CheckCircle2, FileText, PenLine, RefreshCcw, Search } from "lucide-react";

const STATUS_ORDER = ["Criar", "Revisar", "Agendar", "Postado", "Renovação"] as const;
const STATUS_COLOR: Record<string, string> = {
  Criar: "hsl(var(--status-criar))",
  Revisar: "hsl(var(--status-revisar))",
  Agendar: "hsl(var(--status-agendar))",
  Postado: "hsl(var(--status-postado))",
  Renovação: "hsl(var(--status-renovacao))",
};

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

interface Props {
  cards: CardType[];
  posts: Post[];
}

export function RelatoriosPosts({ cards, posts }: Props) {
  const { responsaveis } = useCRM();

  const counts = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const byStatus: Record<string, number> = {};
    STATUS_ORDER.forEach((s) => {
      byStatus[s] = cards.filter((c) => {
        if (c.status_card !== s) return false;
        if (s === "Postado") {
          const dp = (c as any).data_postagem as string | null | undefined;
          if (!dp) return false;
          return dp.slice(0, 10) <= todayKey;
        }
        return true;
      }).length;
    });
    return { total: cards.length, ...byStatus } as Record<string, number> & { total: number };
  }, [cards]);

  // Mapeia card_id -> melhor data (postagem > agendamento > inicio > limite > agendada)
  const cardDateMap = useMemo(() => {
    const m = new Map<string, Date>();
    const postsByCard = new Map<string, Post[]>();
    posts.forEach((p) => {
      const arr = postsByCard.get(p.card_id) ?? [];
      arr.push(p);
      postsByCard.set(p.card_id, arr);
    });
    cards.forEach((c) => {
      const ps = postsByCard.get(c.id) ?? [];
      const candidates = [
        (c as any).data_postagem,
        ...ps.map((p) => p.data_postagem),
        ...ps.map((p) => p.data_agendamento),
        c.data_inicio_tarefa,
        c.data_agendada,
        c.data_limite_tarefa,
      ];
      for (const v of candidates) {
        if (v) { m.set(c.id, new Date(v)); break; }
      }
    });
    return m;
  }, [cards, posts]);

  const porMes = useMemo(() => {
    const m = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const year = new Date().getFullYear();
    const arr = new Array(12).fill(0);
    cards.forEach((c) => {
      const dt = cardDateMap.get(c.id);
      if (!dt || dt.getFullYear() !== year) return;
      arr[dt.getMonth()]++;
    });
    return m.map((name, i) => ({ name, posts: arr[i] }));
  }, [cards, cardDateMap]);

  const funil = useMemo(
    () => STATUS_ORDER.map((s) => ({ name: s, value: counts[s] || 0, cor: STATUS_COLOR[s] })),
    [counts]
  );

  const carga = useMemo(
    () =>
      responsaveis
        .map((r) => ({
          name: r.nome.split(" ")[0],
          cards: cards.filter((c) => c.responsaveis.includes(r.id)).length,
          cor: r.cor || "hsl(var(--primary))",
        }))
        .sort((a, b) => b.cards - a.cards),
    [responsaveis, cards]
  );

  const stacked = useMemo(() => {
    const m = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    const months: { y: number; idx: number; name: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ y: d.getFullYear(), idx: d.getMonth(), name: m[d.getMonth()] });
    }
    return months.map(({ y, idx, name }) => {
      const row: any = { name };
      STATUS_ORDER.forEach((s) => {
        row[s] = cards.filter((c) => {
          if (c.status_card !== s) return false;
          const dt = cardDateMap.get(c.id);
          return !!dt && dt.getFullYear() === y && dt.getMonth() === idx;
        }).length;
      });
      return row;
    });
  }, [cards, cardDateMap]);

  const totalFunil = funil.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={FileText} label="Total" value={counts.total} tone="primary" />
        <KpiCard icon={CheckCircle2} label="Postados" value={counts.Postado || 0} tone="success" />
        <KpiCard icon={PenLine} label="Em criação" value={counts.Criar || 0} />
        <KpiCard icon={Search} label="Aguardando aprovação do cliente" value={counts.Revisar || 0} tone="info" />
        <KpiCard icon={CalendarClock} label="Agendados" value={counts.Agendar || 0} tone="warning" />
        <KpiCard icon={RefreshCcw} label="Renovação" value={counts["Renovação"] || 0} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Posts por mês</CardTitle>
            </div>
            <CardDescription>Volume de posts criados ao longo do ano corrente</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <AreaChart data={porMes} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="postsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="posts" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#postsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funil de status</CardTitle>
            <CardDescription>Distribuição percentual</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={funil} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {funil.map((e, i) => <Cell key={i} fill={e.cor} stroke="hsl(var(--card))" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [`${v} (${Math.round((Number(v) / totalFunil) * 100)}%)`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Carga por responsável</CardTitle>
            <CardDescription>Posts atribuídos por pessoa</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={carga} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="cards" name="Posts" radius={[0, 6, 6, 0]}>
                  {carga.map((e, i) => <Cell key={i} fill={e.cor} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status × mês</CardTitle>
            <CardDescription>Últimos 6 meses, empilhado por status</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={stacked} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {STATUS_ORDER.map((s) => (
                  <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLOR[s]} radius={[0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
