import { useCRM, ColumnConfig, DropdownOption } from "@/store/crm";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Settings2, ChevronDown, ChevronRight, Trash2, Eye, EyeOff, GripVertical, Pin, PinOff, Save, BookmarkCheck, Filter, CheckCircle2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { AvatarStack } from "@/components/AvatarStack";
import { ColorBadge } from "@/components/StatusBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { HistoricoComentariosDialog } from "@/components/HistoricoComentariosDialog";
import { MessageSquare, MessageSquarePlus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function ResponsaveisPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { responsaveis, addResponsavel } = useCRM();
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState("");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start h-9">
          {value.length === 0 ? (
            <span className="text-muted-foreground text-sm">Selecionar responsáveis</span>
          ) : (
            <AvatarStack responsaveis={responsaveis.filter((r) => value.includes(r.id))} max={5} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="max-h-56 overflow-auto space-y-1">
          {responsaveis.map((r) => {
            const checked = value.includes(r.id);
            return (
              <button
                type="button"
                key={r.id}
                onClick={() => onChange(checked ? value.filter((v) => v !== r.id) : [...value, r.id])}
                className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm", checked && "bg-accent")}
              >
                <Checkbox checked={checked} />
                <div className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center" style={{ backgroundColor: r.cor }}>
                  {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <span>{r.nome}</span>
              </button>
            );
          })}
        </div>
        <div className="border-t mt-2 pt-2 flex gap-2">
          <Input placeholder="Novo responsável" value={novo} onChange={(e) => setNovo(e.target.value)} className="h-8 text-sm" />
          <Button
            size="sm"
            type="button"
            onClick={() => {
              if (!novo.trim()) return;
              const cores = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#a855f7"];
              const id = addResponsavel({ nome: novo, cor: cores[Math.floor(Math.random() * cores.length)], permissao: "editor", email: `${novo.toLowerCase().replace(/\s/g, ".")}@crm.com` });
              onChange([...value, id]);
              setNovo("");
            }}
          >
            +
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NovoClienteDialog() {
  const { addCliente, nichos, statusOptions } = useCRM();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome_cliente: "",
    nicho: nichos[0]?.label ?? "",
    status_cliente: "Ativo" as any,
    data_inicio_contrato: new Date().toISOString().slice(0, 10),
    data_fim_contrato: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    responsaveis: [] as string[],
    observacoes: "",
  });

  const submit = () => {
    if (!form.nome_cliente.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    addCliente(form);
    toast.success("Cliente criado — 12 cards e contrato gerados automaticamente");
    setOpen(false);
    setForm({ ...form, nome_cliente: "", observacoes: "", responsaveis: [] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome do Cliente</Label>
            <Input value={form.nome_cliente} onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nicho</Label>
              <Select value={form.nicho} onValueChange={(v) => setForm({ ...form, nicho: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {nichos.map((n) => <SelectItem key={n.label} value={n.label}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status_cliente} onValueChange={(v) => setForm({ ...form, status_cliente: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => <SelectItem key={s.label} value={s.label}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Responsáveis</Label>
            <ResponsaveisPicker value={form.responsaveis} onChange={(v) => setForm({ ...form, responsaveis: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={form.data_inicio_contrato} onChange={(e) => setForm({ ...form, data_inicio_contrato: e.target.value })} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={form.data_fim_contrato} onChange={(e) => setForm({ ...form, data_fim_contrato: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Criar Cliente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortableColunaRow({
  c,
  onUpdate,
  onDelete,
}: {
  c: ColumnConfig;
  onUpdate: (patch: Partial<ColumnConfig>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.key });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border bg-card",
        isDragging && "ring-2 ring-primary shadow-lg",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label="Arrastar coluna"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={c.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className="h-8 text-sm flex-1"
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdate({ oculta: !c.oculta })} title={c.oculta ? "Mostrar" : "Ocultar"}>
        {c.oculta ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onUpdate({ fixada: !c.fixada })}>
        {c.fixada ? <Pin className="h-3.5 w-3.5 text-primary" /> : <PinOff className="h-3.5 w-3.5" />}
      </Button>
      {!c.fixa && (
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function GerenciarColunas() {
  const {
    colunasCliente,
    updateColumn,
    deleteColumn,
    addColumn,
    reorderColumns,
    modelosColunas,
    saveModeloColunas,
    applyModeloColunas,
    deleteModeloColunas,
  } = useCRM();
  const [open, setOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<ColumnConfig["tipo"]>("texto");
  const [nomeModelo, setNomeModelo] = useState("");

  const sorted = useMemo(
    () => [...colunasCliente].sort((a, b) => a.ordem - b.ordem),
    [colunasCliente],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((c) => c.key === active.id);
    const newIndex = sorted.findIndex((c) => c.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(sorted, oldIndex, newIndex);
    reorderColumns(next.map((c) => c.key));
  };

  const onSalvarModelo = () => {
    const nome = nomeModelo.trim();
    if (!nome) {
      toast.error("Informe um nome para o modelo");
      return;
    }
    saveModeloColunas(nome);
    setNomeModelo("");
    toast.success(`Modelo "${nome}" salvo`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Settings2 className="h-4 w-4" /> Colunas
        </Button>
      </SheetTrigger>
      <SheetContent className="w-96 overflow-y-auto">
        <SheetHeader><SheetTitle>Gerenciar Colunas</SheetTitle></SheetHeader>

        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-2">Arraste pelo ícone <GripVertical className="h-3 w-3 inline" /> para reordenar</div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sorted.map((c) => c.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sorted.map((c) => (
                  <SortableColunaRow
                    key={c.key}
                    c={c}
                    onUpdate={(patch) => updateColumn(c.key, patch)}
                    onDelete={() => deleteColumn(c.key)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="mt-6 border-t pt-4 space-y-2">
          <div className="text-sm font-medium flex items-center gap-1.5"><BookmarkCheck className="h-4 w-4" /> Modelos salvos</div>
          {modelosColunas.length === 0 ? (
            <div className="text-xs text-muted-foreground">Nenhum modelo salvo ainda.</div>
          ) : (
            <div className="space-y-1.5">
              {modelosColunas.map((m) => (
                <div key={m.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                  <span className="text-sm flex-1 truncate">{m.nome}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      applyModeloColunas(m.id);
                      toast.success(`Modelo "${m.nome}" aplicado`);
                    }}
                  >
                    Aplicar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => {
                      deleteModeloColunas(m.id);
                      toast.success("Modelo removido");
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Input
              placeholder="Nome do modelo"
              value={nomeModelo}
              onChange={(e) => setNomeModelo(e.target.value)}
              className="h-9 text-sm"
              onKeyDown={(e) => e.key === "Enter" && onSalvarModelo()}
            />
            <Button size="sm" onClick={onSalvarModelo} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> Salvar
            </Button>
          </div>
        </div>

        <div className="mt-6 border-t pt-4 space-y-2">
          <div className="text-sm font-medium">Adicionar coluna</div>
          <Input placeholder="Nome da coluna" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} className="h-9" />
          <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="texto">Texto</SelectItem>
              <SelectItem value="numero">Número</SelectItem>
              <SelectItem value="data">Data</SelectItem>
              <SelectItem value="dropdown">Dropdown</SelectItem>
              <SelectItem value="responsaveis">Responsáveis</SelectItem>
              <SelectItem value="link">Link</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="etiqueta">Etiqueta colorida</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="w-full"
            onClick={() => {
              if (!novoNome.trim()) return;
              addColumn({
                key: `custom_${Date.now()}`,
                label: novoNome,
                tipo: novoTipo,
                oculta: false,
                fixada: false,
                largura: 160,
              });
              setNovoNome("");
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CelulaResponsaveis({ clienteId, ids }: { clienteId: string; ids: string[] }) {
  const { responsaveis, updateCliente } = useCRM();
  const [open, setOpen] = useState(false);
  const selecionados = responsaveis.filter((r) => ids.includes(r.id));
  const toggle = (rid: string) => {
    const next = ids.includes(rid) ? ids.filter((v) => v !== rid) : [...ids, rid];
    updateCliente(clienteId, { responsaveis: next });
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="group relative w-full text-left rounded px-1 py-0.5 -mx-1 -my-0.5 hover:bg-accent transition-colors flex items-center gap-1 min-h-[24px]"
          title="Clique para adicionar/remover responsáveis"
        >
          {selecionados.length > 0 ? (
            <AvatarStack responsaveis={selecionados} size="xs" />
          ) : (
            <span className="text-muted-foreground text-[11px] opacity-60 group-hover:opacity-100">+ atribuir</span>
          )}
          <Plus className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="text-[11px] text-muted-foreground px-2 pb-1.5">Responsáveis</div>
        <div className="max-h-60 overflow-auto space-y-0.5">
          {responsaveis.map((r) => {
            const checked = ids.includes(r.id);
            return (
              <button
                type="button"
                key={r.id}
                onClick={() => toggle(r.id)}
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
            <div className="text-xs text-muted-foreground px-2 py-3 text-center">Nenhum responsável cadastrado</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CelulaValor({ col, cliente, onAbrirHistorico }: { col: ColumnConfig; cliente: any; onAbrirHistorico?: (id: string) => void }) {
  const { responsaveis, nichos, statusOptions, contratos, cards } = useCRM();
  const valor = cliente[col.key] ?? cliente.custom?.[col.key];

  if (col.key === "posts") {
    const contrato = contratos.find((c) => c.cliente_id === cliente.id);
    const cardsCliente = cards.filter((c) => c.cliente_id === cliente.id);
    if (!contrato && cardsCliente.length === 0) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    const total = contrato?.total_posts ?? cardsCliente.length;
    const postados = cardsCliente.filter((c) => c.status_card === "Postado").length;
    const agendados = cardsCliente.filter((c) => c.status_card === "Agendar").length;
    return (
      <div className="flex flex-col leading-tight tabular-nums">
        <span className="text-xs font-medium">{postados}/{total} postados</span>
        <span className="text-[11px] text-muted-foreground">{agendados} agendados</span>
      </div>
    );
  }

  if (col.key === "periodo_contrato") {
    const ini = cliente.data_inicio_contrato;
    const fim = cliente.data_fim_contrato;
    return (
      <div className="flex flex-col gap-0 text-xs leading-tight">
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground w-6">Início</span>
          <span>{ini ? new Date(ini).toLocaleDateString("pt-BR") : "—"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground w-6">Fim</span>
          <span>{fim ? new Date(fim).toLocaleDateString("pt-BR") : "—"}</span>
        </div>
      </div>
    );
  }

  if (col.key === "ultimo_comentario") {
    const tem = !!valor;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAbrirHistorico?.(cliente.id); }}
        className={cn(
          "w-full text-left flex items-center gap-1.5 px-1.5 py-0.5 -mx-1.5 -my-0.5 rounded hover:bg-accent group transition-colors",
          !tem && "text-muted-foreground"
        )}
        title="Abrir histórico de comentários"
      >
        {tem ? (
          <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
        ) : (
          <MessageSquarePlus className="h-3 w-3 shrink-0 group-hover:text-primary" />
        )}
        <span className="text-xs truncate flex-1">
          {tem ? valor : "Adicionar comentário"}
        </span>
      </button>
    );
  }

  switch (col.tipo) {
    case "responsaveis": {
      const ids: string[] = valor ?? [];
      return <CelulaResponsaveis clienteId={cliente.id} ids={ids} />;
    }
    case "dropdown": {
      const opt = (col.opcoes ?? nichos).find((o) => o.label === valor);
      return opt ? <ColorBadge label={opt.label} color={opt.cor} /> : <span className="text-muted-foreground text-xs">—</span>;
    }
    case "status": {
      const opt = statusOptions.find((o) => o.label === valor);
      return opt ? <ColorBadge label={opt.label} color={opt.cor} /> : <span className="text-muted-foreground text-xs">—</span>;
    }
    case "data":
      return valor ? <span className="text-xs">{new Date(valor).toLocaleDateString("pt-BR")}</span> : <span className="text-muted-foreground text-xs">—</span>;
    case "link":
      return valor ? <a href={valor} className="text-primary text-xs underline" target="_blank">link</a> : <span className="text-muted-foreground text-xs">—</span>;
    default:
      return <span className="text-xs truncate block" title={valor}>{valor || <span className="text-muted-foreground">—</span>}</span>;
  }
}

export default function Clientes() {
  const { clientes, colunasCliente, statusOptions } = useCRM();
  const [busca, setBusca] = useState("");
  const [grupoColapsado, setGrupoColapsado] = useState<Record<string, boolean>>({});
  const [historicoClienteId, setHistoricoClienteId] = useState<string | null>(null);

  const colunasVisiveis = useMemo(
    () => [...colunasCliente].filter((c) => !c.oculta).sort((a, b) => a.ordem - b.ordem),
    [colunasCliente]
  );

  const filtrados = useMemo(
    () => clientes.filter((c) => c.nome_cliente.toLowerCase().includes(busca.toLowerCase())),
    [clientes, busca]
  );

  const grupos = useMemo(() => {
    const map: Record<string, typeof clientes> = {};
    statusOptions.forEach((s) => (map[s.label] = []));
    filtrados.forEach((c) => {
      if (!map[c.status_cliente]) map[c.status_cliente] = [];
      map[c.status_cliente].push(c);
    });
    return map;
  }, [filtrados, statusOptions]);

  return (
    <div className="px-5 py-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold leading-tight">Clientes</h1>
          <p className="text-xs text-muted-foreground">{clientes.length} clientes • Tabela dinâmica</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..." className="pl-8 h-8 w-56 text-sm" />
          </div>
          <GerenciarColunas />
          <NovoClienteDialog />
        </div>
      </div>

      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="overflow-auto scrollbar-thin max-h-[calc(100vh-160px)]">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-muted/50 z-10">
              <tr>
                {colunasVisiveis.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5 border-b border-r",
                      c.fixada && "sticky left-0 bg-muted/50 z-20"
                    )}
                    style={{ minWidth: c.largura, width: c.largura }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statusOptions.map((status) => {
                const items = grupos[status.label] ?? [];
                const colapsado = grupoColapsado[status.label];
                return (
                  <Fragment2 key={status.label}>
                    <tr className="bg-muted/30 hover:bg-muted/40 sticky">
                      <td colSpan={colunasVisiveis.length} className="px-2 py-1 border-b">
                        <button
                          onClick={() => setGrupoColapsado((g) => ({ ...g, [status.label]: !colapsado }))}
                          className="flex items-center gap-1.5 text-xs font-medium"
                        >
                          {colapsado ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          <ColorBadge label={status.label.toUpperCase()} color={status.cor} />
                          <span className="text-muted-foreground text-[11px]">{items.length}</span>
                        </button>
                      </td>
                    </tr>
                    {!colapsado && items.map((cliente) => (
                      <tr key={cliente.id} className="hover:bg-accent/30 transition-colors">
                        {colunasVisiveis.map((col, i) => (
                          <td
                            key={col.key}
                            className={cn(
                              "px-2 py-1.5 border-b border-r align-middle",
                              col.fixada && "sticky left-0 bg-card"
                            )}
                            style={{ minWidth: col.largura, width: col.largura }}
                          >
                            {i === 0 && col.key === "nome_cliente" ? (
                              <Link to={`/clientes/${cliente.id}`} className="text-primary text-xs font-medium hover:underline truncate block">
                                {cliente.nome_cliente}
                              </Link>
                            ) : (
                              <CelulaValor col={col} cliente={cliente} onAbrirHistorico={setHistoricoClienteId} />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment2>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={colunasVisiveis.length} className="text-center py-10 text-muted-foreground text-xs">Nenhum cliente encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HistoricoComentariosDialog
        clienteId={historicoClienteId}
        open={!!historicoClienteId}
        onOpenChange={(v) => !v && setHistoricoClienteId(null)}
      />
    </div>
  );
}

import { Fragment as Fragment2 } from "react";
