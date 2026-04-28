import { useMemo, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCRM } from "@/store/crm";
import { useDemandas, useDemandasBootstrap, Demanda, getResponsaveisIds } from "@/store/demandas";
import { useAtividades, useAtividadesBootstrap } from "@/store/atividades";
import { useDocumentacao, useDocumentacaoBootstrap } from "@/store/documentacao";
import { PostsKanbanCliente } from "@/components/clientes/PostsKanbanCliente";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarStack } from "@/components/AvatarStack";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusClienteBadge } from "@/components/StatusClienteBadge";
import { NovaDemandaDialog } from "@/components/demandas/NovaDemandaDialog";
import { AreaTab } from "@/components/projeto/AreaTab";
import { VisaoGeralCard } from "@/components/projeto/VisaoGeralCard";
import { DocumentacaoTab } from "@/components/projeto/DocumentacaoTab";
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
  Activity,
  Users,
  BarChart3,
  FileText,
  Plus,
  MessageSquare,
  Paperclip,
  Play,
  CheckCircle2,
  ArrowRight,
  Video,
  Megaphone,
  Globe,
  Bot,
  FolderOpen,
  ClipboardList,
  CalendarRange,
  AlertTriangle,
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
import { CATEGORIA_LABEL, DemandaCategoria } from "@/lib/demandas-categorias";

// ===== Filtros canônicos por área =====
const URGENCIA_OUTRO_CATS: DemandaCategoria[] = [
  "Suporte",
  "Personalizado",
  "Designer",
  "Tecnologia",
];

function filtrarPorArea(demandas: Demanda[], area: string): Demanda[] {
  switch (area) {
    case "videos":
      return demandas.filter((d) => d.categoria === "EditorVideo");
    case "trafego":
      return demandas.filter((d) => d.categoria === "TrafegoPago");
    case "lp":
      return demandas.filter((d) => d.categoria === "LandingPage");
    case "ia":
      return demandas.filter((d) => d.categoria === "IAAtendimento");
    case "briefing":
      return demandas.filter((d) => d.categoria === "Briefing");
    case "planejamento":
      return demandas.filter((d) => d.categoria === "Planejamento");
    case "urgencias":
      return demandas.filter(
        (d) => URGENCIA_OUTRO_CATS.includes(d.categoria) || d.prioridade === "Urgente",
      );
    default:
      return demandas;
  }
}

// Mapeia categoria -> aba
function categoriaParaAba(cat: DemandaCategoria): string {
  switch (cat) {
    case "EditorVideo": return "videos";
    case "TrafegoPago": return "trafego";
    case "LandingPage": return "lp";
    case "IAAtendimento": return "ia";
    case "Briefing": return "briefing";
    case "Planejamento": return "planejamento";
    default: return "urgencias";
  }
}

