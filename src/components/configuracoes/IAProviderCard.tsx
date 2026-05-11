import { useEffect, useMemo, useState } from "react";
import { useIAConfig, type IAConfig, type IALog, type ModeloDisponivel } from "@/store/iaConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Power, RefreshCw, Settings2, Plug2, TrendingUp } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

const PROVIDERS_META: Record<string, { titulo: string; descricao: string }> = {
  gpt: {
    titulo: "OpenAI / GPT — Análise com IA",
    descricao:
      "Provedor conectado via chave própria da OpenAI (OPENAI_API_KEY) para gerar resumos, sugerir tarefas e produzir insights. Cobrança vai direto na sua conta da OpenAI.",
  },
  gemini: {
    titulo: "Google Gemini — Análise com IA",
    descricao:
      "Provedor conectado para gerar resumos, extrair tarefas e produzir insights. Executado via Lovable AI Gateway.",
  },
};

const PERIODOS = [
  { value: "hoje", label: "Hoje", days: 0 },
  { value: "ontem", label: "Ontem", days: -1 },
  { value: "3d", label: "3D", days: 3 },
  { value: "5d", label: "5D", days: 5 },
  { value: "7d", label: "7D", days: 7 },
  { value: "15d", label: "15D", days: 15 },
  { value: "30d", label: "30D", days: 30 },
  { value: "60d", label: "60D", days: 60 },
  { value: "90d", label: "90D", days: 90 },
] as const;

export function IAProviderCard({ provider }: { provider: "gpt" | "gemini" }) {
  const cfg = useIAConfig((s) => s.configs.find((c) => c.provider === provider));
  const logs = useIAConfig((s) => s.logs);
  const upsertConfig = useIAConfig((s) => s.upsertConfig);
  const testConnection = useIAConfig((s) => s.testConnection);
  const refreshModels = useIAConfig((s) => s.refreshModels);

  const [busy, setBusy] = useState(false);
  const [periodo, setPeriodo] = useState<typeof PERIODOS[number]["value"]>("15d");
  const meta = PROVIDERS_META[provider];

  const conectado = !!cfg?.ativo && !!cfg?.ultima_verificacao;
  const modelos: ModeloDisponivel[] = (cfg?.modelos_disponiveis as ModeloDisponivel[] | null) ?? [];

  // Inicializa config se não existir
  useEffect(() => {
    if (!cfg) {
      upsertConfig({ provider, model: null, ativo: false } as any);
    }
  }, [cfg, provider, upsertConfig]);

  const consumo = useMemo(() => buildConsumo(logs, provider, periodo), [logs, provider, periodo]);

  const toggleAtivo = async () => {
    setBusy(true);
    await upsertConfig({ provider, ativo: !cfg?.ativo } as any);
    setBusy(false);
  };

  const handleTest = async () => {
    setBusy(true);
    if (!cfg?.modelos_disponiveis || (cfg.modelos_disponiveis as any[]).length === 0) {
      await refreshModels(provider);
    }
    await testConnection(provider);
    setBusy(false);
  };

  const handleRefresh = async () => {
    setBusy(true);
    await refreshModels(provider);
    setBusy(false);
  };

  const handleDisconnect = async () => {
    setBusy(true);
    await upsertConfig({ provider, ativo: false } as any);
    setBusy(false);
  };

  const handleModelChange = async (id: string) => {
    setBusy(true);
    await upsertConfig({ provider, model: id } as any);
    setBusy(false);
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">{meta.titulo}</div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{meta.descricao}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className={cn("h-8 text-xs gap-1.5", cfg?.ativo ? "text-emerald-500" : "text-muted-foreground")}
            onClick={toggleAtivo}
            disabled={busy}
          >
            <Power className="h-3.5 w-3.5" />
            Insights I.A: {cfg?.ativo ? "Ativado" : "Desativado"}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={handleTest} disabled={busy}>
            <Plug2 className="h-3.5 w-3.5" /> Testar Conexão
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={handleRefresh} disabled={busy}>
            <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} /> Atualizar Configuração
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={handleDisconnect} disabled={busy || !cfg?.ativo}>
            <Settings2 className="h-3.5 w-3.5" /> Desconectar
          </Button>
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <span className={cn("h-2 w-2 rounded-full", conectado ? "bg-emerald-500" : "bg-muted-foreground/40")} />
          <div>
            <div className={cn("text-sm font-medium", conectado ? "text-foreground" : "text-muted-foreground")}>
              {conectado ? "Conectado" : "Desconectado"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {modelos.length} modelo{modelos.length === 1 ? "" : "s"} disponíve{modelos.length === 1 ? "l" : "is"}
              {cfg?.latency_ms ? ` · latência ${cfg.latency_ms}ms` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Modelo</span>
          <Select value={cfg?.model ?? ""} onValueChange={handleModelChange}>
            <SelectTrigger className="h-8 text-xs w-[280px]">
              <SelectValue placeholder="Selecione um modelo" />
            </SelectTrigger>
            <SelectContent>
              {modelos.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">Clique em "Atualizar Configuração"</div>}
              {modelos.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Consumo */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            Consumo · {PERIODOS.find((p) => p.value === periodo)?.label}
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold tabular-nums">${consumo.totalCusto.toFixed(4)}</div>
            <div className="text-[11px] text-muted-foreground">{consumo.totalChamadas} chamada{consumo.totalChamadas === 1 ? "" : "s"}</div>
          </div>
        </div>

        <div className="h-12">
          {consumo.serie.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={consumo.serie} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11, padding: "4px 8px" }}
                  labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  formatter={(v: any) => [`$${Number(v).toFixed(4)}`, "Custo"]}
                />
                <Line type="monotone" dataKey="custo" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center text-[11px] text-muted-foreground">Sem dados no período</div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-1.5">
          {PERIODOS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded transition-colors",
                periodo === p.value ? "bg-emerald-500/15 text-emerald-500 font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function buildConsumo(logs: IALog[], provider: string, periodo: string) {
  const conf = PERIODOS.find((p) => p.value === periodo)!;
  const now = new Date();
  let start: Date;
  let end: Date = now;
  if (conf.value === "hoje") {
    start = new Date(now); start.setHours(0, 0, 0, 0);
  } else if (conf.value === "ontem") {
    start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
    end = new Date(start); end.setHours(23, 59, 59, 999);
  } else {
    start = new Date(now); start.setDate(start.getDate() - conf.days); start.setHours(0, 0, 0, 0);
  }

  const providerPrefix = provider === "gpt" ? "openai/" : "google/";
  const filtrados = logs.filter((l) => {
    if (!l.modelo?.startsWith(providerPrefix)) return false;
    const d = new Date(l.created_at);
    return d >= start && d <= end;
  });

  // Agrupa por dia
  const buckets: Record<string, { custo: number; chamadas: number }> = {};
  for (const l of filtrados) {
    const k = new Date(l.created_at).toISOString().slice(0, 10);
    if (!buckets[k]) buckets[k] = { custo: 0, chamadas: 0 };
    buckets[k].custo += Number(l.custo ?? 0);
    buckets[k].chamadas += 1;
  }
  const serie = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)).map(([data, v]) => ({ data, custo: v.custo, chamadas: v.chamadas }));
  const totalCusto = filtrados.reduce((s, l) => s + Number(l.custo ?? 0), 0);
  const totalChamadas = filtrados.length;
  return { serie, totalCusto, totalChamadas };
}
