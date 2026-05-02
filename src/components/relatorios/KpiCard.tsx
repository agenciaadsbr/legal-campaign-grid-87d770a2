import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export type KpiTone = "default" | "primary" | "success" | "warning" | "destructive" | "info";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: KpiTone;
  delta?: number;
}

const toneMap: Record<KpiTone, { iconBg: string; iconFg: string; valueFg: string }> = {
  default:     { iconBg: "bg-muted",            iconFg: "text-foreground",       valueFg: "text-foreground" },
  primary:     { iconBg: "bg-primary/10",       iconFg: "text-primary",          valueFg: "text-foreground" },
  success:     { iconBg: "bg-emerald-500/10",   iconFg: "text-emerald-500",      valueFg: "text-foreground" },
  warning:     { iconBg: "bg-amber-500/10",     iconFg: "text-amber-500",        valueFg: "text-foreground" },
  destructive: { iconBg: "bg-destructive/10",   iconFg: "text-destructive",      valueFg: "text-destructive" },
  info:        { iconBg: "bg-sky-500/10",       iconFg: "text-sky-500",          valueFg: "text-foreground" },
};

export function KpiCard({ icon: Icon, label, value, hint, tone = "default", delta }: KpiCardProps) {
  const t = toneMap[tone];
  const hasDelta = typeof delta === "number" && !Number.isNaN(delta);
  const positive = (delta ?? 0) >= 0;

  return (
    <Card className="overflow-hidden border-border bg-card transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className={cn("mt-1.5 text-3xl font-bold tracking-tight tabular-nums", t.valueFg)}>
              {value}
            </div>
            {hint && (
              <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>
            )}
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", t.iconBg)}>
            <Icon className={cn("h-5 w-5", t.iconFg)} />
          </div>
        </div>
        {hasDelta && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {positive ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className={positive ? "text-emerald-500" : "text-destructive"}>
              {positive ? "+" : ""}
              {delta}%
            </span>
            <span className="text-muted-foreground">vs período anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