export default function ProjetoCliente() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  useDemandasBootstrap();
  useAtividadesBootstrap(clienteId);
  useDocumentacaoBootstrap();

  const { clientes, cards, responsaveis } = useCRM();
  const demandas = useDemandas((s) => s.demandas);
  const docsAll = useDocumentacao((s) => s.itens);
  const docs = useMemo(
    () => docsAll.filter((i) => i.cliente_id === clienteId),
    [docsAll, clienteId],
  );
  const cliente = clientes.find((c) => c.id === clienteId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get("tab") ?? "visao");
  const handleTabChange = (v: string) => {
    setTab(v);
    const next = new URLSearchParams(searchParams);
    if (v === "visao") next.delete("tab");
    else next.set("tab", v);
    setSearchParams(next, { replace: true });
  };
  const [novaTarefaOpen, setNovaTarefaOpen] = useState(false);
  const [novoDocOpen, setNovoDocOpen] = useState(false);

  if (!cliente) {
    return (
      <div className="p-6 text-muted-foreground">Cliente não encontrado.</div>
    );
  }

  const cardsCli = cards.filter((c) => c.cliente_id === clienteId);
  const demandasCli = demandas.filter((d) => d.cliente_id === clienteId);

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
              Hub de projeto · tarefas organizadas por área
            </p>
          </div>
        </div>
        <Button onClick={() => setNovaTarefaOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar Tarefa
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="visao" className="gap-1"><LayoutGrid className="h-3.5 w-3.5" /> Visão Geral</TabsTrigger>
            <TabsTrigger value="posts" className="gap-1"><FileText className="h-3.5 w-3.5" /> Posts</TabsTrigger>
            <TabsTrigger value="videos" className="gap-1"><Video className="h-3.5 w-3.5" /> Vídeos</TabsTrigger>
            <TabsTrigger value="trafego" className="gap-1"><Megaphone className="h-3.5 w-3.5" /> Tráfego Pago</TabsTrigger>
            <TabsTrigger value="lp" className="gap-1"><Globe className="h-3.5 w-3.5" /> LP / Site</TabsTrigger>
            <TabsTrigger value="ia" className="gap-1"><Bot className="h-3.5 w-3.5" /> IA / Atendimento</TabsTrigger>
            <TabsTrigger value="documentacao" className="gap-1"><FolderOpen className="h-3.5 w-3.5" /> Documentação</TabsTrigger>
            <TabsTrigger value="briefing" className="gap-1"><ClipboardList className="h-3.5 w-3.5" /> Briefing</TabsTrigger>
            <TabsTrigger value="planejamento" className="gap-1"><CalendarRange className="h-3.5 w-3.5" /> Planejamento</TabsTrigger>
            <TabsTrigger value="atividades" className="gap-1"><Activity className="h-3.5 w-3.5" /> Atividades</TabsTrigger>
            <TabsTrigger value="responsaveis" className="gap-1"><Users className="h-3.5 w-3.5" /> Responsáveis</TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Relatórios</TabsTrigger>
          </TabsList>
        </div>

        {/* ============== VISÃO GERAL ============== */}
        <TabsContent value="visao" className="mt-4">
          <VisaoGeral
            cardsCli={cardsCli}
            demandasCli={demandasCli}
            docsCli={docs}
            onNavegar={setTab}
          />
        </TabsContent>

        {/* ============== POSTS ============== */}
        <TabsContent value="posts" className="mt-4">
          <PostsKanbanCliente />
        </TabsContent>

        {/* ============== VÍDEOS ============== */}
        <TabsContent value="videos" className="mt-4">
          <AreaTab
            titulo="Vídeos"
            icone={Video}
            clienteId={clienteId!}
            demandas={filtrarPorArea(demandasCli, "videos")}
            categoria="EditorVideo"
          />
        </TabsContent>

        {/* ============== TRÁFEGO PAGO ============== */}
        <TabsContent value="trafego" className="mt-4">
          <AreaTab
            titulo="Tráfego Pago"
            icone={Megaphone}
            clienteId={clienteId!}
            demandas={filtrarPorArea(demandasCli, "trafego")}
            categoria="TrafegoPago"
          />
        </TabsContent>

        {/* ============== LP / SITE ============== */}
        <TabsContent value="lp" className="mt-4">
          <AreaTab
            titulo="Landing Page / Site"
            icone={Globe}
            clienteId={clienteId!}
            demandas={filtrarPorArea(demandasCli, "lp")}
            categoria="LandingPage"
          />
        </TabsContent>

        {/* ============== IA / ATENDIMENTO ============== */}
        <TabsContent value="ia" className="mt-4">
          <AreaTab
            titulo="IA / Atendimento"
            icone={Bot}
            clienteId={clienteId!}
            demandas={filtrarPorArea(demandasCli, "ia")}
            categoria="IAAtendimento"
          />
        </TabsContent>

        {/* ============== DOCUMENTAÇÃO E ACESSOS ============== */}
        <TabsContent value="documentacao" className="mt-4">
          <DocumentacaoTab
            clienteId={clienteId!}
            novoOpenExterno={novoDocOpen}
            onNovoOpenChangeExterno={setNovoDocOpen}
          />
        </TabsContent>

        {/* ============== BRIEFING ============== */}
        <TabsContent value="briefing" className="mt-4">
          <AreaTab
            titulo="Briefing"
            icone={ClipboardList}
            clienteId={clienteId!}
            demandas={filtrarPorArea(demandasCli, "briefing")}
            categoria="Briefing"
            emptyHint="Registre aqui o briefing do cliente: reunião inicial, atualizações e revisões."
          />
        </TabsContent>

        {/* ============== PLANEJAMENTO ============== */}
        <TabsContent value="planejamento" className="mt-4">
          <AreaTab
            titulo="Planejamento"
            icone={CalendarRange}
            clienteId={clienteId!}
            demandas={filtrarPorArea(demandasCli, "planejamento")}
            categoria="Planejamento"
            emptyHint="Crie tarefas de planejamento mensal, trimestral, campanhas e lançamentos."
          />
        </TabsContent>

        {/* ============== ATIVIDADES ============== */}
        <TabsContent value="atividades" className="mt-4">
          <AtividadesTab clienteId={clienteId!} demandasCli={demandasCli} />
        </TabsContent>

        {/* ============== RESPONSÁVEIS ============== */}
        <TabsContent value="responsaveis" className="mt-4">
          <ResponsaveisTab cardsCli={cardsCli} demandasCli={demandasCli} />
        </TabsContent>

        {/* ============== RELATÓRIOS ============== */}
        <TabsContent value="relatorios" className="mt-4">
          <RelatoriosTab cardsCli={cardsCli} demandasCli={demandasCli} />
        </TabsContent>
      </Tabs>

      {/* Modal global "Adicionar Tarefa" — cliente fixado, escolhe categoria */}
      <NovaDemandaDialog
        open={novaTarefaOpen}
        onOpenChange={setNovaTarefaOpen}
        defaultClienteId={clienteId!}
        lockCliente
        titulo="Nova Tarefa"
        onCreated={(_id, categoria) => {
          // Após criar, leva o usuário para a aba correspondente
          handleTabChange(categoriaParaAba(categoria));
        }}
      />
    </div>
  );
}

