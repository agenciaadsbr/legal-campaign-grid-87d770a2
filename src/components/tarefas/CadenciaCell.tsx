import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Workflow } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UnifiedTask } from "@/lib/minhasTarefas";
import {
  useCadenciasStore,
  ETAPAS_LABEL,
  STATUS_LABEL,
  STATUS_OPTIONS,
  TIPO_LABEL,
  inferirTipoCadencia,
  diasNaEtapaLabel,
  diasNaEtapaTone,
  type CadenciaStatus,
  type CadenciaTipo,
} from "@/store/cadenciasOperacionais";

interface Props {
  task: UnifiedTask;
}

function fmtHora(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function statusTone(s: CadenciaStatus): string {
  if (s === "resolvida") return "text-emerald-600 dark:text-emerald-400";
  if (s === "sem_retorno") return "text-destructive";
  return "text-amber-600 dark:text-amber-400";
}

export function CadenciaCell({ task }: Props) {
  const { cadencias, loaded, load, registrarEtapa } = useCadenciasStore();
  const cad = cadencias.find((c) => c.task_id === task.id);

  const [open, setOpen] = useState(false);
  const [etapa, setEtapa] = useState<number>(cad?.etapa_atual && cad.etapa_atual > 0 ? cad.etapa_atual : 1);
  const [status, setStatus] = useState<CadenciaStatus>(cad?.status ?? "aguardando_resposta");
  const [tipo, setTipo] = useState<CadenciaTipo>(cad?.tipo ?? inferirTipoCadencia(task.titulo, task.area));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  useEffect(() => {
    if (cad) {
      setEtapa(cad.etapa_atual && cad.etapa_atual > 0 ? cad.etapa_atual : 1);
      setStatus(cad.status);
      setTipo(cad.tipo);
    }
  }, [cad?.id, cad?.etapa_atual, cad?.status, cad?.tipo]);

  const salvar = async () => {
    setSaving(true);
    try {
      await registrarEtapa({
        task_id: task.id,
        cliente_id: task.cliente_id,
        tipo,
        etapa,
        status,
        responsavel_id: task.responsaveis_ids[0] ?? null,
      });
      toast.success("Cadência registrada");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao registrar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {cad ? (
          <button
            type="button"
            className="text-left text-xs leading-tight hover:bg-muted/60 rounded px-1.5 py-1 -mx-1 transition-colors w-full"
            title="Atualizar cadência"
          >
            <div className="font-medium truncate">
              {ETAPAS_LABEL[cad.etapa_atual] ?? "—"}
            </div>
            <div className={cn("text-[10px] truncate", statusTone(cad.status))}>
              {STATUS_LABEL[cad.status]}
              {cad.ultima_acao_em ? <span className="text-muted-foreground"> · {fmtHora(cad.ultima_acao_em)}</span> : null}
            </div>
          </button>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
            <Plus className="h-3 w-3 mr-1" />
            Registrar
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-2" align="start">
        <div className="flex items-center gap-2">
          <Workflow className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Registrar cadência</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as CadenciaTipo)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="aprovacao">{TIPO_LABEL.aprovacao}</SelectItem>
              <SelectItem value="recarga">{TIPO_LABEL.recarga}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Etapa executada</label>
          <Select value={String(etapa)} onValueChange={(v) => setEtapa(Number(v))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={String(n)}>{ETAPAS_LABEL[n]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as CadenciaStatus)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {cad && (
          <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
            Última atualização: {fmtHora(cad.ultima_acao_em) || "—"}
          </div>
        )}

        <div className="flex justify-end gap-1 pt-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={salvar} disabled={saving}>
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
