import { useParams, Link, Outlet, useLocation } from "react-router-dom";
import { useCRM, StatusCard, Card as CardT } from "@/store/crm";
import { useMemo, useState } from "react";
import { AvatarStack } from "@/components/AvatarStack";
import { StatusBadge, ColorBadge } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// Colunas agora vêm dinamicamente de statusPostOptions (Configurações → Status de Posts)

function CardItem({ card }: { card: CardT }) {
  const { responsaveis, posts } = useCRM();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  const post = posts.find((p) => p.card_id === card.id);
  const resps = responsaveis.filter((r) => card.responsaveis.includes(r.id));
  return (
    <Link to={post ? `posts/${post.id}` : "#"}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={cn(
          "bg-card border rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all",
          isDragging && "opacity-40"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-sm font-medium leading-tight">{card.titulo_card}</div>
          <StatusBadge status={card.status_card} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Mês {card.mes_referencia} · Sem {card.numero_semana}</span>
          <AvatarStack responsaveis={resps} size="xs" max={3} />
        </div>
      </div>
    </Link>
  );
}

function Coluna({ status, cards }: { status: StatusCard; cards: CardT[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 min-w-[260px] bg-muted/30 rounded-lg p-2 transition-colors",
        isOver && "bg-accent/40 ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-center justify-between px-1 py-1.5 mb-2">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-xs text-muted-foreground">{cards.length}</span>
        </div>
      </div>
      <div className="min-h-[100px]">
        {cards.map((c) => <CardItem key={c.id} card={c} />)}
      </div>
    </div>
  );
}

function KanbanView() {
  const { clienteId } = useParams();
  const { cards, moveCard, contratos, statusPostOptions } = useCRM();
  const { canWrite } = useAuth();
  const [filtroMes, setFiltroMes] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const colunas = useMemo(() => statusPostOptions.map((o) => o.label), [statusPostOptions]);

  const cardsCliente = useMemo(
    () => cards.filter((c) => c.cliente_id === clienteId).filter((c) => filtroMes === "all" || c.mes_referencia === Number(filtroMes)),
    [cards, clienteId, filtroMes]
  );

  const totalMeses = useMemo(() => {
    const contrato = contratos.find((c) => c.cliente_id === clienteId);
    if (contrato?.total_posts) return Math.max(1, Math.min(6, Math.round(contrato.total_posts / 4)));
    const cardsDoCliente = cards.filter((c) => c.cliente_id === clienteId);
    const max = cardsDoCliente.reduce((acc, c) => Math.max(acc, c.mes_referencia), 0);
    return Math.max(1, Math.min(6, max || 3));
  }, [contratos, cards, clienteId]);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!canWrite) return;
    if (!e.over) return;
    const novoStatus = String(e.over.id);
    if (colunas.includes(novoStatus)) moveCard(String(e.active.id), novoStatus as StatusCard);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {Array.from({ length: totalMeses }, (_, i) => i + 1).map((m) => (
              <SelectItem key={m} value={String(m)}>Mês {m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-3">
          {colunas.map((s) => (
            <Coluna key={s} status={s} cards={cardsCliente.filter((c) => c.status_card === s)} />
          ))}
        </div>
        <DragOverlay>
          {activeId ? (() => {
            const c = cardsCliente.find((x) => x.id === activeId);
            return c ? <CardItem card={c} /> : null;
          })() : null}
        </DragOverlay>
      </DndContext>
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

  // se for rota de post, renderiza Outlet
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