// =====================================================
// VISÃO GERAL — 9 cards compactos com "Ver detalhes"
// =====================================================
function VisaoGeral({
  cardsCli,
  demandasCli,
  docsCli,
  onNavegar,
}: {
  cardsCli: any[];
  demandasCli: Demanda[];
  docsCli: any[];
  onNavegar: (tab: string) => void;
}) {
  const { responsaveis } = useCRM();

  const respsDe = (lista: Demanda[]) => {
    const ids = new Set<string>();
    lista.forEach((d) => getResponsaveisIds(d).forEach((r) => ids.add(r)));
    return responsaveis.filter((r) => ids.has(r.id));
  };

  // Posts (vem de cards)
  const postsTotal = cardsCli.length;
  const postsPend = cardsCli.filter((c) => c.status_card !== "Postado").length;
  const postsAtras = cardsCli.filter((c) => c.status_card === "Atrasado").length;
  const respsPostsIds = new Set<string>();
  cardsCli.forEach((c) => (c.responsaveis ?? []).forEach((r: string) => respsPostsIds.add(r)));
  const respsPosts = responsaveis.filter((r) => respsPostsIds.has(r.id));

  const calcular = (lista: Demanda[]) => ({
    total: lista.length,
    pendentes: lista.filter((d) => !["Concluido", "Entregue"].includes(d.status)).length,
    atrasadas: lista.filter((d) => d.status === "Atrasado").length,
    resps: respsDe(lista),
  });

  const videos = calcular(filtrarPorArea(demandasCli, "videos"));
  const trafego = calcular(filtrarPorArea(demandasCli, "trafego"));
  const lp = calcular(filtrarPorArea(demandasCli, "lp"));
  const ia = calcular(filtrarPorArea(demandasCli, "ia"));
  const briefing = calcular(filtrarPorArea(demandasCli, "briefing"));
  const planejamento = calcular(filtrarPorArea(demandasCli, "planejamento"));
  const urgencias = calcular(filtrarPorArea(demandasCli, "urgencias"));

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      <VisaoGeralCard
        titulo="Posts"
        icone={FileText}
        total={postsTotal}
        pendentes={postsPend}
        atrasadas={postsAtras}
        responsaveis={respsPosts}
        onVerDetalhes={() => onNavegar("posts")}
      />
      <VisaoGeralCard
        titulo="Vídeos"
        icone={Video}
        total={videos.total}
        pendentes={videos.pendentes}
        atrasadas={videos.atrasadas}
        responsaveis={videos.resps}
        onVerDetalhes={() => onNavegar("videos")}
      />
      <VisaoGeralCard
        titulo="Tráfego Pago"
        icone={Megaphone}
        total={trafego.total}
        pendentes={trafego.pendentes}
        atrasadas={trafego.atrasadas}
        responsaveis={trafego.resps}
        onVerDetalhes={() => onNavegar("trafego")}
      />
      <VisaoGeralCard
        titulo="LP / Site"
        icone={Globe}
        total={lp.total}
        pendentes={lp.pendentes}
        atrasadas={lp.atrasadas}
        responsaveis={lp.resps}
        onVerDetalhes={() => onNavegar("lp")}
      />
      <VisaoGeralCard
        titulo="IA / Atendimento"
        icone={Bot}
        total={ia.total}
        pendentes={ia.pendentes}
        atrasadas={ia.atrasadas}
        responsaveis={ia.resps}
        onVerDetalhes={() => onNavegar("ia")}
      />
      <VisaoGeralCard
        titulo="Documentação"
        icone={FolderOpen}
        total={docsCli.length}
        pendentes={0}
        atrasadas={0}
        responsaveis={[]}
        onVerDetalhes={() => onNavegar("documentacao")}
      />
      <VisaoGeralCard
        titulo="Briefing"
        icone={ClipboardList}
        total={briefing.total}
        pendentes={briefing.pendentes}
        atrasadas={briefing.atrasadas}
        responsaveis={briefing.resps}
        onVerDetalhes={() => onNavegar("briefing")}
      />
      <VisaoGeralCard
        titulo="Planejamento"
        icone={CalendarRange}
        total={planejamento.total}
        pendentes={planejamento.pendentes}
        atrasadas={planejamento.atrasadas}
        responsaveis={planejamento.resps}
        onVerDetalhes={() => onNavegar("planejamento")}
      />
      <VisaoGeralCard
        titulo="Urgências / Outros"
        icone={AlertTriangle}
        total={urgencias.total}
        pendentes={urgencias.pendentes}
        atrasadas={urgencias.atrasadas}
        responsaveis={urgencias.resps}
        onVerDetalhes={() => onNavegar("urgencias" === "urgencias" ? "atividades" : "atividades")}
      />
    </section>
  );
}

