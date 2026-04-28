import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useCRM } from "@/store/crm";
import { useDemandas, useDemandasBootstrap, Demanda, getResponsaveisIds } from "@/store/demandas";
import { useAtividades, useAtividadesBootstrap } from "@/store/atividades";
import { PostsKanbanCliente } from "@/components/clientes/PostsKanbanCliente";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarStack } from "@/components/AvatarStack";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusClienteBadge } from "@/components/StatusClienteBadge";
import { ProjetoKanban } from "@/components/demandas/ProjetoKanban";
import { NovaDemandaDialog } from "@/components/demandas/NovaDemandaDialog";
import { DemandaDetalheDialog } from "@/components/demandas/DemandaDetalheDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  LayoutGrid,
  ListChecks,
  Activity,
  Users,
  BarChart3,
  AlertTriangle,
  FileText,
  ClipboardList,
  Plus,
  MessageSquare,
  Paperclip,
  Play,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ProjetoCliente() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  useDemandasBootstrap();
  useAtividadesBootstrap(clienteId);

  const { clientes, cards, responsaveis } = useCRM();
  const demandas = useDemandas((s) => s.demandas);
  const cliente = clientes.find((c) => c.id === clienteId);

  if (!cliente) {
    return (
      <div className="p-6 text-muted-foreground">Cliente não encontrado.</div>
    );
  }

  const cardsCli = cards.filter((c) => c.cliente_id === clienteId);
  const demandasCli = demandas.filter((d) => d.cliente_id === clienteId);

  // Responsáveis SEPARADOS por origem (Posts / Demandas) — nunca cliente.responsaveis
  const respsPostsIds = new Set<string>();
  cardsCli.forEach((c) => (c.responsaveis ?? []).forEach((r: string) => respsPostsIds.add(r)));
  const respsPosts = responsaveis.filter((r) => respsPostsIds.has(r.id));

  const respsDemandasIds = new Set<string>();
  demandasCli.forEach((d) => getResponsaveisIds(d).forEach((r) => respsDemandasIds.add(r)));
  const respsDemandas = responsaveis.filter((r) => respsDemandasIds.has(r.id));

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/clientes`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Link to="/clientes" className="hover:underline">
          Clientes
        </Link>
        <span>/</span>
        <span className="hover:underline">{cliente.nome_cliente}</span>
        <span>/</span>
        <span className="text-foreground font-medium">Projeto Completo</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {cliente.nome_cliente.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{cliente.nome_cliente}</h1>
              <StatusClienteBadge status={cliente.status_global} size="sm" />
            </div>
            <p className="text-xs text-muted-foreground">
              Hub de projeto · posts, demandas, atividades e relatórios
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visao">
        <TabsList>
          <TabsTrigger value="visao" className="gap-1">
            <LayoutGrid className="h-3.5 w-3.5" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-1">
            <FileText className="h-3.5 w-3.5" /> Posts
          </TabsTrigger>
          <TabsTrigger value="demandas" className="gap-1">
            <ClipboardList className="h-3.5 w-3.5" /> Demandas
          </TabsTrigger>
          <TabsTrigger value="atividades" className="gap-1">
            <Activity className="h-3.5 w-3.5" /> Atividades
          </TabsTrigger>
          <TabsTrigger value="responsaveis" className="gap-1">
            <Users className="h-3.5 w-3.5" /> Responsáveis
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-1">
            <BarChart3 className="h-3.5 w-3.5" /> Relatórios
          </TabsTrigger>
        </TabsList>

        {/* ============== VISÃO GERAL ============== */}
        <TabsContent value="visao" className="mt-4">
          <VisaoGeral
            cliente={cliente}
            cardsCli={cardsCli}
            demandasCli={demandasCli}
            clienteId={clienteId!}
          />
        </TabsContent>

        {/* ============== POSTS ============== */}
        <TabsContent value="posts" className="mt-4">
          <PostsKanbanCliente />
        </TabsContent>

        {/* ============== DEMANDAS ============== */}
        <TabsContent value="demandas" className="mt-4">
          <DemandasTab clienteId={clienteId!} demandasCli={demandasCli} />
        </TabsContent>

        {/* ============== ATIVIDADES ============== */}
        <TabsContent value="atividades" className="mt-4">
          <AtividadesTab clienteId={clienteId!} />
        </TabsContent>

        {/* ============== RESPONSÁVEIS ============== */}
        <TabsContent value="responsaveis" className="mt-4">
          <ResponsaveisTab
            respsPosts={respsPosts}
            respsDemandas={respsDemandas}
            cardsCli={cardsCli}
            demandasCli={demandasCli}
          />
        </TabsContent>

        {/* ============== RELATÓRIOS ============== */}
        <TabsContent value="relatorios" className="mt-4">
          <RelatoriosTab
            cardsCli={cardsCli}
            demandasCli={demandasCli}
            respsPosts={respsPosts}
            respsDemandas={respsDemandas}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// VISÃO GERAL
// =====================================================
function VisaoGeral({
  cliente,
  cardsCli,
  demandasCli,
  clienteId,
}: {
  cliente: any;
  cardsCli: any[];
  demandasCli: Demanda[];
  clienteId: string;
}) {
  const { responsaveis } = useCRM();
  const [novaDemandaOpen, setNovaDemandaOpen] = useState(false);
  const [demandaSelecionada, setDemandaSelecionada] = useState<Demanda | null>(null);

  // Métricas POSTS — só de cards
  const postsTotal = cardsCli.length;
  const postsPendentes = cardsCli.filter((c) => c.status_card !== "Postado").length;
  const postsAtrasados = cardsCli.filter((c) => c.status_card === "Atrasado").length;
  const respsPostsIds = new Set<string>();
  cardsCli.forEach((c) => (c.responsaveis ?? []).forEach((r: string) => respsPostsIds.add(r)));
  const respsPosts = responsaveis.filter((r) => respsPostsIds.has(r.id));

  // Métricas DEMANDAS — só de demandas
  const demTotal = demandasCli.length;
  const demPendentes = demandasCli.filter(
    (d) => !["Concluido", "Entregue"].includes(d.status),
  ).length;
  const demAtrasadas = demandasCli.filter((d) => d.status === "Atrasado").length;
  const respsDemIds = new Set<string>();
  demandasCli.forEach((d) => getResponsaveisIds(d).forEach((r) => respsDemIds.add(r)));
  const respsDem = responsaveis.filter((r) => respsDemIds.has(r.id));

  return (
    <div className="space-y-10">
      {/* ============ KPIs SEPARADOS ============ */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Posts</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Total" value={postsTotal} />
              <Stat label="Pendentes" value={postsPendentes} warn={postsPendentes > 0} />
              <Stat label="Atrasados" value={postsAtrasados} danger={postsAtrasados > 0} />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Responsáveis:</span>
              {respsPosts.length > 0 ? (
                <AvatarStack responsaveis={respsPosts} size="xs" max={6} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Demandas Diárias</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Total" value={demTotal} />
              <Stat label="Pendentes" value={demPendentes} warn={demPendentes > 0} />
              <Stat label="Atrasadas" value={demAtrasadas} danger={demAtrasadas > 0} />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Responsáveis:</span>
              {respsDem.length > 0 ? (
                <AvatarStack responsaveis={respsDem} size="xs" max={6} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ============ POSTS ============ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Posts
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Kanban completo de posts deste cliente.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {cardsCli.length} no total
          </Badge>
        </div>
        <PostsKanbanCliente />
      </section>

      <div className="border-t border-border/60" />

      {/* ============ DEMANDAS ============ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Demandas Diárias
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Kanban completo de demandas deste cliente.
            </p>
          </div>
          <Button size="sm" onClick={() => setNovaDemandaOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Demanda
          </Button>
        </div>
        <ProjetoKanban demandas={demandasCli} onOpen={setDemandaSelecionada} />
        <NovaDemandaDialog
          open={novaDemandaOpen}
          onOpenChange={setNovaDemandaOpen}
          defaultClienteId={clienteId}
        />
        <DemandaDetalheDialog
          demanda={demandaSelecionada}
          onOpenChange={(v) => !v && setDemandaSelecionada(null)}
        />
      </section>

      <div className="border-t border-border/60" />

      {/* ============ ATIVIDADES ============ */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Atividades
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Linha do tempo de tudo que acontece no projeto.
          </p>
        </div>
        <TimelineAtividades clienteId={clienteId} />
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  danger,
  warn,
}: {
  label: string;
  value: number;
  danger?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-lg font-bold tabular-nums",
          danger && "text-destructive",
          warn && "text-amber-500",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function AcaoIcone({ tipo, acao }: { tipo: string; acao: string }) {
  const cls = "h-3.5 w-3.5 shrink-0 mt-0.5";
  if (acao === "comentario") return <MessageSquare className={cn(cls, "text-blue-500")} />;
  if (acao === "anexo") return <Paperclip className={cn(cls, "text-violet-500")} />;
  if (acao === "iniciado") return <Play className={cn(cls, "text-amber-500")} />;
  if (acao === "concluido") return <CheckCircle2 className={cn(cls, "text-emerald-500")} />;
  if (acao === "status") return <ArrowRight className={cn(cls, "text-muted-foreground")} />;
  if (tipo === "post") return <FileText className={cn(cls, "text-primary")} />;
  return <ClipboardList className={cn(cls, "text-primary")} />;
}

function ResumoPosts({
  cardsCli,
  className,
}: {
  cardsCli: any[];
  className?: string;
}) {
  const grupos = ["Planejamento", "Criar", "Revisar", "Agendado", "Postado", "Atrasado"];
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-6 gap-2", className)}>
      {grupos.map((g) => {
        const n = cardsCli.filter((c) => c.status_card === g).length;
        return (
          <Card key={g}>
            <CardContent className="p-3">
              <div className="text-[10px] uppercase text-muted-foreground">
                {g}
              </div>
              <div className="text-xl font-bold">{n}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// =====================================================
// DEMANDAS
// =====================================================
function DemandasTab({
  clienteId,
  demandasCli,
}: {
  clienteId: string;
  demandasCli: Demanda[];
}) {
  const [novaOpen, setNovaOpen] = useState(false);
  const [selecionada, setSelecionada] = useState<Demanda | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setNovaOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova Demanda
        </Button>
      </div>
      <ProjetoKanban demandas={demandasCli} onOpen={setSelecionada} />
      <NovaDemandaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        defaultClienteId={clienteId}
      />
      <DemandaDetalheDialog
        demanda={selecionada}
        onOpenChange={(v) => !v && setSelecionada(null)}
      />
    </div>
  );
}

// =====================================================
// ATIVIDADES (timeline paginada — reutilizada na Visão Geral)
// =====================================================
function TimelineAtividades({ clienteId }: { clienteId: string }) {
  const itens = useAtividades((s) => s.porCliente[clienteId]);
  const loading = useAtividades((s) => s.loading[clienteId]);
  const hasMore = useAtividades((s) => s.hasMore[clienteId]);
  const load = useAtividades((s) => s.loadByCliente);
  const { responsaveis } = useCRM();

  const lista = itens ?? [];

  const grupos = useMemo(() => {
    const map = new Map<string, typeof lista>();
    lista.forEach((a) => {
      const k = format(new Date(a.created_at), "yyyy-MM-dd");
      const arr = map.get(k) ?? [];
      arr.push(a);
      map.set(k, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [lista]);

  const rotuloDia = (dia: string) => {
    const d = new Date(dia);
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
    const dStart = new Date(d); dStart.setHours(0, 0, 0, 0);
    if (dStart.getTime() === hoje.getTime()) return "Hoje";
    if (dStart.getTime() === ontem.getTime()) return "Ontem";
    return format(d, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {grupos.length === 0 && !loading && (
          <div className="text-center text-sm text-muted-foreground py-8">
            Sem atividade registrada para este cliente.
          </div>
        )}
        {grupos.map(([dia, lista]) => (
          <div key={dia} className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground sticky top-0 bg-card py-1">
              {rotuloDia(dia)}
            </div>
            <ul className="space-y-1.5 border-l-2 border-border pl-3 ml-1">
              {lista.map((a) => {
                const autor = responsaveis.find((r) => r.id === a.usuario_id);
                return (
                  <li key={a.id} className="flex items-start gap-2 text-xs">
                    <AcaoIcone tipo={a.tipo} acao={a.acao} />
                    <div className="flex-1">
                      <div>
                        <Badge variant="outline" className="text-[9px] mr-1.5 h-4 px-1">
                          {a.tipo === "post" ? "POST" : "DEMANDA"}
                        </Badge>
                        {a.descricao}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {autor?.nome ?? "Sistema"} ·{" "}
                        {format(new Date(a.created_at), "HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => load(clienteId)}
            >
              {loading ? "Carregando..." : "Carregar mais"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AtividadesTab({ clienteId }: { clienteId: string }) {
  return <TimelineAtividades clienteId={clienteId} />;
}

// =====================================================
// RESPONSÁVEIS — duas seções separadas (Posts / Demandas)
// =====================================================
function ResponsaveisTab({
  respsPosts,
  respsDemandas,
  cardsCli,
  demandasCli,
}: {
  respsPosts: any[];
  respsDemandas: any[];
  cardsCli: any[];
  demandasCli: Demanda[];
}) {
  const renderEmpty = (msg: string) => (
    <Card>
      <CardContent className="p-6 text-center text-sm text-muted-foreground">{msg}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* ====== Responsáveis dos Posts ====== */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Responsáveis dos Posts</h3>
          <Badge variant="outline" className="text-[10px]">{respsPosts.length}</Badge>
        </div>
        {respsPosts.length === 0 ? (
          renderEmpty("Nenhum responsável atribuído aos posts deste cliente.")
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {respsPosts.map((r) => {
              const meusPosts = cardsCli.filter((c) => (c.responsaveis ?? []).includes(r.id));
              const abertos = meusPosts.filter((c) => c.status_card !== "Postado").length;
              const atras = meusPosts.filter((c) => c.status_card === "Atrasado").length;
              return (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-9 w-9 rounded-full text-white text-xs font-semibold flex items-center justify-center"
                        style={{ backgroundColor: r.cor }}
                      >
                        {r.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{r.nome}</div>
                        <div className="text-[10px] text-muted-foreground">{r.email}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Posts" value={meusPosts.length} />
                      <Stat label="Abertos" value={abertos} />
                      <Stat label="Atrasados" value={atras} danger={atras > 0} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ====== Responsáveis das Demandas ====== */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Responsáveis das Demandas</h3>
          <Badge variant="outline" className="text-[10px]">{respsDemandas.length}</Badge>
        </div>
        {respsDemandas.length === 0 ? (
          renderEmpty("Nenhum responsável atribuído às demandas deste cliente.")
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {respsDemandas.map((r) => {
              const minhasDem = demandasCli.filter((d) => getResponsaveisIds(d).includes(r.id));
              const abertas = minhasDem.filter((d) => !["Concluido", "Entregue"].includes(d.status)).length;
              const atras = minhasDem.filter((d) => d.status === "Atrasado").length;
              return (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-9 w-9 rounded-full text-white text-xs font-semibold flex items-center justify-center"
                        style={{ backgroundColor: r.cor }}
                      >
                        {r.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{r.nome}</div>
                        <div className="text-[10px] text-muted-foreground">{r.email}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Demandas" value={minhasDem.length} />
                      <Stat label="Abertas" value={abertas} />
                      <Stat label="Atrasadas" value={atras} danger={atras > 0} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// =====================================================
// RELATÓRIOS — KPIs e gráfico SEPARADOS por origem
// =====================================================
function RelatoriosTab({
  cardsCli,
  demandasCli,
  respsPosts,
  respsDemandas,
}: {
  cardsCli: any[];
  demandasCli: Demanda[];
  respsPosts: any[];
  respsDemandas: any[];
}) {
  // Origem do filtro de responsável: posts | demandas | ambos (separados)
  const [origem, setOrigem] = useState<"ambos" | "posts" | "demandas">("ambos");
  const [fResp, setFResp] = useState("todos");
  const [fCat, setFCat] = useState("todas");

  const cats = Array.from(new Set(demandasCli.map((d) => d.categoria)));

  // Lista de responsáveis no seletor depende da origem
  const respsParaFiltro =
    origem === "posts" ? respsPosts : origem === "demandas" ? respsDemandas : [...respsPosts, ...respsDemandas.filter((r) => !respsPosts.some((p) => p.id === r.id))];

  const cardsFilt = cardsCli.filter((c) => {
    if (origem === "demandas") return false;
    if (fResp !== "todos" && !(c.responsaveis ?? []).includes(fResp)) return false;
    return true;
  });
  const demFilt = demandasCli.filter((d) => {
    if (origem === "posts") return false;
    if (fResp !== "todos" && !getResponsaveisIds(d).includes(fResp)) return false;
    if (fCat !== "todas" && d.categoria !== fCat) return false;
    return true;
  });

  // KPIs SEPARADOS — nunca somar
  const postsTotal = cardsFilt.length;
  const postsEntregues = cardsFilt.filter((c) => c.status_card === "Postado").length;
  const postsAtrasos = cardsFilt.filter((c) => c.status_card === "Atrasado").length;
  const postsPctAtraso = postsTotal > 0 ? Math.round((postsAtrasos / postsTotal) * 100) : 0;

  const demTotal = demFilt.length;
  const demEntregues = demFilt.filter((d) => ["Concluido", "Entregue"].includes(d.status)).length;
  const demAtrasos = demFilt.filter((d) => d.status === "Atrasado").length;
  const demPctAtraso = demTotal > 0 ? Math.round((demAtrasos / demTotal) * 100) : 0;

  // Distribuição — duas séries (Posts / Demandas), nunca empilhadas
  const distribuicaoPosts = respsPosts.map((r) => ({
    nome: r.nome.split(" ")[0],
    Posts: cardsFilt.filter((c) => (c.responsaveis ?? []).includes(r.id)).length,
  }));
  const distribuicaoDem = respsDemandas.map((r) => ({
    nome: r.nome.split(" ")[0],
    Demandas: demFilt.filter((x) => getResponsaveisIds(x).includes(r.id)).length,
  }));

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2">
          <Select value={origem} onValueChange={(v: any) => { setOrigem(v); setFResp("todos"); }}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ambos">Ambos (separados)</SelectItem>
              <SelectItem value="posts">Apenas Posts</SelectItem>
              <SelectItem value="demandas">Apenas Demandas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fResp} onValueChange={setFResp}>
            <SelectTrigger className="h-9 w-56">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">
                {origem === "posts" ? "Todos resp. dos posts" : origem === "demandas" ? "Todos resp. das demandas" : "Todos responsáveis"}
              </SelectItem>
              {respsParaFiltro.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fCat} onValueChange={setFCat}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Categoria (demandas)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {cats.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* KPIs em DUAS GRADES SEPARADAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide">Posts</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Volume" value={postsTotal} />
              <Stat label="Entregues" value={postsEntregues} />
              <Stat label="Atrasos" value={postsAtrasos} danger={postsAtrasos > 0} />
              <Stat label="% Atraso" value={postsPctAtraso} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wide">Demandas Diárias</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Volume" value={demTotal} />
              <Stat label="Entregues" value={demEntregues} />
              <Stat label="Atrasos" value={demAtrasos} danger={demAtrasos > 0} />
              <Stat label="% Atraso" value={demPctAtraso} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição — duas barras lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-semibold mb-2 text-muted-foreground">
              Carga — Responsáveis dos Posts
            </div>
            {distribuicaoPosts.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">Nenhum responsável.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distribuicaoPosts}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Posts" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-semibold mb-2 text-muted-foreground">
              Carga — Responsáveis das Demandas
            </div>
            {distribuicaoDem.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">Nenhum responsável.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distribuicaoDem}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Demandas" fill="hsl(var(--status-renovacao))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
