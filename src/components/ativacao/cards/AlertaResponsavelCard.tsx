import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, AlertTriangle, CalendarClock } from "lucide-react";
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

  // Sugestão de prioridade
  const prioridade = [...minhas]
    .sort((a, b) => {
      if (a.risco !== b.risco) {
        const order = { Critico: 0, Atencao: 1, OK: 2 } as const;
        return order[a.risco] - order[b.risco];
      }
      return a.diasRestantes - b.diasRestantes;
    })
    .slice(0, 4);

  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-foreground">Alerta por Responsável</div>
      <p className="text-[10px] uppercase text-muted-foreground mt-0.5">Dashboard diário</p>

      <div className="mt-3 rounded-md bg-muted/30 p-3">
        <div className="text-sm text-foreground">
          Olá, <span className="font-semibold">{responsavel?.nome ?? "você"}</span>! 👋
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Aqui está o seu resumo do dia.
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <ResumoItem icon={Users} label={`${aguardando} clientes aguardando suas tarefas`} />
        <ResumoItem icon={AlertTriangle} label={`${atrasadas} tarefas atrasadas`} />
        <ResumoItem icon={CalendarClock} label={`${vencendoHoje} prazos vencendo hoje`} />
        {criticos > 0 && (
          <ResumoItem icon={AlertTriangle} label={`${criticos} clientes críticos sob você`} danger />
        )}
      </div>

      {prioridade.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase text-muted-foreground mb-1.5">Sugestão de prioridade</div>
          <ol className="space-y-1 text-xs text-foreground">
            {prioridade.map((l, idx) => (
              <li key={l.cliente.id} className="flex items-start gap-2">
                <span className="text-muted-foreground tabular-nums">{idx + 1}.</span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{l.cliente.nome_cliente}</span>
                  <span className="text-muted-foreground"> — {l.proximaAcao.titulo}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <Button size="sm" className="w-full mt-4" onClick={() => navigate("/minhas-tarefas")}>
        Ver minhas tarefas
      </Button>
    </Card>
  );
}

function ResumoItem({
  icon: Icon,
  label,
  danger,
}: {
  icon: typeof Users;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className={`h-3.5 w-3.5 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
      <span className={danger ? "text-destructive" : "text-foreground"}>{label}</span>
    </div>
  );
}
