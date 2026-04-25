import { StatusCard, useCRM } from "@/store/crm";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { bg: string; label: string }> = {
  Criar: { bg: "bg-status-criar/15 text-status-criar border-status-criar/30", label: "Criar" },
  Revisar: { bg: "bg-status-revisar/15 text-status-revisar border-status-revisar/30", label: "Revisar" },
  Agendar: { bg: "bg-status-agendar/15 text-status-agendar border-status-agendar/30", label: "Agendar" },
  Postado: { bg: "bg-status-postado/15 text-status-postado border-status-postado/30", label: "Postado" },
  Renovação: { bg: "bg-status-renovacao/15 text-status-renovacao border-status-renovacao/30", label: "Renovação" },
};

export function StatusBadge({ status, className }: { status: StatusCard; className?: string }) {
  const statusPostOptions = useCRM((s) => s.statusPostOptions);
  const dyn = statusPostOptions.find((o) => o.label === status);
  if (dyn) {
    return <ColorBadge label={dyn.label} color={dyn.cor} className={className} />;
  }
  const s = statusMap[status as string];
  if (!s) {
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-muted text-muted-foreground border-border", className)}>
        {String(status)}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", s.bg, className)}>
      {s.label}
    </span>
  );
}

// Calcula se branco ou preto contrasta melhor com a cor de fundo
function bestTextColor(hex: string): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "#fff";
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  // Luminância relativa simplificada
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111827" : "#ffffff";
}

export function ColorBadge({
  label,
  color,
  className,
  variant = "soft",
}: {
  label: string;
  color: string;
  className?: string;
  variant?: "soft" | "filled";
}) {
  if (variant === "filled") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide uppercase",
          className,
        )}
        style={{ backgroundColor: color, color: bestTextColor(color) }}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border", className)}
      style={{ backgroundColor: `${color}1f`, color, borderColor: `${color}4d` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
