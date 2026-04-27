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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCRM } from "@/store/crm";
import { useDemandas } from "@/store/demandas";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function DemandaRapidaDialog({ open, onOpenChange }: Props) {
  const { clientes, responsaveis, cards } = useCRM();
  const createDemanda = useDemandas((s) => s.createDemanda);
  const [cliente_id, setClienteId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [responsavel_id, setResponsavelId] = useState("");
  const [respManualmenteAlterado, setRespManualmenteAlterado] = useState(false);
  const [data_limite, setDataLimite] = useState("");
  const [saving, setSaving] = useState(false);

  // Autopreencher: ao escolher cliente, sugerir responsável mais frequente nos posts (cards) desse cliente.
  useEffect(() => {
    if (!cliente_id) return;
    if (respManualmenteAlterado) return;
    const cardsCli = cards.filter((c) => c.cliente_id === cliente_id);
    const freq = new Map<string, number>();
    cardsCli.forEach((c) => (c.responsaveis ?? []).forEach((r) => freq.set(r, (freq.get(r) ?? 0) + 1)));
    let maisFreq: string | null = null;
    let max = 0;
    freq.forEach((n, id) => { if (n > max) { max = n; maisFreq = id; } });
    setResponsavelId(maisFreq ?? "");
  }, [cliente_id, cards, respManualmenteAlterado]);

  const submit = async () => {
    if (!cliente_id || !titulo.trim()) return;
    setSaving(true);
    const id = await createDemanda({
      cliente_id,
      titulo: titulo.trim(),
      responsavel_id: responsavel_id || null,
      data_limite: data_limite ? new Date(data_limite).toISOString() : null,
    });
    setSaving(false);
    if (id) {
      setClienteId(""); setTitulo(""); setResponsavelId(""); setDataLimite("");
      setRespManualmenteAlterado(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Demanda rápida</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cliente *</Label>
            <Select value={cliente_id} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Responsável da Demanda</Label>
            <Select
              value={responsavel_id}
              onValueChange={(v) => { setResponsavelId(v); setRespManualmenteAlterado(true); }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data limite</Label>
            <Input type="datetime-local" value={data_limite} onChange={(e) => setDataLimite(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !cliente_id || !titulo.trim()}>
            {saving ? "Salvando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
