import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users } from "lucide-react";
import { useCRM } from "@/store/crm";
import { useMeetingTasks, type DelegarTarefaInput } from "@/store/meetingTasks";
import { useReunioes } from "@/store/reunioes";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  meetingId: string;
  clientId: string;
  projectId?: string | null;
}

const CATEGORIAS = ["Personalizado", "Urgência", "IAAtendimento", "Estratégia", "Performance"];
const PRIORIDADES = ["Baixa", "Media", "Alta", "Urgente"];

export function DelegarTarefasDialog({ open, onOpenChange, meetingId, clientId, projectId }: Props) {
  const responsaveis = useCRM((s) => s.responsaveis);
  const delegar = useMeetingTasks((s) => s.delegar);
  const setPostStatus = useReunioes((s) => s.setPostStatus);

  const novaTarefa = (): DelegarTarefaInput => ({
    title: "",
    description: "",
    assigned_to: "",
    due_date: "",
    categoria: "Personalizado",
    prioridade: "Media",
    criar_demanda_real: false,
  });

  const [tarefas, setTarefas] = useState<DelegarTarefaInput[]>([novaTarefa()]);
  const [saving, setSaving] = useState(false);

  const update = (i: number, patch: Partial<DelegarTarefaInput>) => {
    setTarefas((arr) => arr.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };

  const handleConfirm = async () => {
    const validas = tarefas.filter((t) => t.title.trim());
    if (validas.length === 0) {
      toast.error("Adicione pelo menos uma tarefa com título");
      return;
    }
    setSaving(true);
    try {
      const n = await delegar({ meeting_id: meetingId, client_id: clientId, project_id: projectId ?? null, tarefas: validas });
      if (n > 0) {
        await setPostStatus(meetingId, "delegada");
        toast.success(`${n} tarefa(s) delegada(s)`);
        setTarefas([novaTarefa()]);
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Delegar tarefas da reunião
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {tarefas.map((t, i) => (
            <div key={i} className="border border-border rounded-md p-3 bg-card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Título *</Label>
                  <Input value={t.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="O que precisa ser feito" />
                </div>
                {tarefas.length > 1 && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 mt-5 text-destructive" onClick={() => setTarefas((arr) => arr.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea rows={2} value={t.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Responsável</Label>
                  <Select value={t.assigned_to || "__none__"} onValueChange={(v) => update(i, { assigned_to: v === "__none__" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nenhum —</SelectItem>
                      {responsaveis.map((r) => (<SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Prazo</Label>
                  <Input type="date" value={t.due_date ?? ""} onChange={(e) => update(i, { due_date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select value={t.categoria || "Personalizado"} onValueChange={(v) => update(i, { categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Prioridade</Label>
                  <Select value={t.prioridade || "Media"} onValueChange={(v) => update(i, { prioridade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Checkbox id={`real-${i}`} checked={!!t.criar_demanda_real} onCheckedChange={(v) => update(i, { criar_demanda_real: !!v })} />
                <Label htmlFor={`real-${i}`} className="text-xs cursor-pointer">
                  Criar também como tarefa real no sistema (Central de Tarefas)
                </Label>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={() => setTarefas((arr) => [...arr, novaTarefa()])}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar tarefa
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "Delegando..." : "Confirmar delegação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
