import { useParams, Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { useCRM } from "@/store/crm";
import { useDemandas, useDemandasBootstrap, getResponsaveisIds } from "@/store/demandas";
import { AvatarStack } from "@/components/AvatarStack";
import { StatusClienteBadge } from "@/components/StatusClienteBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostsKanbanCliente } from "@/components/clientes/PostsKanbanCliente";


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
  useDemandasBootstrap();
  const { clienteId } = useParams();
  const { clientes, cards, contratos, responsaveis, statusOptions } = useCRM();
  const demandas = useDemandas((s) => s.demandas);
  const { pathname } = useLocation();
  const cliente = clientes.find((c) => c.id === clienteId);

  if (pathname.includes("/posts/")) return <Outlet />;

  if (!cliente) return <div className="p-6 text-muted-foreground">Cliente não encontrado.</div>;

  const contrato = contratos.find((c) => c.cliente_id === cliente.id);
  const cardsCliente = cards.filter((c) => c.cliente_id === cliente.id);
  const demandasCliente = demandas.filter((d) => d.cliente_id === cliente.id);
  const postados = cardsCliente.filter((c) => c.status_card === "Postado").length;

  // Responsáveis SEPARADOS por origem (nunca usar cliente.responsaveis)
  const respsPostsIds = new Set<string>();
  cardsCliente.forEach((c) => (c.responsaveis ?? []).forEach((r) => respsPostsIds.add(r)));
  const respsPosts = responsaveis.filter((r) => respsPostsIds.has(r.id));

  const respsDemandasIds = new Set<string>();
  demandasCliente.forEach((d) => getResponsaveisIds(d).forEach((r) => respsDemandasIds.add(r)));
  const respsDemandas = responsaveis.filter((r) => respsDemandasIds.has(r.id));

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-start gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{cliente.nome_cliente}</h1>
            <StatusClienteBadge status={cliente.status_global} size="sm" />
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
            <span>Nicho: <span className="text-foreground">{cliente.nicho}</span></span>
            <span>·</span>
            <span>{postados}/{contrato?.total_posts ?? cardsCliente.length} postados</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Responsáveis dos Posts:</span>
              {respsPosts.length > 0 ? (
                <AvatarStack responsaveis={respsPosts} size="xs" max={5} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Responsáveis das Demandas:</span>
              {respsDemandas.length > 0 ? (
                <AvatarStack responsaveis={respsDemandas} size="xs" max={5} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="quadro">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="quadro">Quadro</TabsTrigger>
            <TabsTrigger value="atividade">Atividade</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/clientes/${cliente.id}/projeto`}>
              <LayoutDashboard className="h-4 w-4 mr-1" /> Ver projeto completo
            </Link>
          </Button>
        </div>
        <TabsContent value="quadro" className="mt-4"><PostsKanbanCliente /></TabsContent>
        <TabsContent value="atividade" className="mt-4"><AtividadeView /></TabsContent>
      </Tabs>
    </div>
  );
}
