import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { useResponsavelAtual } from "@/hooks/useResponsavelAtual";
import { useCRM } from "@/store/crm";
import type { AtivacaoLinha } from "@/hooks/useOnboardingProgress";
import { canonicalStatus } from "@/lib/demandas-categorias";

interface Props {
  linhas: AtivacaoLinha[];
  onVerTarefas?: (responsavelId: string) => void;
  responsavelIdOverride?: string;
}

export function AlertaResponsavelCard({ linhas, onVerTarefas, responsavelIdOverride }: Props) {
  const navigate = useNavigate();
  const { responsavel: meuResponsavel, responsavelId: meuResponsavelId } = useResponsavelAtual();
  const responsaveis = useCRM((s) => s.responsaveis);

  const finalId = responsavelIdOverride && responsavelIdOverride !== "todos" 
    ? responsavelIdOverride 
    : meuResponsavelId;

  const responsavel = responsaveis.find(r => r.id === finalId) || meuResponsavel;

  if (!finalId) return null;

  const minhas = linhas.filter(
    (l) =>
      l.responsavelAtualId === finalId ||
      l.demandas.some(
        (d) =>
          d.responsavel_id === finalId ||
          d.responsaveis_ids?.includes(finalId),
      ),
  );

  const tarefasMinhas = linhas.flatMap((l) =>
    l.demandas
      .filter(
        (d) =>
          (d.responsavel_id === finalId ||
            d.responsaveis_ids?.includes(finalId)),
      )
      .map((d) => ({ ...d, _cliente: l.cliente })),
  );

  const atrasadas = tarefasMinhas.filter((d) => canonicalStatus(d.status) === "Atrasado").length;
  const urgentes = tarefasMinhas.filter((d) => d.prioridade === "Urgente").length;

  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const vencendoHoje = tarefasMinhas.filter(
    (d) =>
      d.data_limite &&
      new Date(d.data_limite).getTime() >= Date.now() - 86_400_000 &&
      new Date(d.data_limite).getTime() <= hoje.getTime(),
  ).length;

  const criticos = minhas.filter((l) => l.risco === "Critico").length;

  // Sugestão de prioridade baseada em tarefas (conforme exemplo visual)
  const sugestaoTarefas = [...tarefasMinhas]
    .filter(d => canonicalStatus(d.status) !== "Concluido")
    .sort((a, b) => {
      // 1. Prioridade Urgente primeiro
      if (a.prioridade === "Urgente" && b.prioridade !== "Urgente") return -1;
      if (a.prioridade !== "Urgente" && b.prioridade === "Urgente") return 1;
      
      // 2. Atrasadas depois
      if (canonicalStatus(a.status) === "Atrasado" && canonicalStatus(b.status) !== "Atrasado") return -1;
      if (canonicalStatus(a.status) !== "Atrasado" && canonicalStatus(b.status) === "Atrasado") return 1;

      // 3. Deadline
      const dateA = a.data_limite ? new Date(a.data_limite).getTime() : Infinity;
      const dateB = b.data_limite ? new Date(b.data_limite).getTime() : Infinity;
      return dateA - dateB;
    })
    .slice(0, 3);

  return (
    <Card className="p-4 flex flex-col">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Alerta por Responsável (Onboarding)</div>
          <p className="text-[10px] uppercase text-muted-foreground mt-0.5">Resumo diário · Central de Ativação</p>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          Olá, <span className="font-semibold text-foreground">{responsavel?.nome ?? "você"}</span> 👋 — seu resumo do dia
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric icon={Users} value={aguardando} label="Aguardando suas tarefas" />
        <Metric icon={ShieldAlert} value={atrasadas} label="Tarefas atrasadas" />
        <Metric icon={Clock} value={vencendoHoje} label="Vencendo hoje" />
        <Metric icon={AlertTriangle} value={criticos} label="Críticos sob você" danger />
      </div>

      {prioridade.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase text-muted-foreground mb-1">Sugestão de prioridade</div>
          <ol className="space-y-0.5 text-xs text-foreground">
            {prioridade.map((l, idx) => (
              <li key={l.cliente.id} className="flex items-start gap-2 min-w-0">
                <span className="text-muted-foreground tabular-nums shrink-0">{idx + 1}.</span>
                <span className="flex-1 min-w-0 truncate">
                  <span className="font-medium">{l.cliente.nome_cliente}</span>
                  <span className="text-muted-foreground"> — {l.proximaAcao.titulo}</span>
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
        onClick={() => (onVerTarefas ? onVerTarefas(finalId) : navigate("/minhas-tarefas"))}
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
