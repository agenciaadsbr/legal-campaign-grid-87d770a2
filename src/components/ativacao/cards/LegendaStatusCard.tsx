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
      <div className="text-sm font-semibold text-foreground">Legenda de Status</div>
      <ul className="mt-3 space-y-2">
        {ITENS.map((i) => (
          <li key={i.status} className="flex items-start gap-2">
            <div className="pt-0.5">
              <StatusVisualBadge status={i.status} />
            </div>
            <span className="text-xs text-muted-foreground leading-snug">{i.desc}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10px] text-muted-foreground/80 italic">
        Esses status são exclusivos da Central — não alteram os status reais das tarefas.
      </p>
    </Card>
  );
}
