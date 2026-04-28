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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AvatarStack } from "@/components/AvatarStack";
import { cn } from "@/lib/utils";
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
  defaultCategoria?: DemandaCategoria;
  defaultSubtipo?: string;
  /** Quando true, esconde o seletor de cliente (usa o defaultClienteId fixado). */
  lockCliente?: boolean;
  /** Quando true, esconde o seletor de categoria. */
  lockCategoria?: boolean;
  /** Título do modal. Default: "Nova Tarefa". */
  titulo?: string;
  /** Callback após criar com sucesso (recebe id e categoria). */
  onCreated?: (id: string, categoria: DemandaCategoria) => void;
}

export function NovaDemandaDialog({
  open,
  onOpenChange,
  defaultClienteId,
  defaultCategoria,
  defaultSubtipo,
  lockCliente,
  lockCategoria,
  titulo: tituloModal,
  onCreated,
}: Props) {
  const { clientes, responsaveis, cards } = useCRM();
  const createDemanda = useDemandas((s) => s.createDemanda);

  const [cliente_id, setClienteId] = useState(defaultClienteId ?? "");

  useEffect(() => {
    if (open && defaultClienteId) setClienteId(defaultClienteId);
  }, [open, defaultClienteId]);

  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState<DemandaCategoria>(defaultCategoria ?? "Personalizado");
  const [subtipo, setSubtipo] = useState<string>(defaultSubtipo ?? "");

  useEffect(() => {
    if (open) {
      if (defaultCategoria) setCategoria(defaultCategoria);
      if (defaultSubtipo !== undefined) setSubtipo(defaultSubtipo);
    }
  }, [open, defaultCategoria, defaultSubtipo]);

  const [responsaveisIds, setResponsaveisIds] = useState<string[]>([]);
  const [respManualmenteAlterado, setRespManualmenteAlterado] = useState(false);

  // Autopreencher: ao escolher cliente, sugerir o responsável mais frequente nos posts (cards) do cliente.
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
  const [prioridade, setPrioridade] = useState<DemandaPrioridade>("Media");
  const [data_limite, setDataLimite] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [precisa_aprovacao, setPrecisaAprovacao] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setClienteId(defaultClienteId ?? "");
    setTitulo("");
    setCategoria(defaultCategoria ?? "Personalizado");
    setSubtipo(defaultSubtipo ?? "");
    setResponsaveisIds([]);
    setRespManualmenteAlterado(false);
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
      responsaveis_ids: responsaveisIds,
      prioridade,
      data_limite: data_limite ? new Date(data_limite).toISOString() : null,
      descricao: descricao || null,
      precisa_aprovacao,
    });
    setSaving(false);
    if (id) {
      onCreated?.(id, categoria);
      reset();
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

  const subtipos = CATEGORIA_SUBTIPOS[categoria] ?? [];

  const showCliente = !lockCliente && !defaultClienteId;
  const showCategoria = !lockCategoria;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{tituloModal ?? "Nova Tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {showCliente && (
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
          )}
          {showCategoria && (
            <div className="col-span-2">
              <Label>Categoria *</Label>
              <Select value={categoria} onValueChange={(v) => { setCategoria(v as DemandaCategoria); setSubtipo(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                A tarefa aparecerá apenas na aba <strong>{CATEGORIA_LABEL[categoria]}</strong>.
              </p>
            </div>
          )}
          <div className="col-span-2">
            <Label>Título da tarefa *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
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
                  {responsaveis.length === 0 && (
                    <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                      Nenhum responsável cadastrado
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
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
