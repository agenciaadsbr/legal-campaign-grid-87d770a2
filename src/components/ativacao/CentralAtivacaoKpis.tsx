import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock, Hourglass, Rocket, Sparkles } from "lucide-react";
import type { AtivacaoLinha } from "@/hooks/useOnboardingProgress";

interface Props {
  linhas: AtivacaoLinha[];
}

export function CentralAtivacaoKpis({ linhas }: Props) {
  const total = linhas.length;
  const criticos = linhas.filter((l) => l.risco === "Critico").length;
  const aguardandoCliente = linhas.filter((l) =>
    l.statusPrincipal === "Aguardando ação do cliente" ||
    l.statusPrincipal === "Aguardando aprovação do cliente",
  ).length;
  const quasePromptos = linhas.filter((l) => l.podeAtivar || l.progresso.pct >= 80).length;
  const emAndamento = total - criticos - aguardandoCliente;

  const kpis = [
    { label: "Total em Onboarding", value: total, icon: Rocket, color: "text-primary" },
    { label: "Em andamento", value: Math.max(0, emAndamento), icon: Clock, color: "text-foreground" },
    { label: "Críticos", value: criticos, icon: AlertTriangle, color: "text-destructive" },
    { label: "Aguardando cliente", value: aguardandoCliente, icon: Hourglass, color: "text-amber-500" },
    { label: "Quase prontos", value: quasePromptos, icon: Sparkles, color: "text-emerald-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((k) => (
        <Card key={k.label} className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{k.label}</span>
            <k.icon className={`h-4 w-4 ${k.color}`} />
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{k.value}</div>
        </Card>
      ))}
    </div>
  );
}
