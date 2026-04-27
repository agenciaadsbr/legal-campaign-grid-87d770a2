import { useCRM, ColumnConfig, DropdownOption } from "@/store/crm";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Settings2, ChevronDown, ChevronRight, Trash2, Eye, EyeOff, GripVertical, Pin, PinOff, Save, BookmarkCheck, Filter, CheckCircle2, X, Settings, Zap, AlertCircle, Clock, ChevronsUpDown, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { AvatarStack } from "@/components/AvatarStack";
import { ColorBadge } from "@/components/StatusBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { OpcoesEditor } from "@/components/OpcoesEditor";
import { ResponsaveisEditor } from "@/components/ResponsaveisEditor";
import { CamposPersonalizadosEditor } from "@/components/CamposPersonalizadosEditor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/hooks/useAuth";
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
import { ClientesGeralTable } from "@/components/clientes/ClientesGeralTable";
import { StatusClienteBadge, STATUS_CLIENTE_OPCOES } from "@/components/StatusClienteBadge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  const { addCliente, updateCliente, deleteCliente, nichos, statusOptions } = useCRM();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const hojeISO = new Date().toISOString().slice(0, 10);
  const calcFim = (inicioISO: string, meses: number) => {
    const d = new Date(inicioISO);
    d.setMonth(d.getMonth() + meses);
    return d.toISOString().slice(0, 10);
  };
  const initialForm = () => ({
    nome_cliente: "",
    nicho: nichos[0]?.label ?? "",
    status_cliente: "Ativo" as any,
    status_global: "Onboarding" as any,
    prazo_onboarding: "" as string,
    data_inicio_contrato: hojeISO,
    duracao_meses: 3,
    data_fim_contrato: calcFim(hojeISO, 3),
    responsaveis: [] as string[],
    observacoes: "",
  });
  const [form, setForm] = useState(initialForm());

  const setInicio = (v: string) =>
    setForm((f) => ({ ...f, data_inicio_contrato: v, data_fim_contrato: calcFim(v, f.duracao_meses) }));

  const setMeses = (m: number) =>
    setForm((f) => ({ ...f, duracao_meses: m, data_fim_contrato: calcFim(f.data_inicio_contrato, m) }));

  const totalCards = form.duracao_meses * 4;
  const isEdit = createdId !== null;

  const resetAll = () => {
    setForm(initialForm());
    setCreatedId(null);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) resetAll();
  };

  const submitCreate = async () => {
    if (!form.nome_cliente.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    setSaving(true);
    try {
      const { duracao_meses, prazo_onboarding, status_global, ...rest } = form;
      const payload = {
        ...rest,
        status_global,
        prazo_onboarding: prazo_onboarding || null,
      };
      const id = await addCliente(payload as any);
      setCreatedId(id);
      toast.success(`Cliente criado — ${totalCards} cards e contrato gerados automaticamente`);
    } catch (e: any) {
      toast.error(`Erro ao criar: ${e?.message ?? "tente novamente"}`);
    } finally {
      setSaving(false);
    }
  };

  const submitUpdate = async () => {
    if (!createdId) return;
    if (!form.nome_cliente.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    setSaving(true);
    try {
      const { duracao_meses, prazo_onboarding, ...patch } = form;
      await updateCliente(createdId, {
        ...(patch as any),
        prazo_onboarding: prazo_onboarding || null,
      });
      toast.success("Alterações salvas");
    } catch (e: any) {
      toast.error(`Erro ao atualizar: ${e?.message ?? "tente novamente"}`);
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!createdId) return;
    try {
      await deleteCliente(createdId);
      toast.success("Cliente removido");
      setConfirmDel(false);
      handleOpenChange(false);
    } catch (e: any) {
      toast.error(`Erro ao remover: ${e?.message ?? "tente novamente"}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
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
              <Select
                value={form.status_global}
                onValueChange={(v) => setForm({ ...form, status_global: v as any, status_cliente: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Onboarding">Onboarding</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Prazo de onboarding</Label>
            <Input
              type="date"
              value={form.prazo_onboarding}
              onChange={(e) => setForm({ ...form, prazo_onboarding: e.target.value })}
            />
          </div>
          <div>
            <Label>Responsáveis</Label>
            <ResponsaveisPicker value={form.responsaveis} onChange={(v) => setForm({ ...form, responsaveis: v })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={form.data_inicio_contrato} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <Label>Duração</Label>
              <Select value={String(form.duracao_meses)} onValueChange={(v) => setMeses(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 9, 12].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} {m === 1 ? "mês" : "meses"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={form.data_fim_contrato} onChange={(e) => setForm({ ...form, data_fim_contrato: e.target.value })} />
            </div>
          </div>
          {!isEdit && (
            <div className="text-xs text-muted-foreground">
              Serão criados <span className="font-medium text-foreground">{totalCards} cards</span> ({form.duracao_meses} {form.duracao_meses === 1 ? "mês" : "meses"} × 4 semanas).
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
          {!isEdit ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={submitCreate} disabled={saving}>
                {saving ? "Criando..." : "Criar Cliente"}
              </Button>
            </>
          ) : (
            <>
              {isAdmin && (
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
                  onClick={() => setConfirmDel(true)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" /> Remover
                </Button>
              )}
              <Button variant="outline" onClick={resetAll} disabled={saving}>
                Novo
              </Button>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
                Fechar
              </Button>
              <Button onClick={submitUpdate} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá <strong>{form.nome_cliente}</strong> e todos os cards, posts,
              contratos e alertas vinculados. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={submitDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function EditarClienteDialog({
  cliente,
  open,
  onOpenChange,
}: {
  cliente: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { updateCliente, nichos, statusOptions } = useCRM();
  const calcMeses = (ini?: string, fim?: string) => {
    if (!ini || !fim) return 3;
    const a = new Date(ini);
    const b = new Date(fim);
    const m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    return Math.max(1, m);
  };
  const calcFim = (inicioISO: string, meses: number) => {
    const d = new Date(inicioISO);
    d.setMonth(d.getMonth() + meses);
    return d.toISOString().slice(0, 10);
  };
  const [form, setForm] = useState({
    nome_cliente: cliente?.nome_cliente ?? "",
    nicho: cliente?.nicho ?? "",
    status_cliente: cliente?.status_cliente ?? "Ativo",
    status_global: (cliente?.status_global ?? "Onboarding") as any,
    prazo_onboarding: (cliente?.prazo_onboarding ?? "") as string,
    data_inicio_contrato: cliente?.data_inicio_contrato ?? "",
    duracao_meses: calcMeses(cliente?.data_inicio_contrato, cliente?.data_fim_contrato),
    data_fim_contrato: cliente?.data_fim_contrato ?? "",
    responsaveis: cliente?.responsaveis ?? [],
    observacoes: cliente?.observacoes ?? "",
  });

  const setInicio = (v: string) =>
    setForm((f) => ({ ...f, data_inicio_contrato: v, data_fim_contrato: calcFim(v, f.duracao_meses) }));
  const setMeses = (m: number) =>
    setForm((f) => ({ ...f, duracao_meses: m, data_fim_contrato: calcFim(f.data_inicio_contrato, m) }));

  const submit = async () => {
    if (!form.nome_cliente.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    try {
      const { duracao_meses, prazo_onboarding, ...patch } = form;
      await updateCliente(cliente.id, {
        ...(patch as any),
        prazo_onboarding: prazo_onboarding || null,
      });
      toast.success("Cliente atualizado");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Erro ao atualizar: ${e?.message ?? "tente novamente"}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Editar Cliente</DialogTitle></DialogHeader>
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
              <Select
                value={form.status_global}
                onValueChange={(v) => setForm({ ...form, status_global: v as any, status_cliente: v as any })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Onboarding">Onboarding</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Prazo de onboarding</Label>
            <Input
              type="date"
              value={form.prazo_onboarding}
              onChange={(e) => setForm({ ...form, prazo_onboarding: e.target.value })}
            />
          </div>
          <div>
            <Label>Responsáveis</Label>
            <ResponsaveisPicker value={form.responsaveis} onChange={(v) => setForm({ ...form, responsaveis: v })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={form.data_inicio_contrato} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <Label>Duração</Label>
              <Select value={String(form.duracao_meses)} onValueChange={(v) => setMeses(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 9, 12].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} {m === 1 ? "mês" : "meses"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AcoesCliente({ cliente }: { cliente: any }) {
  const { updateCliente, deleteCliente } = useCRM();
  const { isAdmin, canWrite } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  // satisfies linter: updateCliente é usado no dialog filho
  void updateCliente;

  const handleDelete = async () => {
    try {
      await deleteCliente(cliente.id);
      toast.success("Cliente excluído");
      setDelOpen(false);
    } catch (e: any) {
      toast.error(`Erro ao excluir: ${e?.message ?? "tente novamente"}`);
    }
  };

  if (!canWrite && !isAdmin) return null;

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {canWrite && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          title="Editar cliente"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {isAdmin && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Excluir cliente"
          onClick={() => setDelOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
      {editOpen && (
        <EditarClienteDialog cliente={cliente} open={editOpen} onOpenChange={setEditOpen} />
      )}
      <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{cliente.nome_cliente}</strong>? Todos os
              cards, posts, contratos e alertas vinculados serão removidos. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
    const atrasados = cardsCliente.filter((c) => c.status_card === "Atrasado").length;
    return (
      <div className="flex flex-col leading-tight tabular-nums">
        <span className="text-xs font-medium">{postados}/{total} posts</span>
        {atrasados > 0 && (
          <span className="text-[11px] text-destructive font-semibold">
            ⚠ {atrasados} atrasado{atrasados > 1 ? "s" : ""}
          </span>
        )}
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
        <span className="text-xs truncate flex-1">
          {tem ? String(valor).replace(/<[^>]*>/g, "") : ""}
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
      const fonte = col.opcoes && col.opcoes.length > 0 ? col.opcoes : (col.key === "nicho" ? nichos : []);
      const opt = fonte.find((o) => o.label === valor);
      if (col.key === "nicho") {
        if (!valor) return <span className="text-muted-foreground text-xs">—</span>;
        return opt ? <ColorBadge label={opt.label} color={opt.cor} /> : <span className="text-xs">{String(valor)}</span>;
      }
      if (!opt) return <span className="text-muted-foreground text-xs">—</span>;
      return <ColorBadge label={opt.label} color={opt.cor} />;
    }
    case "status": {
      const opt = statusOptions.find((o) => o.label === valor);
      return opt ? <ColorBadge label={opt.label} color={opt.cor} variant="filled" /> : <span className="text-muted-foreground text-xs">—</span>;
    }
    case "data":
      return valor ? <span className="text-xs">{new Date(valor).toLocaleDateString("pt-BR")}</span> : <span className="text-muted-foreground text-xs">—</span>;
    case "link":
      return valor ? <a href={valor} className="text-primary text-xs underline" target="_blank">link</a> : <span className="text-muted-foreground text-xs">—</span>;
    default:
      return <span className="text-xs truncate block" title={valor}>{valor || <span className="text-muted-foreground">—</span>}</span>;
  }
}

function ConfiguracoesSheet() {
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const _loadAll = useCRM((s) => s._loadAll);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await _loadAll();
      toast.success("Configurações salvas com sucesso");
      setOpen(false);
    } catch (e) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-8" title="Configurações do painel">
          <Settings className="h-3.5 w-3.5" />
          <span className="text-xs">Configurações do painel</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-xl w-full overflow-y-auto p-4 flex flex-col">
        <SheetHeader className="mb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" /> Configurações do painel
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-3 flex-1">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Status do Cliente</CardTitle></CardHeader>
            <CardContent><OpcoesEditor tipo="status" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Status de Posts</CardTitle></CardHeader>
            <CardContent><OpcoesEditor tipo="status_post" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Nichos</CardTitle></CardHeader>
            <CardContent><OpcoesEditor tipo="nicho" /></CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Responsáveis</CardTitle></CardHeader>
            <CardContent><ResponsaveisEditor /></CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Campos Personalizados</CardTitle></CardHeader>
            <CardContent><CamposPersonalizadosEditor /></CardContent>
          </Card>
        </div>
        <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-1 bg-background border-t flex items-center justify-between gap-2 mt-3">
          <p className="text-[11px] text-muted-foreground">Cada item já é salvo automaticamente no banco ao adicionar/editar.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={salvando}>
              Fechar
            </Button>
            <Button size="sm" onClick={handleSalvar} disabled={salvando} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {salvando ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}


function FiltrosTopo({
  filtroResponsaveis,
  setFiltroResponsaveis,
  apenasMinhas,
  setApenasMinhas,
  currentUserId,
}: {
  filtroResponsaveis: string[];
  setFiltroResponsaveis: (v: string[]) => void;
  apenasMinhas: boolean;
  setApenasMinhas: (v: boolean) => void;
  currentUserId: string | null;
}) {
  const { responsaveis } = useCRM();
  const currentUser = responsaveis.find((r) => r.id === currentUserId);
  const toggle = (id: string) => {
    setFiltroResponsaveis(
      filtroResponsaveis.includes(id)
        ? filtroResponsaveis.filter((v) => v !== id)
        : [...filtroResponsaveis, id]
    );
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 relative">
            <Filter className="h-3.5 w-3.5" />
            <span className="text-xs">Filtrar por responsável do post</span>
            {filtroResponsaveis.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                {filtroResponsaveis.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="text-[11px] text-muted-foreground px-2 pb-1.5">Responsáveis do post</div>
          <div className="max-h-60 overflow-auto space-y-0.5">
            {responsaveis.map((r) => {
              const checked = filtroResponsaveis.includes(r.id);
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
          {filtroResponsaveis.length > 0 && (
            <div className="border-t mt-2 pt-2 flex justify-end">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setFiltroResponsaveis([])}>
                <X className="h-3 w-3" /> Limpar
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Button
        size="sm"
        variant={apenasMinhas ? "default" : "outline"}
        className="gap-1.5 h-8"
        onClick={() => setApenasMinhas(!apenasMinhas)}
        disabled={!currentUserId}
        title={currentUserId ? "Mostrar apenas clientes onde sou responsável" : "Cadastre um responsável para usar este filtro"}
      >
        {currentUser ? (
          <div
            className="h-4 w-4 rounded-full text-white text-[8px] font-semibold flex items-center justify-center shrink-0"
            style={{ backgroundColor: currentUser.cor }}
          >
            {currentUser.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        <span className="text-xs">Minhas tarefas</span>
      </Button>
    </div>
  );
}

export default function Clientes() {
  const { clientes, colunasCliente, statusOptions, statusPostOptions, cards, responsaveis } = useCRM();
  const { canWrite, isAdmin } = useAuth();
  const [busca, setBusca] = useState("");
  const [grupoColapsado, setGrupoColapsado] = useState<Record<string, boolean>>({});
  const [historicoClienteId, setHistoricoClienteId] = useState<string | null>(null);
  const [filtroResponsaveis, setFiltroResponsaveis] = useState<string[]>([]);
  const [apenasMinhas, setApenasMinhas] = useState(false);
  const [filtroStatusCliente, setFiltroStatusCliente] = useState<string>("todos");
  const [filtroStatusGlobal, setFiltroStatusGlobal] = useState<string>(
    () => localStorage.getItem("clientes:filtroStatusGlobal") ?? "todos",
  );
  const [visao, setVisao] = useState<"clientes" | "status">(
    () => (localStorage.getItem("clientes:visao") as any) ?? "clientes",
  );

  // Persistência das preferências do usuário
  useEffect(() => {
    localStorage.setItem("clientes:visao", visao);
  }, [visao]);
  useEffect(() => {
    localStorage.setItem("clientes:filtroStatusGlobal", filtroStatusGlobal);
  }, [filtroStatusGlobal]);

  // Placeholder do usuário atual: primeiro responsável cadastrado.
  const currentUserId = responsaveis[0]?.id ?? null;

  const colunasVisiveis = useMemo(
    () => [...colunasCliente].filter((c) => !c.oculta).sort((a, b) => a.ordem - b.ordem),
    [colunasCliente]
  );

  // Responsáveis dos POSTS (cards) por cliente — usado nos filtros do módulo Clientes/Posts.
  // Não usa o "responsável geral do cliente" (c.responsaveis), que é apenas informativo.
  const respsPostsPorCliente = useMemo(() => {
    const map = new Map<string, Set<string>>();
    cards.forEach((card) => {
      let set = map.get(card.cliente_id);
      if (!set) { set = new Set<string>(); map.set(card.cliente_id, set); }
      (card.responsaveis ?? []).forEach((r) => set!.add(r));
    });
    return map;
  }, [cards]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return clientes
      .filter((c) => {
        if (!termo) return true;
        return (
          c.nome_cliente?.toLowerCase().includes(termo) ||
          (c.nicho ?? "").toLowerCase().includes(termo) ||
          (c.observacoes ?? "").toLowerCase().includes(termo) ||
          (c.status_cliente ?? "").toLowerCase().includes(termo)
        );
      })
      .filter((c) => {
        if (filtroResponsaveis.length === 0) return true;
        const respsPosts = respsPostsPorCliente.get(c.id);
        if (!respsPosts || respsPosts.size === 0) return false;
        return filtroResponsaveis.some((r) => respsPosts.has(r));
      })
      .filter((c) => {
        if (!apenasMinhas) return true;
        if (!currentUserId) return false;
        const respsPosts = respsPostsPorCliente.get(c.id);
        return !!respsPosts && respsPosts.has(currentUserId);
      })
      // Quando há busca ativa, ignora o filtro de status para permitir achar qualquer cliente
      .filter((c) => !!termo || filtroStatusCliente === "todos" || c.status_cliente === filtroStatusCliente);
  }, [clientes, busca, filtroResponsaveis, apenasMinhas, currentUserId, filtroStatusCliente, respsPostsPorCliente]);


  const GRUPOS = ["Revisar", "Criar", "Concluidos"] as const;
  const [apenasPendentes, setApenasPendentes] = useState(false);
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

  const pendentesPorCliente = useMemo(() => {
    const map: Record<string, { total: number; pendentes: number }> = {};
    cards.forEach((card) => {
      if (!map[card.cliente_id]) map[card.cliente_id] = { total: 0, pendentes: 0 };
      map[card.cliente_id].total += 1;
      if (card.status_card !== "Postado" && card.status_card !== "Planejamento") map[card.cliente_id].pendentes += 1;
    });
    return map;
  }, [cards]);

  // Classifica cards por prioridade (atrasado / urgente / hoje)
  type Prioridade = "atrasado" | "urgente" | "hoje";
  const tarefasPorCliente = useMemo(() => {
    const hojeStart = new Date(); hojeStart.setHours(0, 0, 0, 0);
    const amanhaStart = new Date(hojeStart); amanhaStart.setDate(amanhaStart.getDate() + 1);
    const map: Record<string, { atrasado: typeof cards; urgente: typeof cards; hoje: typeof cards }> = {};
    cards.forEach((card) => {
      if (card.status_card === "Postado" || card.status_card === "Planejamento") return;
      const due = card.data_agendada ? new Date(card.data_agendada) : null;
      let prio: Prioridade | null = null;
      if (card.status_card === "Atrasado" || (due && due < hojeStart)) prio = "atrasado";
      else if (card.is_urgent) prio = "urgente";
      else if (due && due >= hojeStart && due < amanhaStart) prio = "hoje";
      if (!prio) return;
      if (!map[card.cliente_id]) map[card.cliente_id] = { atrasado: [], urgente: [], hoje: [] };
      map[card.cliente_id][prio].push(card);
    });
    return map;
  }, [cards]);

  const filtradosFinal = useMemo(() => {
    if (!apenasPendentes || busca.trim()) return filtrados;
    return filtrados.filter((c) => {
      const t = tarefasPorCliente[c.id];
      return t && (t.atrasado.length + t.urgente.length + t.hoje.length) > 0;
    });
  }, [filtrados, apenasPendentes, tarefasPorCliente, busca]);


  const gruposPosts = useMemo(() => {
    const map: Record<string, typeof clientes> = { Revisar: [], Criar: [], Concluidos: [] };
    filtradosFinal.forEach((c) => {
      const stats = pendentesPorCliente[c.id];
      // Concluído = tem cards e todos estão postados (sem pendentes).
      // Cliente sem nenhum card NÃO é concluído — vai para "Criar" para ficar visível.
      const concluido = !!stats && stats.total > 0 && stats.pendentes === 0;
      if (concluido) {
        if (mostrarConcluidos || busca.trim()) map.Concluidos.push(c);
        return;
      }
      const ps = (c.primary_status as string) === "Revisar" ? "Revisar" : "Criar";
      map[ps].push(c);
    });
    return map;
  }, [filtradosFinal, pendentesPorCliente, mostrarConcluidos, busca]);


  const algumGrupoAberto = useMemo(
    // Revisar e Criar são fixos (sempre renderizam). Concluídos só aparece com toggle.
    () => !grupoColapsado["post:Revisar"] || !grupoColapsado["post:Criar"] ||
          (mostrarConcluidos && (gruposPosts.Concluidos?.length ?? 0) > 0 && !grupoColapsado["post:Concluidos"]),
    [gruposPosts, grupoColapsado, mostrarConcluidos]
  );

  return (
    <div className="px-5 py-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold leading-tight">Clientes/Posts</h1>
            <p className="text-xs text-muted-foreground">{clientes.length} clientes</p>
          </div>
          <ToggleGroup
            type="single"
            value={visao}
            onValueChange={(v) => v && setVisao(v as any)}
            className="border rounded-md p-0.5"
          >
            <ToggleGroupItem value="clientes" className="h-7 px-2 text-xs">Clientes</ToggleGroupItem>
            <ToggleGroupItem value="status" className="h-7 px-2 text-xs">Status</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filtroStatusGlobal} onValueChange={setFiltroStatusGlobal}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Status do cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {STATUS_CLIENTE_OPCOES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {visao === "status" && (
            <>
              <label className="flex items-center gap-1.5 text-xs px-2 h-8 rounded-md border bg-card cursor-pointer">
                <Switch checked={apenasPendentes} onCheckedChange={setApenasPendentes} />
                <span>Apenas com ações pendentes</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs px-2 h-8 rounded-md border bg-card cursor-pointer">
                <Switch checked={mostrarConcluidos} onCheckedChange={setMostrarConcluidos} />
                <span>Mostrar concluídos</span>
              </label>
            </>
          )}
          <FiltrosTopo
            filtroResponsaveis={filtroResponsaveis}
            setFiltroResponsaveis={setFiltroResponsaveis}
            apenasMinhas={apenasMinhas}
            setApenasMinhas={setApenasMinhas}
            currentUserId={currentUserId}
          />
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..." className="pl-8 h-8 w-56 text-sm" />
          </div>
          {isAdmin && <ConfiguracoesSheet />}
          {isAdmin && <GerenciarColunas />}
          {canWrite && <NovoClienteDialog />}
        </div>
      </div>

      {visao === "clientes" ? (
        <ClientesGeralTable
          filtroBusca={busca}
          filtroResponsaveis={filtroResponsaveis}
          apenasMinhas={apenasMinhas}
          currentUserId={currentUserId}
          filtroStatusGlobal={filtroStatusGlobal}
          onAbrirHistorico={setHistoricoClienteId}
          acoesSlot={(clienteId) => {
            const cli = clientes.find((c) => c.id === clienteId);
            return cli ? <AcoesCliente cliente={cli} /> : null;
          }}
        />
      ) : (
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="overflow-auto scrollbar-thin max-h-[calc(100vh-160px)]">
          <table className="w-full text-xs border-collapse">
            {algumGrupoAberto && (
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
                  <th
                    className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5 border-b sticky right-0 bg-muted/50 z-20"
                    style={{ minWidth: 90, width: 90 }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>
            )}
            <tbody>
              {GRUPOS.map((statusLabel) => {
                const statusOpt = statusLabel === "Concluidos" ? undefined : statusPostOptions.find((s) => s.label === statusLabel);
                const cor = statusOpt?.cor ?? (
                  statusLabel === "Revisar" ? "#f59e0b" :
                  statusLabel === "Criar" ? "#3b82f6" :
                  "#9ca3af"
                );
                const labelExibido = statusLabel === "Concluidos" ? "Concluídos" : statusLabel;
                const items = gruposPosts[statusLabel] ?? [];
                const key = `post:${statusLabel}`;
                const colapsado = grupoColapsado[key];
                // Concluídos: só aparece se toggle ativo E houver itens.
                // Revisar / Criar: sempre fixos (mesmo vazios).
                if (statusLabel === "Concluidos" && items.length === 0) return null;
                return (
                  <Fragment2 key={key}>
                    <tr className="bg-muted/60 hover:bg-muted/70 sticky">
                      <td
                        colSpan={colunasVisiveis.length + 1}
                        className={cn("px-2 py-2 border-l-4", !colapsado && "border-b")}
                        style={{ borderLeftColor: cor }}
                      >
                        <button
                          onClick={() => setGrupoColapsado((g) => ({ ...g, [key]: !colapsado }))}
                          className="flex items-center gap-2 text-sm font-semibold w-full"
                        >
                          {colapsado ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          <ColorBadge label={labelExibido.toUpperCase()} color={cor} variant="filled" />
                          <span
                            className="ml-1 inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums"
                            style={{ backgroundColor: `${cor}26`, color: cor }}
                          >
                            {items.length}
                          </span>
                        </button>
                      </td>
                    </tr>
                    {!colapsado && items.length === 0 && (
                      <tr>
                        <td
                          colSpan={colunasVisiveis.length + 1}
                          className="px-4 py-3 border-b text-[11px] text-muted-foreground italic"
                        >
                          Nenhum cliente neste status
                        </td>
                      </tr>
                    )}
                    {!colapsado && items.map((cliente) => {
                      const tarefas = tarefasPorCliente[cliente.id] ?? { atrasado: [], urgente: [], hoje: [] };
                      const total = tarefas.atrasado.length + tarefas.urgente.length + tarefas.hoje.length;
                      return (
                        <tr key={`${key}-${cliente.id}`} className="hover:bg-accent/30 transition-colors">
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
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Link
                                    to={`/clientes/${cliente.id}`}
                                    className="text-primary text-xs font-medium hover:underline truncate"
                                  >
                                    {cliente.nome_cliente}
                                  </Link>
                                  {total > 0 && (
                                    <TarefasInline tarefas={tarefas} clienteId={cliente.id} />
                                  )}
                                </div>
                              ) : (
                                <CelulaValor col={col} cliente={cliente} onAbrirHistorico={setHistoricoClienteId} />
                              )}
                            </td>
                          ))}
                          <td
                            className="px-2 py-1.5 border-b align-middle sticky right-0 bg-card"
                            style={{ minWidth: 90, width: 90 }}
                          >
                            <AcoesCliente cliente={cliente} />
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment2>
                );
              })}

              {filtradosFinal.length === 0 && (
                <tr><td colSpan={colunasVisiveis.length + 1} className="text-center py-10 text-muted-foreground text-xs">
                  {apenasPendentes ? "Nenhum cliente com ações pendentes" : "Nenhum cliente encontrado"}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <HistoricoComentariosDialog
        clienteId={historicoClienteId}
        open={!!historicoClienteId}
        onOpenChange={(v) => !v && setHistoricoClienteId(null)}
      />
    </div>
  );
}

function TarefasInline({
  tarefas,
  clienteId,
}: {
  tarefas: { atrasado: any[]; urgente: any[]; hoje: any[] };
  clienteId: string;
}) {
  const [open, setOpen] = useState(false);
  const total = tarefas.atrasado.length + tarefas.urgente.length + tarefas.hoje.length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-accent border border-transparent hover:border-border transition-colors"
          aria-label={`${total} tarefas pendentes`}
        >
          {tarefas.atrasado.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-destructive">
              <AlertCircle className="h-3 w-3" /> {tarefas.atrasado.length}
            </span>
          )}
          {tarefas.urgente.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-500">
              <Zap className="h-3 w-3" /> {tarefas.urgente.length}
            </span>
          )}
          {tarefas.hoje.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-yellow-600">
              <Clock className="h-3 w-3" /> {tarefas.hoje.length}
            </span>
          )}
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <ListaTarefasGrupo titulo="Atrasadas" cor="text-destructive" Icon={AlertCircle} items={tarefas.atrasado} clienteId={clienteId} />
        <ListaTarefasGrupo titulo="Urgentes" cor="text-orange-500" Icon={Zap} items={tarefas.urgente} clienteId={clienteId} />
        <ListaTarefasGrupo titulo="Hoje" cor="text-yellow-600" Icon={Clock} items={tarefas.hoje} clienteId={clienteId} />
      </PopoverContent>
    </Popover>
  );
}

function ListaTarefasGrupo({
  titulo,
  cor,
  Icon,
  items,
  clienteId,
}: {
  titulo: string;
  cor: string;
  Icon: any;
  items: any[];
  clienteId: string;
}) {
  if (items.length === 0) return null;
  const visiveis = items.slice(0, 5);
  const restante = items.length - visiveis.length;
  return (
    <div className="mb-2 last:mb-0">
      <div className={cn("flex items-center gap-1 text-[11px] font-semibold mb-1", cor)}>
        <Icon className="h-3 w-3" /> {titulo} ({items.length})
      </div>
      <div className="space-y-0.5">
        {visiveis.map((c) => (
          <Link
            key={c.id}
            to={`/clientes/${clienteId}`}
            className="block px-2 py-1 rounded-md text-[11px] hover:bg-accent truncate"
          >
            • {c.titulo_card || `Card ${c.numero_semana}`}
          </Link>
        ))}
        {restante > 0 && (
          <div className="px-2 py-0.5 text-[10px] text-muted-foreground">+{restante} tarefa{restante > 1 ? "s" : ""}</div>
        )}
      </div>
    </div>
  );
}

import { Fragment as Fragment2 } from "react";
