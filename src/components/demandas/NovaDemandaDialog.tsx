import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  CATEGORIA_SUBTIPOS,
  DemandaCategoria,
  DemandaPrioridade,
  PRIORIDADES,
  PRIORIDADE_LABEL,
} from "@/lib/demandas-categorias";
import { useCRM } from "@/store/crm";
import { useDemandas } from "@/store/demandas";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultClienteId?: string;
}

export function NovaDemandaDialog({ open, onOpenChange, defaultClienteId }: Props) {
  const { clientes, responsaveis } = useCRM();
  const createDemanda = useDemandas((s) => s.createDemanda);

  const [cliente_id, setClienteId] = useState(defaultClienteId ?? "");

  useEffect(() => {
    if (open && defaultClienteId) setClienteId(defaultClienteId);
  }, [open, defaultClienteId]);

  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<DemandaCategoria>("Designer");
  const [subtipo, setSubtipo] = useState<string>("");
  const [responsavel_id, setResponsavelId] = useState<string>("");
  const [prioridade, setPrioridade] = useState<DemandaPrioridade>("Media");
  const [data_limite, setDataLimite] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [precisa_aprovacao, setPrecisaAprovacao] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setClienteId("");
    setTitulo("");
    setCategoria("Designer");
    setSubtipo("");
    setResponsavelId("");
    setPrioridade("Media");
    setDataLimite("");
    setDescricao("");
    setPrecisaAprovacao(false);
  };

  const submit = async () => {
    if (!cliente_id || !titulo.trim()) return;
    setSaving(true);
    const id = await createDemanda({
      cliente_id,
      titulo: titulo.trim(),
      categoria,
      subtipo: subtipo || null,
      responsavel_id: responsavel_id || null,
      prioridade,
      data_limite: data_limite ? new Date(data_limite).toISOString() : null,
      descricao: descricao || null,
      precisa_aprovacao,
    });
    setSaving(false);
    if (id) {
      reset();
      onOpenChange(false);
    }
  };

  const subtipos = CATEGORIA_SUBTIPOS[categoria] ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova Demanda</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Cliente *</Label>
            <Select value={cliente_id} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Título da tarefa *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={(v) => { setCategoria(v as DemandaCategoria); setSubtipo(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Subtipo</Label>
            {categoria === "Personalizado" ? (
              <Input value={subtipo} onChange={(e) => setSubtipo(e.target.value)} placeholder="Descreva" />
            ) : (
              <Select value={subtipo} onValueChange={setSubtipo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {subtipos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label>Responsável</Label>
            <Select value={responsavel_id} onValueChange={setResponsavelId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as DemandaPrioridade)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Data limite</Label>
            <Input type="datetime-local" value={data_limite} onChange={(e) => setDataLimite(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Descrição inicial</Label>
            <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Checkbox id="aprov" checked={precisa_aprovacao} onCheckedChange={(v) => setPrecisaAprovacao(!!v)} />
            <Label htmlFor="aprov" className="cursor-pointer">Precisa de aprovação ao concluir</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !cliente_id || !titulo.trim()}>
            {saving ? "Salvando..." : "Criar Demanda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
