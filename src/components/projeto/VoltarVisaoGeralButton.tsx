import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onClick: () => void;
  className?: string;
  label?: string;
}

/**
 * Botão padronizado "Voltar para Visão Geral" usado no topo dos
 * detalhes de tarefa (modal de demanda e página de post).
 */
export function VoltarVisaoGeralButton({
  onClick,
  className,
  label = "Voltar para Visão Geral",
}: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
