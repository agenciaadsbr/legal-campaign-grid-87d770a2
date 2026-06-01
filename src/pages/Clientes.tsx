import { useCRM, ColumnConfig, DropdownOption } from "@/store/crm";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Settings2, ChevronDown, ChevronRight, Trash2, Eye, EyeOff, GripVertical, Pin, PinOff, Save, BookmarkCheck, Filter, CheckCircle2, X, Settings, Zap, AlertCircle, Clock, ChevronsUpDown, Pencil, Rocket } from "lucide-react";
import { ImportarClientesDialog } from "@/components/ativacao/ImportarClientesDialog";
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
import { ClientesGeralTable, type FiltroPeriodo, type PeriodoPreset } from "@/components/clientes/ClientesGeralTable";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { StatusClienteBadge, STATUS_CLIENTE_OPCOES } from "@/components/StatusClienteBadge";
import { EstrategiasConfigEditor } from "@/components/estrategias/EstrategiasConfigEditor";
import { lerEstrategiasManuais, type EstrategiaId, type EstrategiaStatus } from "@/lib/estrategiasAtivas";


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

// Planos comerciais — usados nos diálogos de cliente
type PlanoNominal = "Mensal" | "Trimestral" | "Semestral" | "Anual" | "Personalizado";
const PLANOS_NOMINAIS: PlanoNominal[] = ["Mensal", "Trimestral", "Semestral", "Anual", "Personalizado"];
const PLANO_MESES: Record<PlanoNominal, number | null> = {
  Mensal: 1,
  Trimestral: 3,
  Semestral: 6,
  Anual: 12,
  Personalizado: null, // mantém input manual
};

