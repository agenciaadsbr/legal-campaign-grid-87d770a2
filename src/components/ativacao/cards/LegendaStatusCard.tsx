import { Card } from "@/components/ui/card";
import { StatusVisualBadge } from "@/components/ativacao/StatusVisualBadge";
import type { StatusVisual } from "@/lib/ativacaoRules";

const ITENS: { status: StatusVisual; desc: string }[] = [
  { status: "No prazo", desc: "Dentro do prazo, mais de 7 dias restantes." },
  { status: "Atenção", desc: "Prazo entre 2 e 7 dias ou ponto exige acompanhamento." },
  { status: "Risco", desc: "Prazo entre hoje e 2 dias ou gargalo relevante." },
  { status: "Atrasado", desc: "Prazo vencido ou onboarding acima de 30 dias." },
  { status: "Travado", desc: "Aguardando cliente ou dependência externa." },
];

export function LegendaStatusCard() {
  return (
    <Card className="p-4">
      <div className="text-sm font-semibold text-foreground">Legenda de Status (Central de Ativação)</div>
      <ul className="mt-2 space-y-1.5">
        {ITENS.map((i) => (
          <li key={i.status} className="flex items-center gap-2">
            <StatusVisualBadge status={i.status} />
            <span className="text-xs text-muted-foreground leading-snug truncate">{i.desc}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-muted-foreground/80 italic">
        Esses status são exclusivos da Central — não alteram os status reais das tarefas.
      </p>
    </Card>
  );
}