// =====================================================
// Helpers visuais
// =====================================================
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

// =====================================================
// ATIVIDADES — badge identifica área de origem
// =====================================================
function badgeAreaPorCategoria(cat: DemandaCategoria): { label: string; cls: string } {
  switch (cat) {
    case "EditorVideo": return { label: "VÍDEO", cls: "border-purple-500/40 text-purple-500" };
    case "TrafegoPago": return { label: "TRÁFEGO", cls: "border-emerald-500/40 text-emerald-500" };
    case "LandingPage": return { label: "LP", cls: "border-blue-500/40 text-blue-500" };
    case "IAAtendimento": return { label: "IA", cls: "border-cyan-500/40 text-cyan-500" };
    case "Briefing": return { label: "BRIEFING", cls: "border-amber-500/40 text-amber-500" };
    case "Planejamento": return { label: "PLANEJ.", cls: "border-indigo-500/40 text-indigo-500" };
    default: return { label: "URGÊNCIA", cls: "border-destructive/40 text-destructive" };
  }
}

function AtividadesTab({
  clienteId,
  demandasCli,
}: {
  clienteId: string;
  demandasCli: Demanda[];
}) {
  const itens = useAtividades((s) => s.porCliente[clienteId]);
  const loading = useAtividades((s) => s.loading[clienteId]);
  const hasMore = useAtividades((s) => s.hasMore[clienteId]);
  const load = useAtividades((s) => s.loadByCliente);
  const { responsaveis } = useCRM();

  const lista = itens ?? [];
  const demMap = useMemo(() => {
    const m = new Map<string, Demanda>();
    demandasCli.forEach((d) => m.set(d.id, d));
    return m;
  }, [demandasCli]);

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
                let badge: { label: string; cls: string };
                if (a.tipo === "post") {
                  badge = { label: "POST", cls: "border-primary/40 text-primary" };
                } else {
                  const dem = a.referencia_id ? demMap.get(a.referencia_id) : undefined;
                  badge = dem
                    ? badgeAreaPorCategoria(dem.categoria)
                    : { label: "TAREFA", cls: "border-border text-muted-foreground" };
                }
                return (
                  <li key={a.id} className="flex items-start gap-2 text-xs">
                    <AcaoIcone tipo={a.tipo} acao={a.acao} />
                    <div className="flex-1">
                      <div>
                        <Badge variant="outline" className={cn("text-[9px] mr-1.5 h-4 px-1", badge.cls)}>
                          {badge.label}
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

// =====================================================
// RESPONSÁVEIS — 8 seções (uma por área + Geral)
// =====================================================
const SECOES_RESP = [
  { key: "posts", titulo: "Responsáveis dos Posts", icone: FileText },
  { key: "videos", titulo: "Responsáveis dos Vídeos", icone: Video },
  { key: "trafego", titulo: "Responsáveis do Tráfego", icone: Megaphone },
  { key: "lp", titulo: "Responsáveis de LP / Site", icone: Globe },
  { key: "ia", titulo: "Responsáveis de IA / Atendimento", icone: Bot },
  { key: "briefing", titulo: "Responsáveis de Briefing", icone: ClipboardList },
  { key: "planejamento", titulo: "Responsáveis de Planejamento", icone: CalendarRange },
  { key: "urgencias", titulo: "Responsáveis Gerais / Urgências", icone: AlertTriangle },
] as const;

function ResponsaveisTab({
  cardsCli,
  demandasCli,
}: {
  cardsCli: any[];
  demandasCli: Demanda[];
}) {
  const { responsaveis } = useCRM();

  const renderSecao = (
    titulo: string,
    Icone: any,
    resps: any[],
    countFn: (rid: string) => { total: number; abertos: number; atrasados: number },
  ) => (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icone className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{titulo}</h3>
        <Badge variant="outline" className="text-[10px]">{resps.length}</Badge>
      </div>
      {resps.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-center text-xs text-muted-foreground">
            Nenhum responsável atribuído.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {resps.map((r) => {
            const c = countFn(r.id);
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
                    <Stat label="Total" value={c.total} />
                    <Stat label="Abertos" value={c.abertos} />
                    <Stat label="Atrasados" value={c.atrasados} danger={c.atrasados > 0} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );

  // Posts
  const respsPostsIds = new Set<string>();
  cardsCli.forEach((c) => (c.responsaveis ?? []).forEach((r: string) => respsPostsIds.add(r)));
  const respsPosts = responsaveis.filter((r) => respsPostsIds.has(r.id));
  const countPosts = (rid: string) => {
    const meus = cardsCli.filter((c) => (c.responsaveis ?? []).includes(rid));
    return {
      total: meus.length,
      abertos: meus.filter((c) => c.status_card !== "Postado").length,
      atrasados: meus.filter((c) => c.status_card === "Atrasado").length,
    };
  };

  const respsArea = (area: string) => {
    const lista = filtrarPorArea(demandasCli, area);
    const ids = new Set<string>();
    lista.forEach((d) => getResponsaveisIds(d).forEach((r) => ids.add(r)));
    return responsaveis.filter((r) => ids.has(r.id));
  };
  const countArea = (area: string) => (rid: string) => {
    const meus = filtrarPorArea(demandasCli, area).filter((d) =>
      getResponsaveisIds(d).includes(rid),
    );
    return {
      total: meus.length,
      abertos: meus.filter((d) => !["Concluido", "Entregue"].includes(d.status)).length,
      atrasados: meus.filter((d) => d.status === "Atrasado").length,
    };
  };

  return (
    <div className="space-y-6">
      {renderSecao("Responsáveis dos Posts", FileText, respsPosts, countPosts)}
      {SECOES_RESP.filter((s) => s.key !== "posts").map((s) =>
        renderSecao(s.titulo, s.icone, respsArea(s.key), countArea(s.key)),
      )}
    </div>
  );
}

// =====================================================
// RELATÓRIOS — separados por área
// =====================================================
const AREAS_RELATORIO = [
  { key: "posts", label: "Posts" },
  { key: "videos", label: "Vídeos" },
  { key: "trafego", label: "Tráfego" },
  { key: "lp", label: "LP / Site" },
  { key: "ia", label: "IA / Atend." },
  { key: "briefing", label: "Briefing" },
  { key: "planejamento", label: "Planej." },
  { key: "urgencias", label: "Urgências" },
] as const;

function RelatoriosTab({
  cardsCli,
  demandasCli,
}: {
  cardsCli: any[];
  demandasCli: Demanda[];
}) {
  const [filtroArea, setFiltroArea] = useState<string>("tudo");

  const dadosPosts = {
    total: cardsCli.length,
    concluidas: cardsCli.filter((c) => c.status_card === "Postado").length,
    pendentes: cardsCli.filter((c) => !["Postado", "Atrasado"].includes(c.status_card)).length,
    atrasadas: cardsCli.filter((c) => c.status_card === "Atrasado").length,
  };

  const calc = (lista: Demanda[]) => ({
    total: lista.length,
    concluidas: lista.filter((d) => ["Concluido", "Entregue"].includes(d.status)).length,
    pendentes: lista.filter((d) => !["Concluido", "Entregue", "Atrasado"].includes(d.status)).length,
    atrasadas: lista.filter((d) => d.status === "Atrasado").length,
  });

  const stats = AREAS_RELATORIO.map((a) => ({
    key: a.key,
    label: a.label,
    ...(a.key === "posts" ? dadosPosts : calc(filtrarPorArea(demandasCli, a.key))),
  }));

  const visiveis = filtroArea === "tudo" ? stats : stats.filter((s) => s.key === filtroArea);

  const chartData = visiveis.map((s) => ({
    nome: s.label,
    Concluídas: s.concluidas,
    Pendentes: s.pendentes,
    Atrasadas: s.atrasadas,
  }));

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2">
          <Select value={filtroArea} onValueChange={setFiltroArea}>
            <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tudo">Todas as áreas</SelectItem>
              {AREAS_RELATORIO.map((a) => (
                <SelectItem key={a.key} value={a.key}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {visiveis.map((s) => (
          <Card key={s.key}>
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide">{s.label}</div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Total" value={s.total} />
                <Stat label="Concluídas" value={s.concluidas} />
                <Stat label="Pendentes" value={s.pendentes} warn={s.pendentes > 0} />
                <Stat label="Atrasadas" value={s.atrasadas} danger={s.atrasadas > 0} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="text-xs font-semibold mb-2 text-muted-foreground">
            Comparativo por área
          </div>
          {chartData.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">Sem dados.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="Concluídas" fill="hsl(var(--status-postado))" />
                <Bar dataKey="Pendentes" fill="hsl(var(--status-criar))" />
                <Bar dataKey="Atrasadas" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