// Util: deduzir plano nominal a partir da duração
function inferirPlano(meses: number): PlanoNominal {
  if (meses === 1) return "Mensal";
  if (meses === 3) return "Trimestral";
  if (meses === 6) return "Semestral";
  if (meses === 12) return "Anual";
  return "Personalizado";
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
    nicho_extra: "",
    status_cliente: "Ativo" as any,
    status_global: "Onboarding" as any,
    prazo_onboarding: "" as string,
    data_inicio_contrato: hojeISO,
    duracao_meses: 3,
    data_fim_contrato: calcFim(hojeISO, 3),
    plano: "Trimestral" as PlanoNominal,
    valor_venda: "" as string,
    responsaveis: [] as string[],
    observacoes: "",
  });
  const [form, setForm] = useState(initialForm());
  const [estrategias, setEstrategias] = useState<Record<EstrategiaId, EstrategiaStatus>>({
    meta_ads: "nao_usar",
    google_ads: "nao_usar",
    posts: "nao_usar",
    gmn: "nao_usar",
    crm: "nao_usar",
  });

  const setInicio = (v: string) =>
    setForm((f) => ({ ...f, data_inicio_contrato: v, data_fim_contrato: calcFim(v, f.duracao_meses) }));

  const setMeses = (m: number) =>
    setForm((f) => ({ ...f, duracao_meses: m, data_fim_contrato: calcFim(f.data_inicio_contrato, m) }));

  const setPlano = (p: PlanoNominal) =>
    setForm((f) => {
      const meses = PLANO_MESES[p];
      if (meses === null) return { ...f, plano: p };
      return {
        ...f,
        plano: p,
        duracao_meses: meses,
        data_fim_contrato: calcFim(f.data_inicio_contrato, meses),
      };
    });

  const totalCards = form.duracao_meses * 4;
  const isEdit = createdId !== null;

  const resetAll = () => {
    setForm(initialForm());
    setCreatedId(null);
    setEstrategias({
      meta_ads: "nao_usar", google_ads: "nao_usar", posts: "nao_usar",
      gmn: "nao_usar", crm: "nao_usar",
    });
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
      const { duracao_meses, prazo_onboarding, status_global, valor_venda, ...rest } = form;
      const payload = {
        ...rest,
        status_global,
        prazo_onboarding: prazo_onboarding || null,
        valor_venda: valor_venda ? Number(String(valor_venda).replace(",", ".")) : null,
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
      const { duracao_meses, prazo_onboarding, valor_venda, ...patch } = form;
      await updateCliente(createdId, {
        ...(patch as any),
        prazo_onboarding: prazo_onboarding || null,
        valor_venda: valor_venda ? Number(String(valor_venda).replace(",", ".")) : null,
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
            <Label>Nicho extra (opcional)</Label>
            <Input
              value={form.nicho_extra}
              onChange={(e) => setForm({ ...form, nicho_extra: e.target.value })}
              placeholder="Ex.: Bancário, Trabalhista..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plano</Label>
              <Select value={form.plano} onValueChange={(v) => setPlano(v as PlanoNominal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLANOS_NOMINAIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor de venda (R$)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.valor_venda}
                onChange={(e) => setForm({ ...form, valor_venda: e.target.value })}
                placeholder="0,00"
              />
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
    nicho_extra: cliente?.nicho_extra ?? "",
    status_cliente: cliente?.status_cliente ?? "Ativo",
    status_global: (cliente?.status_global ?? "Onboarding") as any,
    prazo_onboarding: (cliente?.prazo_onboarding ?? "") as string,
    data_inicio_contrato: cliente?.data_inicio_contrato ?? "",
    duracao_meses: calcMeses(cliente?.data_inicio_contrato, cliente?.data_fim_contrato),
    data_fim_contrato: cliente?.data_fim_contrato ?? "",
    plano: (cliente?.plano ?? inferirPlano(calcMeses(cliente?.data_inicio_contrato, cliente?.data_fim_contrato))) as PlanoNominal,
    valor_venda: (cliente?.valor_venda != null ? String(cliente.valor_venda) : "") as string,
    responsaveis: cliente?.responsaveis ?? [],
    observacoes: cliente?.observacoes ?? "",
    oculto: !!cliente?.oculto,
  });

  const setInicio = (v: string) =>
    setForm((f) => ({ ...f, data_inicio_contrato: v, data_fim_contrato: calcFim(v, f.duracao_meses) }));
  const setMeses = (m: number) =>
    setForm((f) => ({ ...f, duracao_meses: m, data_fim_contrato: calcFim(f.data_inicio_contrato, m), plano: inferirPlano(m) }));
  const setPlano = (p: PlanoNominal) =>
    setForm((f) => {
      const meses = PLANO_MESES[p];
      if (meses === null) return { ...f, plano: p };
      return {
        ...f,
        plano: p,
        duracao_meses: meses,
        data_fim_contrato: calcFim(f.data_inicio_contrato, meses),
      };
    });

  const submit = async () => {
    if (!form.nome_cliente.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    try {
      const { duracao_meses, prazo_onboarding, valor_venda, ...patch } = form;
      const ocultoMudou = !!cliente?.oculto !== !!form.oculto;
      await updateCliente(cliente.id, {
        ...(patch as any),
        prazo_onboarding: prazo_onboarding || null,
        valor_venda: valor_venda ? Number(String(valor_venda).replace(",", ".")) : null,
      });
      if (ocultoMudou) {
        toast.success(form.oculto ? "Cliente ocultado do painel" : "Cliente reexibido no painel");
      } else {
        toast.success("Cliente atualizado");
      }
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
            <Label>Nicho extra (opcional)</Label>
            <Input
              value={form.nicho_extra}
              onChange={(e) => setForm({ ...form, nicho_extra: e.target.value })}
              placeholder="Ex.: Bancário, Trabalhista..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plano</Label>
              <Select value={form.plano} onValueChange={(v) => setPlano(v as PlanoNominal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLANOS_NOMINAIS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor de venda (R$)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.valor_venda}
                onChange={(e) => setForm({ ...form, valor_venda: e.target.value })}
                placeholder="0,00"
              />
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
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Ocultar cliente do painel</Label>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Clientes ocultos não aparecem na listagem principal, mas continuam no banco e nos relatórios internos. Use "Mostrar ocultos" para reexibir.
                </p>
              </div>
              <Switch
                checked={!!form.oculto}
                onCheckedChange={(v) => setForm({ ...form, oculto: !!v })}
              />
            </div>
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
  const { deleteCliente, updateCliente } = useCRM();
  const { isAdmin, canWrite } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [enviandoCentral, setEnviandoCentral] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteCliente(cliente.id);
      toast.success("Cliente excluído");
      setDelOpen(false);
    } catch (e: any) {
      toast.error(`Erro ao excluir: ${e?.message ?? "tente novamente"}`);
    }
  };

  const jaOnboarding = (cliente.status_global ?? "Onboarding") === "Onboarding";

  const enviarParaCentral = async () => {
    if (jaOnboarding) {
      toast.info("Cliente já está em Onboarding");
      return;
    }
    if (!confirm(
      `Enviar "${cliente.nome_cliente}" para a Central de Ativação? ` +
      `O status global será alterado para Onboarding.`,
    )) return;
    setEnviandoCentral(true);
    try {
      await updateCliente(cliente.id, { status_global: "Onboarding" } as any);
      toast.success("Cliente enviado para a Central de Ativação");
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? "tente novamente"}`);
    } finally {
      setEnviandoCentral(false);
    }
  };

  if (!canWrite && !isAdmin) return null;

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {canWrite && !jaOnboarding && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
          title="Enviar para Central de Ativação"
          onClick={enviarParaCentral}
          disabled={enviandoCentral}
        >
          <Rocket className="h-3.5 w-3.5" />
        </Button>
      )}
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


const PERIODO_LABEL: Record<PeriodoPreset, string> = {
  todos: "Período",
  hoje: "Hoje",
  esta_semana: "Esta semana",
  prox_7: "Próximos 7 dias",
  prox_14: "Próximos 14 dias",
  prox_30: "Próximos 30 dias",
  ult_7: "Últimos 7 dias",
  ult_14: "Últimos 14 dias",
  ult_30: "Últimos 30 dias",
  mes_passado: "Mês passado",
  custom: "Personalizado",
};

function FiltroPeriodoButton({
  value,
  onChange,
}: {
  value: FiltroPeriodo;
  onChange: (v: FiltroPeriodo) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customIni, setCustomIni] = useState<Date | undefined>(
    value.tipo === "custom" && value.inicio ? new Date(value.inicio) : undefined,
  );
  const [customFim, setCustomFim] = useState<Date | undefined>(
    value.tipo === "custom" && value.fim ? new Date(value.fim) : undefined,
  );

  const ativo = value.tipo !== "todos";
  const labelAtivo =
    value.tipo === "custom" && value.inicio && value.fim
      ? `${format(new Date(value.inicio), "dd/MM")} – ${format(new Date(value.fim), "dd/MM")}`
      : PERIODO_LABEL[value.tipo];

  const selecionar = (tipo: PeriodoPreset) => {
    onChange({ tipo });
    setOpen(false);
  };

  const aplicarCustom = () => {
    if (!customIni || !customFim) {
      toast.error("Selecione data inicial e final");
      return;
    }
    if (customFim < customIni) {
      toast.error("Data final deve ser posterior à inicial");
      return;
    }
    onChange({
      tipo: "custom",
      inicio: customIni.toISOString().slice(0, 10),
      fim: customFim.toISOString().slice(0, 10),
    });
    setOpen(false);
  };

  const Item = ({
    tipo,
    label,
  }: {
    tipo: PeriodoPreset;
    label: string;
  }) => {
    const checked = value.tipo === tipo;
    return (
      <button
        type="button"
        onClick={() => selecionar(tipo)}
        className={cn(
          "w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors",
          checked && "bg-accent font-medium text-foreground",
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 relative">
          <CalendarIcon className="h-3.5 w-3.5" />
          <span className="text-xs">{ativo ? labelAtivo : "Período"}</span>
          {ativo && (
            <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
              1
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="space-y-2">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 pb-1 font-semibold">
              📅 Futuro · planejamento
            </div>
            <div className="space-y-0.5">
              <Item tipo="hoje" label="Hoje" />
              <Item tipo="esta_semana" label="Esta semana" />
              <Item tipo="prox_7" label="Próximos 7 dias" />
              <Item tipo="prox_14" label="Próximos 14 dias" />
              <Item tipo="prox_30" label="Próximos 30 dias" />
            </div>
          </div>
          <div className="border-t pt-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 pb-1 font-semibold">
              📊 Passado · análise
            </div>
            <div className="space-y-0.5">
              <Item tipo="ult_7" label="Últimos 7 dias" />
              <Item tipo="ult_14" label="Últimos 14 dias" />
              <Item tipo="ult_30" label="Últimos 30 dias" />
              <Item tipo="mes_passado" label="Mês passado" />
            </div>
          </div>
          <div className="border-t pt-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 pb-1 font-semibold">
              ⚙️ Personalizado
            </div>
            <div className="px-1 grid grid-cols-2 gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs justify-start font-normal"
                  >
                    {customIni ? format(customIni, "dd/MM/yy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customIni}
                    onSelect={setCustomIni}
                    locale={ptBR}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs justify-start font-normal"
                  >
                    {customFim ? format(customFim, "dd/MM/yy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customFim}
                    onSelect={setCustomFim}
                    locale={ptBR}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="px-1 pt-1.5">
              <Button
                size="sm"
                className="h-7 w-full text-xs"
                onClick={aplicarCustom}
              >
                Aplicar período personalizado
              </Button>
            </div>
          </div>
          {ativo && (
            <div className="border-t pt-2 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  onChange({ tipo: "todos" });
                  setCustomIni(undefined);
                  setCustomFim(undefined);
                  setOpen(false);
                }}
              >
                <X className="h-3 w-3" /> Limpar
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


function FiltrosTopo({
  filtroResponsaveis,
  setFiltroResponsaveis,
}: {
  filtroResponsaveis: string[];
  setFiltroResponsaveis: (v: string[]) => void;
}) {
  const { responsaveis } = useCRM();
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
            <span className="text-xs">Filtrar por responsável</span>
            {filtroResponsaveis.length > 0 && (
              <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                {filtroResponsaveis.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="text-[11px] text-muted-foreground px-2 pb-1.5">Responsáveis do cliente</div>
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
    </div>
  );
}

export default function Clientes() {
  const { clientes, responsaveis, nichos, loading, heavyDataLoading } = useCRM();
  const { canWrite, isAdmin } = useAuth();
  const [busca, setBusca] = useState("");
  const [historicoClienteId, setHistoricoClienteId] = useState<string | null>(null);
  const [openImportarCentral, setOpenImportarCentral] = useState(false);
  const [filtroResponsaveis, setFiltroResponsaveis] = useState<string[]>([]);
  const [filtroStatusGlobal, setFiltroStatusGlobal] = useState<string>(
    () => localStorage.getItem("clientes:filtroStatusGlobal") ?? "todos",
  );
  const [mostrarOcultos, setMostrarOcultos] = useState<boolean>(
    () => localStorage.getItem("clientes:mostrarOcultos") === "1",
  );
  useEffect(() => {
    localStorage.setItem("clientes:mostrarOcultos", mostrarOcultos ? "1" : "0");
  }, [mostrarOcultos]);
  const totalOcultos = useMemo(() => clientes.filter((c) => c.oculto).length, [clientes]);


  // Novos filtros (visão Clientes)
  const [filtroNichos, setFiltroNichos] = useState<string[]>([]);
  const [filtroPeriodoContrato, setFiltroPeriodoContrato] = useState<
    "todos" | "30" | "90" | "vencido"
  >("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>(() => {
    try {
      const raw = localStorage.getItem("dashtasks.clientes.filtroPeriodo");
      if (raw) return JSON.parse(raw) as FiltroPeriodo;
    } catch {}
    return { tipo: "todos" };
  });
  useEffect(() => {
    localStorage.setItem("dashtasks.clientes.filtroPeriodo", JSON.stringify(filtroPeriodo));
  }, [filtroPeriodo]);

  // Ordenação e densidade
  const [sortKey, setSortKey] = useState<"cliente" | "status" | "nicho" | "periodo">(
    () => (localStorage.getItem("dashtasks.clientes.sort.key") as any) ?? "cliente",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    () => (localStorage.getItem("dashtasks.clientes.sort.dir") as any) ?? "asc",
  );

  // Persistência das preferências do usuário
  useEffect(() => {
    localStorage.setItem("clientes:filtroStatusGlobal", filtroStatusGlobal);
  }, [filtroStatusGlobal]);
  useEffect(() => {
    localStorage.setItem("dashtasks.clientes.sort.key", sortKey);
    localStorage.setItem("dashtasks.clientes.sort.dir", sortDir);
  }, [sortKey, sortDir]);

  const handleSortChange = (k: typeof sortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const limparFiltros = () => {
    setBusca("");
    setFiltroResponsaveis([]);
    setFiltroStatusGlobal("todos");
    setFiltroNichos([]);
    setFiltroPeriodoContrato("todos");
    setFiltroPeriodo({ tipo: "todos" });
  };

  const algumFiltroAtivo =
    busca.trim() !== "" ||
    filtroResponsaveis.length > 0 ||
    filtroStatusGlobal !== "todos" ||
    filtroNichos.length > 0 ||
    filtroPeriodoContrato !== "todos" ||
    filtroPeriodo.tipo !== "todos";

  // Placeholder do usuário atual: primeiro responsável cadastrado.
  const currentUserId = responsaveis[0]?.id ?? null;


  return (
    <div className="px-5 py-4 space-y-3 animate-fade-in">
      {(loading || (heavyDataLoading && clientes.length === 0)) && (
        <div className="fixed inset-0 z-[100] bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Zap className="h-8 w-8 text-primary animate-pulse" />
            <p className="text-sm font-medium">Carregando CRM...</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold leading-tight">Clientes</h1>
              {heavyDataLoading && clientes.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-primary animate-pulse font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">
                  <Clock className="h-3 w-3" />
                  Sincronizando dados detalhados...
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {algumFiltroAtivo
                ? `Filtros ativos · ${clientes.length} clientes no total`
                : `${clientes.length} clientes`}
            </p>
          </div>
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
          <FiltrosTopo
            filtroResponsaveis={filtroResponsaveis}
            setFiltroResponsaveis={setFiltroResponsaveis}
          />
          {/* Filtro de Nicho */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 h-8 relative">
                <Filter className="h-3.5 w-3.5" />
                <span className="text-xs">Nicho</span>
                {filtroNichos.length > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                    {filtroNichos.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="text-[11px] text-muted-foreground px-2 pb-1.5">
                Nichos
              </div>
              <div className="max-h-60 overflow-auto space-y-0.5">
                {nichos.length === 0 ? (
                  <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                    Nenhum nicho cadastrado
                  </div>
                ) : (
                  nichos.map((n) => {
                    const checked = filtroNichos.includes(n.label);
                    return (
                      <button
                        type="button"
                        key={n.label}
                        onClick={() =>
                          setFiltroNichos(
                            checked
                              ? filtroNichos.filter((v) => v !== n.label)
                              : [...filtroNichos, n.label],
                          )
                        }
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
                          checked && "bg-accent",
                        )}
                      >
                        <Checkbox checked={checked} />
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: n.cor }}
                        />
                        <span className="truncate">{n.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
              {filtroNichos.length > 0 && (
                <div className="border-t mt-2 pt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => setFiltroNichos([])}
                  >
                    <X className="h-3 w-3" /> Limpar
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Período (tarefas/posts) */}
          <FiltroPeriodoButton value={filtroPeriodo} onChange={setFiltroPeriodo} />

          {/* Período do contrato */}
          <Select
            value={filtroPeriodoContrato}
            onValueChange={(v) => setFiltroPeriodoContrato(v as any)}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Contrato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Contrato: todos</SelectItem>
              <SelectItem value="30">Vence em 30 dias</SelectItem>
              <SelectItem value="90">Vence em 90 dias</SelectItem>
              <SelectItem value="vencido">Já vencido</SelectItem>
            </SelectContent>
          </Select>

          {algumFiltroAtivo && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={limparFiltros}
              title="Limpar todos os filtros"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..." className="pl-8 h-8 w-56 text-sm" />
          </div>
          {totalOcultos > 0 && (
            <button
              type="button"
              onClick={() => setMostrarOcultos((v) => !v)}
              className={cn(
                "h-8 px-2 inline-flex items-center gap-1.5 text-xs rounded-md border transition-colors",
                mostrarOcultos
                  ? "bg-accent text-foreground border-border"
                  : "bg-background text-muted-foreground hover:text-foreground border-border",
              )}
              title={mostrarOcultos ? "Esconder clientes ocultos" : "Mostrar clientes ocultos"}
            >
              {mostrarOcultos ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {mostrarOcultos ? "Ocultos visíveis" : "Mostrar ocultos"}
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-muted text-foreground text-[10px] font-semibold">
                {totalOcultos}
              </span>
            </button>
          )}
          {isAdmin && <ConfiguracoesSheet />}
          {isAdmin && <GerenciarColunas />}
          {canWrite && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setOpenImportarCentral(true)}
              title="Enviar clientes selecionados para a Central de Ativação"
            >
              <Rocket className="h-4 w-4" /> Enviar p/ Central
            </Button>
          )}
          {canWrite && <NovoClienteDialog />}
        </div>
      </div>


      <ClientesGeralTable
        filtroBusca={busca}
        filtroResponsaveis={filtroResponsaveis}
        currentUserId={currentUserId}
        filtroStatusGlobal={filtroStatusGlobal}
        filtroNichos={filtroNichos}
        filtroPeriodoContrato={filtroPeriodoContrato}
        filtroPeriodo={filtroPeriodo}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={handleSortChange}
        onAbrirHistorico={setHistoricoClienteId}
        mostrarOcultos={mostrarOcultos}
        acoesSlot={(clienteId) => {
          const cli = clientes.find((c) => c.id === clienteId);
          return cli ? <AcoesCliente cliente={cli} /> : null;
        }}
      />

      <HistoricoComentariosDialog
        clienteId={historicoClienteId}
        open={!!historicoClienteId}
        onOpenChange={(v) => !v && setHistoricoClienteId(null)}
      />
      <ImportarClientesDialog open={openImportarCentral} onOpenChange={setOpenImportarCentral} />
    </div>
  );
}


