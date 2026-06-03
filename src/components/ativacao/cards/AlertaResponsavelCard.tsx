import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { useResponsavelAtual } from "@/hooks/useResponsavelAtual";
import { useCRM } from "@/store/crm";
import type { AtivacaoLinha } from "@/hooks/useOnboardingProgress";
import { canonicalStatus } from "@/lib/demandas-categorias";
import { useMemo } from "react";

interface Props {
  linhas: AtivacaoLinha[];
  onVerTarefas?: (responsavelId: string) => void;
  responsavelIdOverride?: string;
}

export function AlertaResponsavelCard({ linhas, onVerTarefas, responsavelIdOverride }: Props) {
  const navigate = useNavigate();
  const { responsavel: meuResponsavel, responsavelId: meuResponsavelId } = useResponsavelAtual();
  const responsaveis = useCRM((s) => s.responsaveis);

  const isFilteringAll = !responsavelIdOverride || responsavelIdOverride === "todos";
  const finalId = isFilteringAll ? null : responsavelIdOverride;

  const responsavel = finalId 
    ? (responsaveis.find(r => r.id === finalId) || { nome: "NÃO IDENTIFICADO" })
    : { nome: "TODOS OS RESPONSÁVEIS" };

  // Se não estiver filtrando um específico, usamos 'meuResponsavelId' apenas para as métricas individuais?
  // NÃO! O usuário quer que o card reflita o filtro. 
  // Se o filtro for 'todos', o card deve refletir o total das 'linhas' (que já estão filtradas por risco/status no pai).
  
  const targetId = finalId;

  const tarefasExibidas = useMemo(() => {
    return linhas.flatMap((l) =>
      l.demandas
        .filter((d) => {
          if (!targetId) return true; // Se for todos, pega todas as tarefas das linhas filtradas
          return (
            d.responsavel_id === targetId ||
            d.responsaveis_ids?.includes(targetId)
          );
        })
        .map((d) => ({ ...d, _cliente: l.cliente })),
    );
  }, [linhas, targetId]);

  const atrasadas = tarefasExibidas.filter((d) => canonicalStatus(d.status) === "Atrasado").length;
  const urgentes = tarefasExibidas.filter((d) => d.prioridade === "Urgente").length;

  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const vencendoHoje = tarefasExibidas.filter(
    (d) =>
      d.data_limite &&
      new Date(d.data_limite).getTime() >= Date.now() - 86_400_000 &&
      new Date(d.data_limite).getTime() <= hoje.getTime(),
  ).length;

  const criticos = linhas.filter((l) => {
    if (l.risco !== "Critico") return false;
    if (!targetId) return true;
    return (
      l.responsavelAtualId === targetId ||
      l.demandas.some(d => d.responsavel_id === targetId || d.responsaveis_ids?.includes(targetId))
    );
  }).length;

  const sugestaoTarefas = useMemo(() => {
    return [...tarefasExibidas]
      .filter(d => canonicalStatus(d.status) !== "Concluido")
      .sort((a, b) => {
        if (a.prioridade === "Urgente" && b.prioridade !== "Urgente") return -1;
        if (a.prioridade !== "Urgente" && b.prioridade === "Urgente") return 1;
        if (canonicalStatus(a.status) === "Atrasado" && canonicalStatus(b.status) !== "Atrasado") return -1;
        if (canonicalStatus(a.status) !== "Atrasado" && canonicalStatus(b.status) === "Atrasado") return 1;
        const dateA = a.data_limite ? new Date(a.data_limite).getTime() : Infinity;
        const dateB = b.data_limite ? new Date(b.data_limite).getTime() : Infinity;
        return dateA - dateB;
      })
      .slice(0, 3);
  }, [tarefasExibidas]);


  if (!responsavel) return null;

  return (
    <Card className="p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Alerta por Responsável (Onboarding)</div>
          <p className="text-[10px] uppercase text-muted-foreground mt-0.5">Resumo diário · Central de Ativação</p>
        </div>
        <div className="text-xs text-muted-foreground truncate uppercase">
          {finalId ? "Responsável:" : "Visão:"} <span className="font-semibold text-foreground">{responsavel?.nome}</span> {finalId ? "👋" : "📊"}

        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric icon={ShieldAlert} value={atrasadas} label="Tarefas atrasadas" danger={atrasadas > 0} />
        <Metric icon={AlertTriangle} value={urgentes} label="Tarefas urgentes" danger={urgentes > 0} />
        <Metric icon={Clock} value={vencendoHoje} label="Vencendo hoje" />
        <Metric icon={AlertTriangle} value={criticos} label={finalId ? "Críticos sob você" : "Total Críticos"} danger={criticos > 0} />
      </div>

      {sugestaoTarefas.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Sugestão de prioridade</div>
          <ol className="space-y-0.5 text-xs text-foreground">
            {sugestaoTarefas.map((d, idx) => (
              <li key={d.id} className="flex items-start gap-2 min-w-0">
                <span className="text-muted-foreground tabular-nums shrink-0">{idx + 1}.</span>
                <span className="flex-1 min-w-0 truncate">
                  <span className="font-medium">{d.titulo}</span>
                  <span className="text-muted-foreground"> — {d._cliente?.nome_cliente}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        className="w-full mt-3"
        onClick={() => (onVerTarefas && finalId ? onVerTarefas(finalId) : navigate("/minhas-tarefas"))}
      >
        Ver tarefas (Onboarding)
      </Button>
    </Card>
  );
}

function Metric({
  icon: Icon,
  value,
  label,
  danger,
}: {
  icon: typeof Users;
  value: number;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-2.5 py-2 flex items-center gap-2 min-w-0">
      <Icon className={`h-4 w-4 shrink-0 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
      <div className="min-w-0">
        <div className={`text-base font-semibold leading-none tabular-nums ${danger ? "text-destructive" : "text-foreground"}`}>
          {value}
        </div>
        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">{label}</div>
      </div>
    </div>
  );
}
