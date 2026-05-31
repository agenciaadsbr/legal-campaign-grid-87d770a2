import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { useResponsavelAtual } from "@/hooks/useResponsavelAtual";
import type { AtivacaoLinha } from "@/hooks/useOnboardingProgress";
import { canonicalStatus } from "@/lib/demandas-categorias";

interface Props {
  linhas: AtivacaoLinha[];
  onVerTarefas?: (responsavelId: string) => void;
}

export function AlertaResponsavelCard({ linhas, onVerTarefas }: Props) {
  const navigate = useNavigate();
  const { responsavel, responsavelId } = useResponsavelAtual();

  if (!responsavelId) return null;

  const minhas = linhas.filter(
    (l) =>
      l.responsavelAtualId === responsavelId ||
      l.demandas.some(
        (d) =>
          d.responsavel_id === responsavelId ||
          d.responsaveis_ids?.includes(responsavelId),
      ),
  );

  const tarefasMinhas = linhas.flatMap((l) =>
    l.demandas
      .filter(
        (d) =>
          (d.responsavel_id === responsavelId ||
            d.responsaveis_ids?.includes(responsavelId)),
      )
      .map((d) => ({ ...d, _cliente: l.cliente })),
  );

  const atrasadas = tarefasMinhas.filter((d) => canonicalStatus(d.status) === "Atrasado").length;

  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  const vencendoHoje = tarefasMinhas.filter(
    (d) =>
      d.data_limite &&
      new Date(d.data_limite).getTime() >= Date.now() - 86_400_000 &&
      new Date(d.data_limite).getTime() <= hoje.getTime(),
  ).length;

  const criticos = minhas.filter((l) => l.risco === "Critico").length;
  const aguardando = minhas.filter((l) => l.statusVisual === "Travado").length;

  const prioridade = [...minhas]
    .sort((a, b) => {
      if (a.risco !== b.risco) {
        const order = { Critico: 0, Atencao: 1, OK: 2 } as const;
        return order[a.risco] - order[b.risco];
      }
      return a.diasRestantes - b.diasRestantes;
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
        onClick={() => (onVerTarefas ? onVerTarefas(responsavelId) : navigate("/minhas-tarefas"))}
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
