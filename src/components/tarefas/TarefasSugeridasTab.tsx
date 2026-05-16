import { useState } from "react";
import { useTarefasSugeridas, useTarefasSugeridasBootstrap, type TarefaSugerida } from "@/store/tarefasSugeridas";
import { useCRM } from "@/store/crm";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  convertida: "Convertida em tarefa",
};

const STATUS_TONE: Record<string, string> = {
  aguardando_aprovacao: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  aprovada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejeitada: "bg-destructive/15 text-destructive",
  convertida: "bg-primary/15 text-primary",
};

export function TarefasSugeridasTab() {
  useTarefasSugeridasBootstrap();
  const itens = useTarefasSugeridas((s) => s.itens);
  const aprovar = useTarefasSugeridas((s) => s.aprovar);
  const rejeitar = useTarefasSugeridas((s) => s.rejeitar);
  const remove = useTarefasSugeridas((s) => s.remove);
  const clientes = useCRM((s) => s.clientes);
  const responsaveis = useCRM((s) => s.responsaveis);
  const { isAdmin } = useAuth();

  const [filtro, setFiltro] = useState<string>("aguardando_aprovacao");
  const [edit, setEdit] = useState<TarefaSugerida | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const filtradas = itens.filter((t) => filtro === "todos" || t.status === filtro);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold">Tarefas Sugeridas</h3>
          <p className="text-xs text-muted-foreground">
            Camada intermediária — sugestões aguardam aprovação antes de virar tarefa real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aguardando_aprovacao">Aguardando aprovação</SelectItem>
              <SelectItem value="convertida">Convertidas</SelectItem>
              <SelectItem value="rejeitada">Rejeitadas</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setNovoOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova sugestão
          </Button>
        </div>
      </div>

      {filtradas.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhuma sugestão.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtradas.map((t) => {
            const cli = clientes.find((c) => c.id === t.cliente_id);
            const resp = responsaveis.find((r) => r.id === t.responsavel_sugerido_id);
            return (
              <Card key={t.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold">{t.titulo}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_TONE[t.status]}`}>
                          {STATUS_LABEL[t.status]}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        {cli && <span>· {cli.nome_cliente}</span>}
                        {t.categoria && <span>· {t.categoria}</span>}
                        {t.prioridade && <span>· Prioridade: {t.prioridade}</span>}
                        {resp && <span>· Sugerido p/ {resp.nome}</span>}
                        {t.supervisor_sugerido_id && (
                          <span>· Supervisor: {responsaveis.find(r => r.id === t.supervisor_sugerido_id)?.nome || "N/A"}</span>
                        )}
                        {t.prazo_sugerido && <span>· Prazo: {new Date(t.prazo_sugerido).toLocaleDateString("pt-BR")}</span>}
                      </div>
                      
                      {t.justificativa_atribuicao && (
                        <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-primary/5 border border-primary/10 text-[11px] leading-relaxed italic text-muted-foreground">
                          <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-primary/60" />
                          <span>{t.justificativa_atribuicao}</span>
                        </div>
                      )}

                      {t.descricao && (
                        <p className="text-xs mt-1.5 text-foreground/80 line-clamp-3 whitespace-pre-wrap">{t.descricao}</p>
                      )}
                      
                      {(t.checklist || t.entregavel_esperado || t.apoio) && (
                        <div className="mt-2 space-y-1">
                          {t.entregavel_esperado && (
                            <div className="text-[10px] text-muted-foreground">
                              <span className="font-semibold uppercase">Entregável:</span> {t.entregavel_esperado}
                            </div>
                          )}
                          {t.apoio && (
                            <div className="text-[10px] text-muted-foreground">
                              <span className="font-semibold uppercase">Apoio:</span> {t.apoio}
                            </div>
                          )}
                          {t.checklist && (
                            <div className="text-[10px] text-muted-foreground">
                              <span className="font-semibold uppercase">Checklist:</span> {t.checklist}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {t.status === "aguardando_aprovacao" && isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => setEdit(t)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" className="h-7" onClick={() => aprovar(t.id)}>
                          <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => rejeitar(t.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    {t.status !== "aguardando_aprovacao" && isAdmin && (
                      <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => { if (confirm("Excluir?")) remove(t.id); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SugestaoDialog open={novoOpen || !!edit} onOpenChange={(b) => { if (!b) { setNovoOpen(false); setEdit(null); } }} item={edit} />
    </div>
  );
}

function SugestaoDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (b: boolean) => void; item: TarefaSugerida | null }) {
  const create = useTarefasSugeridas((s) => s.create);
  const update = useTarefasSugeridas((s) => s.update);
  const clientes = useCRM((s) => s.clientes);
  const responsaveis = useCRM((s) => s.responsaveis);

  const [clienteId, setClienteId] = useState(item?.cliente_id ?? "");
  const [titulo, setTitulo] = useState(item?.titulo ?? "");
  const [descricao, setDescricao] = useState(item?.descricao ?? "");
  const [categoria, setCategoria] = useState(item?.categoria ?? "Tráfego");
  const [respId, setRespId] = useState(item?.responsavel_sugerido_id ?? "");
  const [supervisorId, setSupervisorId] = useState(item?.supervisor_sugerido_id ?? "");
  const [prioridade, setPrioridade] = useState(item?.prioridade ?? "Media");
  const [prazo, setPrazo] = useState(item?.prazo_sugerido ?? "");
  const [apoio, setApoio] = useState(item?.apoio ?? "");
  const [checklist, setChecklist] = useState(item?.checklist ?? "");
  const [entregavel, setEntregavel] = useState(item?.entregavel_esperado ?? "");
  const [justificativa, setJustificativa] = useState(item?.justificativa_atribuicao ?? "");

  const categorias = [
    "Tráfego", "Design", "Vídeo", "Web / Landing Pages", "CRM", "IA / Automação",
    "Relatórios", "Saldos", "Comercial", "Atendimento", "Gestão de Projetos",
    "Financeiro", "Administrativo", "Social Media", "Suporte Técnico",
    "Reuniões de Performance", "Estratégia"
  ];

  const handleSave = async () => {
    if (!clienteId || !titulo.trim()) {
      toast.error("Cliente e título obrigatórios");
      return;
    }
    const payload: any = {
      cliente_id: clienteId,
      titulo,
      descricao: descricao || null,
      categoria,
      responsavel_sugerido_id: respId || null,
      supervisor_sugerido_id: supervisorId || null,
      prioridade,
      prazo_sugerido: prazo || null,
      apoio: apoio || null,
      checklist: checklist || null,
      entregavel_esperado: entregavel || null,
      justificativa_atribuicao: justificativa || null,
      origem: item?.origem || "manual",
    };
    if (item) await update(item.id, payload);
    else await create(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{item ? "Editar sugestão" : "Nova tarefa sugerida"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["EditorVideo","TrafegoPago","LandingPage","IAAtendimento","Personalizado"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prioridade</Label>
              <Select value={prioridade} onValueChange={setPrioridade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Baixa","Media","Alta","Urgente"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Responsável sugerido</Label>
              <Select value={respId || "__none__"} onValueChange={(v) => setRespId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhum —</SelectItem>
                  {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Prazo sugerido</Label>
              <Input type="date" value={prazo ?? ""} onChange={(e) => setPrazo(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}><Sparkles className="h-4 w-4 mr-1" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
