import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusVisualBadge } from "@/components/ativacao/StatusVisualBadge";
import type { AtivacaoLinha } from "@/hooks/useOnboardingProgress";

interface Props {
  linhas: AtivacaoLinha[];
  onAbrirDetalhe: (l: AtivacaoLinha) => void;
  onVerTodos?: () => void;
}

export function AtivacoesRiscoCard({ linhas, onAbrirDetalhe, onVerTodos }: Props) {
  const criticas = linhas
    .filter((l) => l.statusVisual === "Risco" || l.statusVisual === "Atrasado" || l.risco === "Critico")
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const visiveis = criticas.slice(0, 4);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">Ativações em risco</div>
        <span className="text-xs text-muted-foreground tabular-nums">({criticas.length})</span>
      </div>
      {visiveis.length === 0 ? (
        <div className="mt-3 text-xs text-muted-foreground">
          Nenhuma ativação em risco no momento.
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {visiveis.map((l) => (
            <li
              key={l.cliente.id}
              className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-muted/40 cursor-pointer"
              onClick={() => onAbrirDetalhe(l)}
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-foreground truncate">
                  {l.cliente.nome_cliente}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {l.diasOnboarding} dias em onboarding
                </div>
              </div>
              <StatusVisualBadge status={l.statusVisual} />
            </li>
          ))}
        </ul>
      )}
      {criticas.length > 4 && onVerTodos && (
        <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={onVerTodos}>
          Ver todos os {criticas.length} clientes →
        </Button>
      )}
    </Card>
  );
}
