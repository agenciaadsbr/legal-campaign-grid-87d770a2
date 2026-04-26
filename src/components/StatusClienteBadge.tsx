import { cn } from "@/lib/utils";

export type StatusClienteGlobal = "Onboarding" | "Ativo" | "Pausado" | "Encerrado";

const STYLES: Record<StatusClienteGlobal, string> = {
  Onboarding: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400",
  Ativo: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  Pausado: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400",
  Encerrado: "bg-muted text-muted-foreground border-border",
};

interface Props {
  status?: string | null;
  size?: "xs" | "sm";
  className?: string;
}

export function StatusClienteBadge({ status, size = "xs", className }: Props) {
  const s = (status as StatusClienteGlobal) || "Onboarding";
  const style = STYLES[s] ?? STYLES.Onboarding;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap",
        size === "xs" ? "h-5 px-1.5 text-[10px]" : "h-6 px-2 text-xs",
        style,
        className,
      )}
    >
      {s}
    </span>
  );
}

export const STATUS_CLIENTE_OPCOES: StatusClienteGlobal[] = [
  "Onboarding",
  "Ativo",
  "Pausado",
  "Encerrado",
];
