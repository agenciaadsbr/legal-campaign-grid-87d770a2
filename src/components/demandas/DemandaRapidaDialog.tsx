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
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AvatarStack } from "@/components/AvatarStack";
import { cn } from "@/lib/utils";
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
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>([]);
  const [respManualmenteAlterado, setRespManualmenteAlterado] = useState(false);
  const [data_limite, setDataLimite] = useState("");
  const [saving, setSaving] = useState(false);

  // Autopreencher: ao escolher cliente, sugerir o responsável mais frequente nos posts.
  useEffect(() => {
    if (!cliente_id) return;
    if (respManualmenteAlterado) return;
    const cardsCli = cards.filter((c) => c.cliente_id === cliente_id);
    const freq = new Map<string, number>();
    cardsCli.forEach((c) => (c.responsaveis ?? []).forEach((r) => freq.set(r, (freq.get(r) ?? 0) + 1)));
    let maisFreq: string | null = null;
    let max = 0;
    freq.forEach((n, id) => { if (n > max) { max = n; maisFreq = id; } });
    setResponsaveisIds(maisFreq ? [maisFreq] : []);
  }, [cliente_id, cards, respManualmenteAlterado]);

  const submit = async () => {
    if (!cliente_id || !titulo.trim()) return;
    setSaving(true);
    const id = await createDemanda({
      cliente_id,
      titulo: titulo.trim(),
      responsaveis_ids: responsaveisIds,
      data_limite: data_limite ? new Date(data_limite).toISOString() : null,
    });
    setSaving(false);
    if (id) {
      setClienteId(""); setTitulo(""); setResponsaveisIds([]); setDataLimite("");
      setRespManualmenteAlterado(false);
      onOpenChange(false);
    }
  };

  const toggleResp = (rid: string) => {
    setRespManualmenteAlterado(true);
    setResponsaveisIds((prev) =>
      prev.includes(rid) ? prev.filter((x) => x !== rid) : [...prev, rid]
    );
  };

  const respObjs = responsaveis.filter((r) => responsaveisIds.includes(r.id));

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
            <Label>Responsáveis da Demanda</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-start h-9">
                  {respObjs.length === 0 ? (
                    <span className="text-muted-foreground text-sm">Selecionar responsáveis</span>
                  ) : (
                    <AvatarStack responsaveis={respObjs} size="xs" max={5} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="start">
                <div className="text-[11px] text-muted-foreground px-2 pb-1.5">Responsáveis</div>
                <div className="max-h-60 overflow-auto space-y-0.5">
                  {responsaveis.map((r) => {
                    const checked = responsaveisIds.includes(r.id);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => toggleResp(r.id)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
                          checked && "bg-accent"
                        )}
                      >
                        <Checkbox checked={checked} />
                        <div
                          className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: r.cor }}
                        >
                          {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <span className="truncate">{r.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
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
