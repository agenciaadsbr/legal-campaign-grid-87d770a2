import { useParams, Link, Outlet, useLocation } from "react-router-dom";
import { useCRM, StatusCard, Card as CardT } from "@/store/crm";
import { useMemo, useState } from "react";
import { AvatarStack } from "@/components/AvatarStack";
import { StatusBadge, ColorBadge } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Zap, Play, Calendar, CalendarX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { IniciarTarefaDialog } from "@/components/IniciarTarefaDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Colunas vêm dinamicamente de statusPostOptions

function CardItem({ card, onIniciar }: { card: CardT; onIniciar: (id: string) => void }) {
  const { responsaveis, posts, updateCard } = useCRM();
  const { canWrite } = useAuth();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  const post = posts.find((p) => p.card_id === card.id);
  const resps = responsaveis.filter((r) => card.responsaveis.includes(r.id));
  const isUrgent = !!card.is_urgent;
  const isPlanejamento = card.status_card === "Planejamento";
  const isAtrasado = card.status_card === "Atrasado";

  const toggleUrgent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !isUrgent;
    updateCard(card.id, { is_urgent: next });
    toast.success(next ? "Card marcado como urgente" : "Urgência removida");
  };

  const handleIniciar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onIniciar(card.id);
  };

  const inner = (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative bg-card border rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all",
        isUrgent && "border-l-2 border-l-amber-500",
        isAtrasado && "border-l-2 border-l-red-500",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-sm font-medium leading-tight flex items-center gap-1.5 flex-1">
          {isUrgent && <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
          <span>{card.titulo_card}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canWrite && !isPlanejamento && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={toggleUrgent}
              className={cn(
                "h-6 w-6 transition-opacity",
                isUrgent
                  ? "text-amber-500 hover:text-amber-600 opacity-100"
                  : "text-muted-foreground opacity-0 group-hover:opacity-100",
              )}
              title={isUrgent ? "Remover urgência" : "Marcar como urgente"}
            >
              <Zap className={cn("h-3.5 w-3.5", isUrgent && "fill-current")} />
            </Button>
          )}
          <StatusBadge status={card.status_card} />
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Mês {card.mes_referencia} · Sem {card.numero_semana}</span>
        <AvatarStack responsaveis={resps} size="xs" max={3} />
      </div>
      {isPlanejamento && canWrite && (
        <Button
          type="button"
          size="sm"
          variant="default"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleIniciar}
          className="mt-2 w-full h-7 text-xs gap-1.5"
        >
          <Play className="h-3 w-3" /> Iniciar tarefa
        </Button>
      )}
    </div>
  );

  // Em Planejamento, não navega ao clicar
  if (isPlanejamento) return inner;
  return <Link to={post ? `posts/${post.id}` : "#"}>{inner}</Link>;
}

function Coluna({ status, cards, onIniciar }: { status: StatusCard; cards: CardT[]; onIniciar: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const isAtrasado = status === "Atrasado";
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[260px] bg-muted/30 rounded-lg p-2 transition-colors",
        isOver && "bg-accent/40 ring-2 ring-primary/30",
        isAtrasado && cards.length > 0 && "ring-1 ring-red-500/30",
      )}
    >
      <div className="flex items-center justify-between px-1 py-1.5 mb-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className={cn("text-xs", isAtrasado && cards.length > 0 ? "text-red-500 font-semibold" : "text-muted-foreground")}>
            {cards.length}
          </span>
        </div>
      </div>
      <div className="min-h-[100px]">
        {cards.map((c) => <CardItem key={c.id} card={c} onIniciar={onIniciar} />)}
      </div>
    </div>
  );
}

