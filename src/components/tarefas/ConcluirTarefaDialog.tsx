import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, RefreshCw, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useCRM } from "@/store/crm";
import { useDemandas } from "@/store/demandas";
import { usePlanejamento } from "@/store/planejamento";
import { useDocumentacao } from "@/store/documentacao";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIAS, CATEGORIA_LABEL, PRIORIDADES, PRIORIDADE_LABEL,
  type DemandaCategoria, type DemandaPrioridade,
} from "@/lib/demandas-categorias";
import type { UnifiedTask } from "@/lib/minhasTarefas";

interface Props {
  task: UnifiedTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConcluida?: () => void;
}

type Etapa = "escolha" | "delegar";

export function ConcluirTarefaDialog({ task, open, onOpenChange, onConcluida }: Props) {
  const [etapa, setEtapa] = useState<Etapa>("escolha");
  const [salvando, setSalvando] = useState(false);

  const responsaveis = useCRM((s) => s.responsaveis);
  const updateCard = useCRM((s) => s.updateCard);
  const moveStatus = useDemandas((s) => s.moveStatus);
  const createDemanda = useDemandas((s) => s.createDemanda);
  const updatePlan = usePlanejamento((s) => s.update);
  const updateDoc = useDocumentacao((s) => s.update);

  // form delegação
  const [novoResp, setNovoResp] = useState<string>("");
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<DemandaCategoria>("Personalizado");
  const [prioridade, setPrioridade] = useState<DemandaPrioridade>("Media");
  const [prazo, setPrazo] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [reusarAnexos, setReusarAnexos] = useState(true);

  function reset() {
    setEtapa("escolha");
    setNovoResp("");
    setTitulo("");
    setCategoria("Personalizado");
    setPrioridade("Media");
    setPrazo("");
    setDescricao("");
    setReusarAnexos(true);
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  async function concluirTarefaOrigem() {
    if (!task) return;
    if (task.fonte === "demanda") {
      await moveStatus(task.origem_id, "Concluido");
    } else if (task.fonte === "post") {
      await updateCard(task.origem_id, { status_card: "Postado" });
    } else if (task.fonte === "planejamento") {
      await updatePlan(task.origem_id, { status: "concluido" });
    } else if (task.fonte === "documentacao") {
      await updateDoc(task.origem_id, { enviado: true, data_envio: new Date().toISOString() });
    }
  }

  async function copiarAnexos(novoDemandaId: string) {
    if (!task || task.fonte !== "demanda") return;
    const { data, error } = await supabase
      .from("anexos_demandas")
      .select("nome,url,mime,size")
      .eq("demanda_id", task.origem_id);
    if (error || !data || data.length === 0) return;
    const payload = data.map((a) => ({ ...a, demanda_id: novoDemandaId }));
    await supabase.from("anexos_demandas").insert(payload);
  }

  async function handleConcluirApenas() {
    if (!task) return;
    setSalvando(true);
    try {
      await concluirTarefaOrigem();
      toast.success("Tarefa concluída");
      onConcluida?.();
      handleClose(false);
    } finally {
      setSalvando(false);
    }
  }

  async function handleConcluirECriar() {
    if (!task) return;
    if (!titulo.trim()) { toast.error("Informe o título da nova tarefa"); return; }
    if (!novoResp) { toast.error("Selecione um responsável"); return; }
    setSalvando(true);
    try {
      await concluirTarefaOrigem();

      const desc = (descricao ? descricao + "\n\n" : "") +
        `— Vinculada a: "${task.titulo}" (origem: ${task.fonte}/${task.origem_id})`;

      const novoId = await createDemanda({
        cliente_id: task.cliente_id,
        titulo: titulo.trim(),
        categoria,
        prioridade,
        responsaveis_ids: [novoResp],
        data_limite: prazo ? new Date(prazo).toISOString() : null,
        descricao: desc,
      });

      if (novoId && reusarAnexos && task.fonte === "demanda") {
        await copiarAnexos(novoId);
      }

      toast.success("Tarefa concluída e nova tarefa criada");
      onConcluida?.();
      handleClose(false);
    } finally {
      setSalvando(false);
    }
  }

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {etapa === "escolha" ? (
          <>
            <DialogHeader>
              <DialogTitle>Concluir tarefa</DialogTitle>
              <DialogDescription className="line-clamp-2">
                {task.titulo} — {task.cliente_nome}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <button
                type="button"
                disabled={salvando}
                onClick={handleConcluirApenas}
                className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary hover:bg-accent transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Concluir apenas
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Marca a tarefa como concluída e encerra o fluxo.
                </div>
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => {
                  setTitulo(`Próximo passo: ${task.titulo}`);
                  setEtapa("delegar");
                }}
                className="text-left rounded-lg border border-border bg-card p-4 hover:border-primary hover:bg-accent transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <RefreshCw className="h-4 w-4 text-sky-500" />
                  Concluir e criar próxima tarefa
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Conclui a atual e abre o formulário para delegar uma nova tarefa.
                </div>
              </button>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={salvando}>
                Cancelar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nova tarefa vinculada</DialogTitle>
              <DialogDescription>
                Para o cliente <strong>{task.cliente_nome}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid gap-1.5">
                <Label htmlFor="del-titulo">Título *</Label>
                <Input id="del-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Responsável *</Label>
                  <Select value={novoResp} onValueChange={setNovoResp}>
                    <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                    <SelectContent>
                      {responsaveis.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Área</Label>
                  <Select value={categoria} onValueChange={(v) => setCategoria(v as DemandaCategoria)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Prioridade</Label>
                  <Select value={prioridade} onValueChange={(v) => setPrioridade(v as DemandaPrioridade)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map((p) => (
                        <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="del-prazo">Prazo</Label>
                  <Input id="del-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="del-desc">Descrição</Label>
                <Textarea id="del-desc" rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </div>
              {task.fonte === "demanda" && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={reusarAnexos} onCheckedChange={(v) => setReusarAnexos(!!v)} />
                  Reutilizar anexos da tarefa anterior
                </label>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setEtapa("escolha")} disabled={salvando}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <Button onClick={handleConcluirECriar} disabled={salvando}>
                {salvando ? "Salvando…" : "Concluir e criar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
