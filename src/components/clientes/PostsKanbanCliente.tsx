import { useParams, Link, useNavigate } from "react-router-dom";
import { useCRM, StatusCard, Card as CardT } from "@/store/crm";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const CARDS_POR_PAGINA = 8;
import { AvatarStack } from "@/components/AvatarStack";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Zap, Play, Calendar, CalendarX, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function CardItem({ card, onIniciar }: { card: CardT; onIniciar: (id: string) => void }) {
  const { responsaveis, posts, updateCard } = useCRM();
  const { canWrite } = useAuth();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  const post = posts.find((p) => p.card_id === card.id);
  const resps = responsaveis.filter((r) => card.responsaveis.includes(r.id));
  const isUrgent = !!card.is_urgent;
  const isPlanejamento = card.status_card === "Planejamento";
  const isAtrasadoStatus = card.status_card === "Atrasado";

  const isPlaceholderTitulo = /^Post Mês \d+ - Semana \d+$/i.test(card.titulo_card.trim());
  const tituloVisivel = isPlaceholderTitulo && isPlanejamento ? "Definir título da tarefa" : card.titulo_card;

  const [editingTitulo, setEditingTitulo] = useState(false);
  const [tituloDraft, setTituloDraft] = useState(isPlaceholderTitulo ? "" : card.titulo_card);

  const startEdit = (e: React.MouseEvent) => {
    if (!canWrite) return;
    e.preventDefault();
    e.stopPropagation();
    setTituloDraft(isPlaceholderTitulo ? "" : card.titulo_card);
    setEditingTitulo(true);
  };

  const commitTitulo = () => {
    const novo = tituloDraft.trim();
    setEditingTitulo(false);
    if (!novo) return;
    if (novo === card.titulo_card) return;
    updateCard(card.id, { titulo_card: novo });
    toast.success("Título atualizado");
  };

  const due = card.data_agendada ? new Date(card.data_agendada) : null;
  let prazoState: "none" | "future" | "today" | "overdue" = "none";
  let prazoLabel = "Definir prazo";
  if (due) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    if (due < hoje) prazoState = "overdue";
    else if (due >= hoje && due < amanha) prazoState = "today";
    else prazoState = "future";
    prazoLabel = format(due, "dd MMM yyyy", { locale: ptBR });
  }
  const prazoColor =
    prazoState === "overdue"
      ? "text-destructive"
      : prazoState === "today"
      ? "text-amber-500"
      : "text-muted-foreground";
  const PrazoIcon = prazoState === "overdue" ? CalendarX : Calendar;

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
        "group relative bg-card border rounded-lg p-2.5 mb-1.5 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all",
        isUrgent && "border-l-2 border-l-amber-500",
        isAtrasadoStatus && "border-l-2 border-l-red-500",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          {isUrgent && <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />}
          {editingTitulo ? (
            <Input
              autoFocus
              value={tituloDraft}
              onChange={(e) => setTituloDraft(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onBlur={commitTitulo}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                else if (e.key === "Escape") { e.preventDefault(); setEditingTitulo(false); }
              }}
              placeholder="Título da tarefa"
              className="h-7 text-sm py-1 px-2"
            />
          ) : (
            <span
              title={canWrite ? "Clique para editar o título" : card.titulo_card}
              onPointerDown={(e) => { if (canWrite) e.stopPropagation(); }}
              onClick={canWrite ? startEdit : undefined}
              onDoubleClick={canWrite && !isPlanejamento ? startEdit : undefined}
              className={cn(
                "text-sm font-medium leading-tight line-clamp-2 break-words",
                isPlaceholderTitulo && isPlanejamento && "text-muted-foreground italic",
                canWrite && "cursor-text hover:text-primary transition-colors",
              )}
            >
              {tituloVisivel}
            </span>
          )}
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
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
        <span>Post Mês {card.mes_referencia} · Semana {card.numero_semana}</span>
        {card.formato && (
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
            {card.formato}{card.formato === "Carrossel" && card.qtd_slides ? ` · ${card.qtd_slides} slides` : ""}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-1.5 gap-2">
        <div className={cn("flex items-center gap-1 text-[11px]", prazoColor)}>
          <PrazoIcon className="h-3 w-3" />
          <span className={cn(prazoState === "overdue" && "font-semibold")}>{prazoLabel}</span>
        </div>
        <AvatarStack responsaveis={resps} size="xs" max={3} />
      </div>

      {isPlanejamento && canWrite ? (
        <Button
          type="button"
          size="sm"
          variant="default"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleIniciar}
          className="mt-1.5 w-full h-7 text-xs gap-1.5"
        >
          <Play className="h-3 w-3" /> Iniciar tarefa
        </Button>
      ) : (
        <div className="mt-1.5 flex justify-end">
          <StatusBadge status={card.status_card} />
        </div>
      )}
    </div>
  );

  if (!post) return inner;
  return <Link to={`posts/${post.id}`}>{inner}</Link>;
}

