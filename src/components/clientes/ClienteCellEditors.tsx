import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCRM } from "@/store/crm";

function CellShell({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[11px] hover:text-foreground text-muted-foreground"
    >
      {children}
    </button>
  );
}

export function DataContratacaoCell({ clienteId, value }: { clienteId: string; value?: string | null }) {
  const { updateCliente } = useCRM();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(value ?? "");
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setV(value ?? ""); }}>
      <PopoverTrigger asChild>
        <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          {value ? new Date(value).toLocaleDateString("pt-BR") : <span>—</span>}
          <Pencil className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 space-y-2">
        <Input type="date" value={v} onChange={(e) => setV(e.target.value)} className="h-8" />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button size="sm" className="h-7" onClick={async () => { await updateCliente(clienteId, { data_contratacao: v || null } as any); setOpen(false); }}>Salvar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

const REL_TONES: Record<string, string> = {
  "Bom": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "Neutro": "bg-muted text-muted-foreground",
  "Crítico": "bg-destructive/15 text-destructive",
};

const PERF_TONES: Record<string, string> = {
  "Alto": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "Médio": "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "Baixo": "bg-destructive/15 text-destructive",
};

function SelectCell({
  clienteId,
  field,
  value,
  options,
  tones,
}: {
  clienteId: string;
  field: "status_relacionamento" | "status_performance";
  value?: string | null;
  options: string[];
  tones: Record<string, string>;
}) {
  const { updateCliente } = useCRM();
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={async (val) => {
        await updateCliente(clienteId, { [field]: val === "__none__" ? null : val } as any);
      }}
    >
      <SelectTrigger className="h-6 px-1.5 border-0 bg-transparent hover:bg-accent/40 w-auto min-w-[80px] text-[11px]">
        <SelectValue placeholder="—">
          {value ? (
            <span className={cn("inline-flex items-center h-5 px-1.5 rounded text-[11px] font-semibold", tones[value] ?? "bg-muted text-muted-foreground")}>
              {value}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">— Nenhum —</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StatusRelacionamentoCell({ clienteId, value }: { clienteId: string; value?: string | null }) {
  return <SelectCell clienteId={clienteId} field="status_relacionamento" value={value} options={["Bom", "Neutro", "Crítico"]} tones={REL_TONES} />;
}

export function StatusPerformanceCell({ clienteId, value }: { clienteId: string; value?: string | null }) {
  return <SelectCell clienteId={clienteId} field="status_performance" value={value} options={["Alto", "Médio", "Baixo"]} tones={PERF_TONES} />;
}

export function LinkRelatorioCell({ clienteId, value }: { clienteId: string; value?: string | null }) {
  const { updateCliente } = useCRM();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(value ?? "");
  return (
    <div className="inline-flex items-center gap-1.5">
      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="text-primary text-[11px] hover:underline inline-flex items-center gap-0.5 max-w-[120px] truncate"
          title={value}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">Abrir</span>
        </a>
      ) : (
        <span className="text-[11px] text-muted-foreground">—</span>
      )}
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setV(value ?? ""); }}>
        <PopoverTrigger asChild>
          <button type="button" className="text-muted-foreground hover:text-foreground">
            <Pencil className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 space-y-2">
          <Input
            type="url"
            placeholder="https://..."
            value={v}
            onChange={(e) => setV(e.target.value)}
            className="h-8 text-xs"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" className="h-7" onClick={async () => { await updateCliente(clienteId, { link_relatorio: v || null } as any); setOpen(false); }}>Salvar</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
