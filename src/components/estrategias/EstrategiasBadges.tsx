import { useMemo } from "react";
import { useCRM } from "@/store/crm";
import {
  deriveEstrategias,
  badgesParaExibir,
} from "@/lib/estrategiasAtivas";
import { cn } from "@/lib/utils";

interface Props {
  clienteId: string;
  /** @deprecated mantido por compatibilidade — ignorado. */
  size?: "xs" | "sm";
  className?: string;
  /** @deprecated mantido por compatibilidade — ignorado. */
  mostrarTodos?: boolean;
}

export function EstrategiasBadges({ clienteId, className }: Props) {
  const cliente = useCRM((s) => s.clientes.find((c) => c.id === clienteId));

  const texto = useMemo(() => {
    if (!cliente) return "";
    const itens = badgesParaExibir(deriveEstrategias(cliente));
    if (itens.length === 0) return "";
    return itens.map((i) => i.label).join(" · ");
  }, [cliente]);

  if (!cliente || !texto) return null;

  return (
    <span
      className={cn(
        "block text-[11px] font-bold text-foreground/80 leading-tight",
        className,
      )}
    >
      {texto}
    </span>
  );
}
