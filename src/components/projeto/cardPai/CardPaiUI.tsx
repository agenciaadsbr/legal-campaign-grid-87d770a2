import { useMemo, useState } from "react";
import { useCRM } from "@/store/crm";
import {
  CardPai,
  CardPaiEtapa,
  EtapaTipo,
  calcularProgresso,
  useCardPai,
} from "@/store/cardPai";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Trash2, Link2, CheckCircle2, Lock, Loader2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useDemandas } from "@/store/demandas";

const CATEGORIAS = [
  { value: "Posts", label: "Posts" },
  { value: "Videos", label: "Vídeos" },
  { value: "TrafegoPago", label: "Tráfego Pago" },
  { value: "LpSite", label: "LP / Site" },
  { value: "IAAtendimento", label: "IA / Atendimento" },
  { value: "Operacional", label: "Operacional" },
  { value: "Personalizado", label: "Personalizado" },
  { value: "Urgencia", label: "Urgência" },
];

// =============== Form Dialog (criar/editar Card Pai) ===============
export function CardPaiFormDialog({
  clienteId,
  open,
  onOpenChange,
  card,
}: {
  clienteId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card?: CardPai | null;
}) {
  const criarCardPai = useCardPai((s) => s.criarCardPai);
  const atualizarCardPai = useCardPai((s) => s.atualizarCardPai);
  const { responsaveis } = useCRM();
  const [titulo, setTitulo] = useState(card?.titulo ?? "");
  const [descricao, setDescricao] = useState(card?.descricao ?? "");
  const [responsaveisIds, setResponsaveisIds] = useState<string[]>(card?.responsaveis_ids ?? []);
  const [saving, setSaving] = useState(false);

  // reset quando abrir
  useMemo(() => {
    if (open) {
      setTitulo(card?.titulo ?? "");
      setDescricao(card?.descricao ?? "");
      setResponsaveisIds(card?.responsaveis_ids ?? []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSalvar = async () => {
    if (!titulo.trim()) {
      toast.error("Informe um título");
      return;
    }
    setSaving(true);
    try {
      if (card) {
        await atualizarCardPai(card.id, { titulo: titulo.trim(), descricao: descricao.trim() || null, responsaveis_ids: responsaveisIds });
        toast.success("Card Pai atualizado");
      } else {
        const created = await criarCardPai({
          cliente_id: clienteId,
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          responsaveis_ids: responsaveisIds,
        });
        if (created) toast.success("Card Pai criado");
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleResp = (id: string) =>
    setResponsaveisIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{card ? "Editar Card Pai" : "Novo Card Pai"}</DialogTitle>
          <DialogDescription>
            Card Pai agrupa etapas de um processo multietapa. Não substitui as tarefas reais.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Ativação Google Ads" />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Responsáveis</Label>
            <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
              {responsaveis.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={responsaveisIds.includes(r.id)} onCheckedChange={() => toggleResp(r.id)} />
                  <span>{r.nome}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============== Detalhe Dialog ===============
export function CardPaiDetalheDialog({
  card,
  onOpenChange,
  onOpenDemanda,
}: {
  card: CardPai | null;
  onOpenChange: (v: boolean) => void;
  onOpenDemanda?: (demandaId: string) => void;
}) {
  const etapas = useCardPai((s) => s.etapas).filter((e) => e.card_pai_id === card?.id).sort((a, b) => a.ordem - b.ordem);
  const adicionarEtapa = useCardPai((s) => s.adicionarEtapa);
  const atualizarEtapa = useCardPai((s) => s.atualizarEtapa);
  const removerEtapa = useCardPai((s) => s.removerEtapa);
  const concluirEtapaInterna = useCardPai((s) => s.concluirEtapaInterna);
  const liberarEtapa = useCardPai((s) => s.liberarEtapa);
  const criarTarefaRealParaEtapa = useCardPai((s) => s.criarTarefaRealParaEtapa);
  const removerCardPai = useCardPai((s) => s.removerCardPai);
  const { responsaveis } = useCRM();
  const demandas = useDemandas((s) => s.demandas);

  const [novoTipo, setNovoTipo] = useState<EtapaTipo>("tarefa_real");
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("Operacional");
  const [novoResp, setNovoResp] = useState<string>("");
  const [novoStatusInterno, setNovoStatusInterno] = useState("Aguardando aprovação do cliente");
  const [novoDepende, setNovoDepende] = useState<string>("");
  const [adicionando, setAdicionando] = useState(false);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState(false);

  if (!card) return null;

  const progresso = calcularProgresso(etapas);

  const handleAdicionar = async () => {
    if (!novoTitulo.trim()) {
      toast.error("Informe o título da etapa");
      return;
    }
    setAdicionando(true);
    try {
      await adicionarEtapa({
        card_pai_id: card.id,
        titulo: novoTitulo.trim(),
        tipo: novoTipo,
        categoria_alvo: novoTipo === "tarefa_real" ? novaCategoria : null,
        responsavel_id: novoResp || null,
        status_interno_valor: novoTipo === "status_interno" ? novoStatusInterno : null,
        depends_on_etapa_id: novoDepende || null,
      });
      setNovoTitulo("");
      setNovoResp("");
      setNovoDepende("");
    } finally {
      setAdicionando(false);
    }
  };

  const respLabel = (id: string | null) => responsaveis.find((r) => r.id === id)?.nome ?? "—";
  const demandaLink = (id: string | null) => (id ? demandas.find((d) => d.id === id) : null);

  return (
    <>
      <Dialog open={!!card} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">Card Pai</Badge>
              <Badge variant="outline">{card.status_geral}</Badge>
            </div>
            <DialogTitle className="text-xl">{card.titulo}</DialogTitle>
            {card.descricao && <DialogDescription>{card.descricao}</DialogDescription>}
          </DialogHeader>

          {/* Progresso */}
          <Card>
            <CardContent className="p-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <Stat label="Total" value={progresso.total} />
              <Stat label="Concluídas" value={progresso.concluidas} className="text-green-600" />
              <Stat label="Pendentes" value={progresso.pendentes} />
              <Stat label="Bloqueadas" value={progresso.bloqueadas} className="text-amber-600" />
              <Stat label="Aguardando cliente" value={progresso.aguardandoCliente} className="text-blue-600" />
            </CardContent>
          </Card>

          {/* Etapas */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ListChecks className="h-4 w-4" />
              <h3 className="font-semibold text-sm">Etapas do Processo</h3>
            </div>
            <div className="space-y-2">
              {etapas.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma etapa criada ainda.</p>
              )}
              {etapas.map((etapa, idx) => {
                const dem = demandaLink(etapa.demanda_id);
                const bloqueada = !etapa.liberado && !etapa.concluido;
                return (
                  <div
                    key={etapa.id}
                    className="border rounded-md p-2 flex items-start gap-2 bg-card"
                  >
                    <div className="text-xs text-muted-foreground w-5 pt-1">{idx + 1}.</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{etapa.titulo}</span>
                        <Badge variant={etapa.tipo === "tarefa_real" ? "default" : "secondary"} className="text-[10px]">
                          {etapa.tipo === "tarefa_real" ? "Tarefa real" : "Status interno"}
                        </Badge>
                        {etapa.concluido && (
                          <Badge className="text-[10px] bg-green-600">Concluída</Badge>
                        )}
                        {bloqueada && (
                          <Badge variant="outline" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />Bloqueada</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Resp.: {respLabel(etapa.responsavel_id)}
                        {etapa.tipo === "tarefa_real" && etapa.categoria_alvo && (
                          <> · Aba: {etapa.categoria_alvo}</>
                        )}
                        {etapa.tipo === "status_interno" && etapa.status_interno_valor && (
                          <> · {etapa.status_interno_valor}</>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {etapa.tipo === "tarefa_real" && !dem && (
                          <Button size="sm" variant="outline" disabled={bloqueada} onClick={async () => {
                            const id = await criarTarefaRealParaEtapa(etapa.id);
                            if (id) toast.success("Tarefa real criada/vinculada");
                          }}>
                            <Plus className="h-3 w-3 mr-1" /> Criar/vincular tarefa
                          </Button>
                        )}
                        {etapa.tipo === "tarefa_real" && dem && (
                          <Button size="sm" variant="outline" onClick={() => onOpenDemanda?.(dem.id)}>
                            <Link2 className="h-3 w-3 mr-1" /> Abrir tarefa ({dem.status})
                          </Button>
                        )}
                        {etapa.tipo === "status_interno" && !etapa.concluido && (
                          <Button size="sm" variant="outline" disabled={bloqueada} onClick={() => concluirEtapaInterna(etapa.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Concluir etapa
                          </Button>
                        )}
                        {bloqueada && (
                          <Button size="sm" variant="ghost" onClick={() => liberarEtapa(etapa.id)}>Liberar manualmente</Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removerEtapa(etapa.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Adicionar etapa */}
            <Card className="mt-3">
              <CardContent className="p-3 space-y-2">
                <div className="text-sm font-medium">Adicionar etapa</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as EtapaTipo)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tarefa_real">Tarefa real (cria card em outra aba)</SelectItem>
                        <SelectItem value="status_interno">Status interno (apenas controle)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Título</Label>
                    <Input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} placeholder="Ex.: Criar Landing Page" />
                  </div>
                  {novoTipo === "tarefa_real" && (
                    <div>
                      <Label className="text-xs">Categoria/Aba destino</Label>
                      <Select value={novaCategoria} onValueChange={setNovaCategoria}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {novoTipo === "status_interno" && (
                    <div>
                      <Label className="text-xs">Status interno</Label>
                      <Input value={novoStatusInterno} onChange={(e) => setNovoStatusInterno(e.target.value)} />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Responsável</Label>
                    <Select value={novoResp || "__none"} onValueChange={(v) => setNovoResp(v === "__none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">—</SelectItem>
                        {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Depende de</Label>
                    <Select value={novoDepende || "__none"} onValueChange={(v) => setNovoDepende(v === "__none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Nenhuma (liberada)</SelectItem>
                        {etapas.map((e) => <SelectItem key={e.id} value={e.id}>{e.titulo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleAdicionar} disabled={adicionando}>
                    {adicionando ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                    Adicionar etapa
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="justify-between sm:justify-between">
            <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDeleteCard(true)}>
              <Trash2 className="h-3 w-3 mr-1" /> Excluir Card Pai
            </Button>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteCard} onOpenChange={setConfirmDeleteCard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este Card Pai?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as etapas serão removidas. As tarefas reais vinculadas continuarão existindo nas abas correspondentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              await removerCardPai(card.id);
              setConfirmDeleteCard(false);
              onOpenChange(false);
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${className ?? ""}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

// =============== Faixa com os Cards Pai ===============
export function CardsPaiLista({
  clienteId,
  onOpenDemanda,
}: {
  clienteId: string;
  onOpenDemanda?: (demandaId: string) => void;
}) {
  const cards = useCardPai((s) => s.cards).filter((c) => c.cliente_id === clienteId);
  const etapasAll = useCardPai((s) => s.etapas);
  const { responsaveis } = useCRM();
  const [selecionado, setSelecionado] = useState<CardPai | null>(null);

  if (cards.length === 0) return null;

  return (
    <>
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Cards Pai</Badge>
            <span className="text-xs text-muted-foreground">Processos multietapa deste cliente</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {cards.map((c) => {
              const etapas = etapasAll.filter((e) => e.card_pai_id === c.id).sort((a, b) => a.ordem - b.ordem);
              const p = calcularProgresso(etapas);
              const respNomes = c.responsaveis_ids
                .map((id) => responsaveis.find((r) => r.id === id)?.nome)
                .filter(Boolean)
                .join(", ");
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelecionado(c)}
                  className="text-left border rounded-md p-3 hover:bg-accent transition-colors bg-card"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px]">Card Pai</Badge>
                    <Badge variant="outline" className="text-[10px]">{c.status_geral}</Badge>
                  </div>
                  <div className="font-semibold text-sm">{c.titulo}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {p.concluidas}/{p.total} etapas concluídas
                  </div>
                  {p.proximaEtapa && (
                    <div className="text-xs mt-1">
                      <span className="text-muted-foreground">Próxima: </span>
                      {p.proximaEtapa.titulo}
                    </div>
                  )}
                  {respNomes && (
                    <div className="text-[11px] text-muted-foreground mt-1 truncate">
                      Responsáveis: {respNomes}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <CardPaiDetalheDialog
        card={selecionado}
        onOpenChange={(v) => { if (!v) setSelecionado(null); }}
        onOpenDemanda={onOpenDemanda}
      />
    </>
  );
}
