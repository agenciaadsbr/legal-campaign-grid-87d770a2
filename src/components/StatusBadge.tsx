import { StatusCard } from "@/store/crm";
import { cn } from "@/lib/utils";

const statusMap: Record<StatusCard, { bg: string; label: string }> = {
  Criar: { bg: "bg-status-criar/15 text-status-criar border-status-criar/30", label: "Criar" },
  Revisar: { bg: "bg-status-revisar/15 text-status-revisar border-status-revisar/30", label: "Revisar" },
  Agendar: { bg: "bg-status-agendar/15 text-status-agendar border-status-agendar/30", label: "Agendar" },
  Postado: { bg: "bg-status-postado/15 text-status-postado border-status-postado/30", label: "Postado" },
  Renovação: { bg: "bg-status-renovacao/15 text-status-renovacao border-status-renovacao/30", label: "Renovação" },
};

export function StatusBadge({ status, className }: { status: StatusCard; className?: string }) {
  const s = statusMap[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", s.bg, className)}>
      {s.label}
    </span>
  );
}

export function ColorBadge({ label, color, className }: { label: string; color: string; className?: string }) {
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
