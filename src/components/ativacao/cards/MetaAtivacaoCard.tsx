import { Card } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { META_ATIVACAO_DIAS } from "@/lib/ativacaoRules";

export function MetaAtivacaoCard() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground">Meta de Ativação</div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Todos os clientes devem ser ativados em até{" "}
            <span className="font-semibold text-foreground">{META_ATIVACAO_DIAS} dias</span> após o início do onboarding.
          </p>
        </div>
      </div>
    </Card>
  );
}