function KanbanView() {
  const { clienteId } = useParams();
  const { cards, moveCard, contratos, statusPostOptions, responsaveis } = useCRM();
  const { canWrite } = useAuth();
  const [filtroMes, setFiltroMes] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [iniciarOpen, setIniciarOpen] = useState(false);
  const [iniciarCardId, setIniciarCardId] = useState<string | null>(null);

  const [filtroResps, setFiltroResps] = useState<string[]>([]);
  const [filtroSomente, setFiltroSomente] = useState<"todos" | "atrasados" | "hoje" | "semana">("todos");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const colunas = useMemo(() => statusPostOptions.map((o) => o.label), [statusPostOptions]);

  const cardsCliente = useMemo(() => {
    const hojeStart = new Date(); hojeStart.setHours(0, 0, 0, 0);
    const amanhaStart = new Date(hojeStart); amanhaStart.setDate(amanhaStart.getDate() + 1);
    const semanaFim = new Date(hojeStart); semanaFim.setDate(semanaFim.getDate() + 7);
    return cards
      .filter((c) => c.cliente_id === clienteId)
      .filter((c) => filtroMes === "all" || c.mes_referencia === Number(filtroMes))
      .filter((c) => filtroResps.length === 0 || c.responsaveis.some((r) => filtroResps.includes(r)))
      .filter((c) => {
        if (filtroSomente === "todos") return true;
        if (filtroSomente === "atrasados") return c.status_card === "Atrasado";
        const due = c.data_agendada ? new Date(c.data_agendada) : null;
        if (!due) return false;
        if (filtroSomente === "hoje") return due >= hojeStart && due < amanhaStart;
        if (filtroSomente === "semana") return due >= hojeStart && due < semanaFim;
        return true;
      });
  }, [cards, clienteId, filtroMes, filtroResps, filtroSomente]);

  const totalMeses = useMemo(() => {
    const contrato = contratos.find((c) => c.cliente_id === clienteId);
    if (contrato?.total_posts) return Math.max(1, Math.min(6, Math.round(contrato.total_posts / 4)));
    const cardsDoCliente = cards.filter((c) => c.cliente_id === clienteId);
    const max = cardsDoCliente.reduce((acc, c) => Math.max(acc, c.mes_referencia), 0);
    return Math.max(1, Math.min(6, max || 3));
  }, [contratos, cards, clienteId]);

  const abrirIniciar = (id: string) => {
    setIniciarCardId(id);
    setIniciarOpen(true);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!canWrite) return;
    if (!e.over) return;
    const novoStatus = String(e.over.id);
    if (!colunas.includes(novoStatus)) return;
    const card = cards.find((c) => c.id === String(e.active.id));
    if (!card) return;
    if (novoStatus === card.status_card) return;
    if (card.status_card === "Planejamento") {
      abrirIniciar(card.id);
      return;
    }
    moveCard(card.id, novoStatus as StatusCard);
  };

  const respsSelLabel =
    filtroResps.length === 0
      ? "Todos responsáveis"
      : filtroResps.length === 1
      ? responsaveis.find((r) => r.id === filtroResps[0])?.nome ?? "1 responsável"
      : `${filtroResps.length} responsáveis`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {Array.from({ length: totalMeses }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>Mês {m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">{respsSelLabel}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="text-[11px] text-muted-foreground px-2 pb-1.5">Filtrar por responsável</div>
            <div className="max-h-60 overflow-auto space-y-0.5">
              {responsaveis.map((r) => {
                const checked = filtroResps.includes(r.id);
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() =>
                      setFiltroResps((prev) =>
                        prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id],
                      )
                    }
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
                      checked && "bg-accent",
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
            {filtroResps.length > 0 && (
              <Button variant="ghost" size="sm" className="w-full mt-1 h-7 text-xs" onClick={() => setFiltroResps([])}>
                Limpar
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <Select value={filtroSomente} onValueChange={(v: any) => setFiltroSomente(v)}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os cards</SelectItem>
            <SelectItem value="atrasados">Somente atrasados</SelectItem>
            <SelectItem value="hoje">Somente hoje</SelectItem>
            <SelectItem value="semana">Somente esta semana</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-3">
          {colunas.map((s) => (
            <Coluna key={s} status={s} cards={cardsCliente.filter((c) => c.status_card === s)} onIniciar={abrirIniciar} />
          ))}
        </div>
        <DragOverlay>
          {activeId ? (() => {
            const c = cardsCliente.find((x) => x.id === activeId);
            return c ? <CardItem card={c} onIniciar={abrirIniciar} /> : null;
          })() : null}
        </DragOverlay>
      </DndContext>

      <IniciarTarefaDialog open={iniciarOpen} onOpenChange={setIniciarOpen} cardId={iniciarCardId} />
    </div>
  );
}

function AtividadeView() {
  const { clienteId } = useParams();
  const { comentarios, posts, cards, responsaveis } = useCRM();
  const cardIds = cards.filter((c) => c.cliente_id === clienteId).map((c) => c.id);
  const postIds = posts.filter((p) => cardIds.includes(p.card_id)).map((p) => p.id);
  const items = comentarios.filter((c) => c.cliente_id === clienteId || (c.post_id && postIds.includes(c.post_id))).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Sem atividade ainda</div>}
      {items.map((c) => {
        const autor = responsaveis.find((r) => r.id === c.usuario_id);
        return (
          <Card key={c.id}>
            <CardContent className="p-3 flex gap-3">
              {autor && <div className="h-8 w-8 rounded-full text-white text-xs font-semibold flex items-center justify-center" style={{ backgroundColor: autor.cor }}>{autor.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div>}
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">{autor?.nome ?? "Usuário"} · {new Date(c.created_at).toLocaleString("pt-BR")}</div>
                <div className="text-sm mt-1">{c.comentario_texto}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function ClienteDetalhe() {
  const { clienteId } = useParams();
  const { clientes, cards, contratos, responsaveis, statusOptions } = useCRM();
  const { pathname } = useLocation();
  const cliente = clientes.find((c) => c.id === clienteId);

  if (pathname.includes("/posts/")) return <Outlet />;

  if (!cliente) return <div className="p-6 text-muted-foreground">Cliente não encontrado.</div>;

  const contrato = contratos.find((c) => c.cliente_id === cliente.id);
  const cardsCliente = cards.filter((c) => c.cliente_id === cliente.id);
  const postados = cardsCliente.filter((c) => c.status_card === "Postado").length;
  const resps = responsaveis.filter((r) => cliente.responsaveis.includes(r.id));
  const statusOpt = statusOptions.find((s) => s.label === cliente.status_cliente);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{cliente.nome_cliente}</h1>
            {statusOpt && <ColorBadge label={statusOpt.label} color={statusOpt.cor} />}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
            <span>Nicho: <span className="text-foreground">{cliente.nicho}</span></span>
            <span>·</span>
            <span>{postados}/{contrato?.total_posts ?? cardsCliente.length} postados</span>
            <span>·</span>
            <AvatarStack responsaveis={resps} size="sm" />
          </div>
        </div>
      </div>

      <Tabs defaultValue="quadro">
        <TabsList>
          <TabsTrigger value="quadro">Quadro</TabsTrigger>
          <TabsTrigger value="atividade">Atividade</TabsTrigger>
        </TabsList>
        <TabsContent value="quadro" className="mt-4"><KanbanView /></TabsContent>
        <TabsContent value="atividade" className="mt-4"><AtividadeView /></TabsContent>
      </Tabs>
    </div>
  );
}