function Coluna({
  status,
  cards,
  onIniciar,
  pagina,
  onPaginaChange,
}: {
  status: StatusCard;
  cards: CardT[];
  onIniciar: (id: string) => void;
  pagina: number;
  onPaginaChange: (p: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const isAtrasado = status === "Atrasado";
  const total = cards.length;
  const totalPaginas = Math.max(1, Math.ceil(total / CARDS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * CARDS_POR_PAGINA;
  const visiveis = cards.slice(inicio, inicio + CARDS_POR_PAGINA);
  const scrollRef = useRef<HTMLDivElement>(null);

  const goTo = (p: number) => {
    onPaginaChange(p);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[270px] shrink-0 bg-muted/30 rounded-lg p-2 transition-colors flex flex-col h-full",
        isOver && "bg-accent/40 ring-2 ring-primary/30",
        isAtrasado && total > 0 && "ring-1 ring-red-500/30",
      )}
    >
      <div className="flex items-center justify-between px-1 py-1.5 mb-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className={cn("text-xs", isAtrasado && total > 0 ? "text-red-500 font-semibold" : "text-muted-foreground")}>
            {total}
          </span>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto scrollbar-thin pr-1 flex-1 min-h-0"
      >
        {visiveis.map((c) => <CardItem key={c.id} card={c} onIniciar={onIniciar} />)}
      </div>
      {total > CARDS_POR_PAGINA && (
        <div className="flex items-center justify-between gap-1 mt-2 px-1 pt-1.5 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={paginaAtual <= 1}
            onClick={() => goTo(paginaAtual - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground">
            Página {paginaAtual} / {totalPaginas}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => goTo(paginaAtual + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function PostsKanbanCliente(_props: { onAdicionarTarefa?: () => void } = {}) {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const { cards, posts, moveCard, contratos, statusPostOptions, responsaveis, createCardRascunho } = useCRM();
  const { canWrite } = useAuth();
  const [filtroMes, setFiltroMes] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [criandoTarefa, setCriandoTarefa] = useState(false);

  const [filtroResps, setFiltroResps] = useState<string[]>([]);
  const [filtroSomente, setFiltroSomente] = useState<"todos" | "atrasados" | "hoje" | "semana">("todos");
  const [busca, setBusca] = useState("");
  const [paginas, setPaginas] = useState<Record<string, number>>({});

  useEffect(() => {
    setPaginas({});
  }, [filtroMes, filtroResps, filtroSomente, busca, clienteId]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const colunas = useMemo(() => statusPostOptions.map((o) => o.label), [statusPostOptions]);

  const cardsCliente = useMemo(() => {
    const hojeStart = new Date(); hojeStart.setHours(0, 0, 0, 0);
    const amanhaStart = new Date(hojeStart); amanhaStart.setDate(amanhaStart.getDate() + 1);
    const semanaFim = new Date(hojeStart); semanaFim.setDate(semanaFim.getDate() + 7);
    const q = busca.trim().toLowerCase();
    return cards
      .filter((c) => c.cliente_id === clienteId)
      .filter((c) => filtroMes === "all" || c.mes_referencia === Number(filtroMes))
      .filter((c) => filtroResps.length === 0 || c.responsaveis.some((r) => filtroResps.includes(r)))
      .filter((c) => !q || c.titulo_card.toLowerCase().includes(q) || (c.descricao ?? "").toLowerCase().includes(q))
      .filter((c) => {
        if (filtroSomente === "todos") return true;
        if (filtroSomente === "atrasados") return c.status_card === "Atrasado";
        const due = c.data_agendada ? new Date(c.data_agendada) : null;
        if (!due) return false;
        if (filtroSomente === "hoje") return due >= hojeStart && due < amanhaStart;
        if (filtroSomente === "semana") return due >= hojeStart && due < semanaFim;
        return true;
      });
  }, [cards, clienteId, filtroMes, filtroResps, filtroSomente, busca]);

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
      ? "Todos responsáveis do post"
      : filtroResps.length === 1
      ? responsaveis.find((r) => r.id === filtroResps[0])?.nome ?? "1 responsável"
      : `${filtroResps.length} responsáveis`;

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-220px)] overflow-hidden -mx-6 px-6 w-[calc(100%+3rem)]">
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
            <div className="text-[11px] text-muted-foreground px-2 pb-1.5">Filtrar por responsável do post</div>
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

        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título..."
            className="h-9 pl-8 text-sm"
          />
        </div>

        {canWrite && onAdicionarTarefa && (
          <Button onClick={onAdicionarTarefa} size="sm" className="h-9">
            <Plus className="h-4 w-4 mr-1" /> Adicionar Tarefa
          </Button>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="flex gap-3 overflow-x-auto overflow-y-hidden scrollbar-thin pb-2 flex-1 min-h-0">
          {colunas.map((s) => (
            <Coluna
              key={s}
              status={s}
              cards={cardsCliente.filter((c) => c.status_card === s)}
              onIniciar={abrirIniciar}
              pagina={paginas[s] ?? 1}
              onPaginaChange={(p) => setPaginas((prev) => ({ ...prev, [s]: p }))}
            />
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
