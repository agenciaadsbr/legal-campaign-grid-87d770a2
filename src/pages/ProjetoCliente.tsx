import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCRM } from "@/store/crm";
import { useDemandas, useDemandasBootstrap, Demanda, getResponsaveisIds } from "@/store/demandas";
import { useAtividades, useAtividadesBootstrap } from "@/store/atividades";
import { useDocumentacao, useDocumentacaoBootstrap } from "@/store/documentacao";
import { useBriefingBootstrap } from "@/store/briefing";
import { usePlanejamentoBootstrap, usePlanejamento, calcularProgresso } from "@/store/planejamento";
import { PostsKanbanCliente } from "@/components/clientes/PostsKanbanCliente";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AvatarStack } from "@/components/AvatarStack";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusClienteBadge } from "@/components/StatusClienteBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useDemandasStore } from "@/store/demandas";
import { CATEGORIAS, CATEGORIA_LABEL as CATLABEL_ALL } from "@/lib/demandas-categorias";
import { toast } from "sonner";
import { AreaTab } from "@/components/projeto/AreaTab";
import { VisaoGeralCard } from "@/components/projeto/VisaoGeralCard";
import { VisaoGeralLista, type VisaoGeralItem } from "@/components/projeto/VisaoGeralLista";
import { DocumentacaoTab } from "@/components/projeto/DocumentacaoTab";
import { BriefingTab } from "@/components/projeto/BriefingTab";
import { PlanejamentoTab } from "@/components/projeto/PlanejamentoTab";
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
  List,
  Activity,
  
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
  Mic,
} from "lucide-react";
import { ReunioesTab } from "@/components/projeto/ReunioesTab";
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
    case "Personalizado":
    case "Suporte":
    case "Designer":      // legado
    case "Tecnologia":    // legado
    default: return "urgencias";
  }
}

export default function ProjetoCliente() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  useDemandasBootstrap();
  useAtividadesBootstrap(clienteId);
  useDocumentacaoBootstrap();
  useBriefingBootstrap();
  usePlanejamentoBootstrap();

  const { clientes, cards, responsaveis } = useCRM();
  const demandas = useDemandas((s) => s.demandas);
  const docsAll = useDocumentacao((s) => s.itens);
  const planAll = usePlanejamento((s) => s.itens);
  const docs = useMemo(
    () => docsAll.filter((i) => i.cliente_id === clienteId),
    [docsAll, clienteId],
  );
  const planCli = useMemo(
    () => planAll.filter((i) => i.cliente_id === clienteId),
    [planAll, clienteId],
  );
  const cliente = clientes.find((c) => c.id === clienteId);
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get("tab") ?? "visao");
  const handleTabChange = (v: string) => {
    setTab(v);
    const next = new URLSearchParams(searchParams);
    if (v === "visao") next.delete("tab");
    else next.set("tab", v);
    next.delete("demanda");
    setSearchParams(next, { replace: true });
  };

  // Deep-link: ?demanda={id} abre o detalhe da demanda na aba correspondente
  const demandaIdParam = searchParams.get("demanda");
  const demandaDeepLink = useMemo(() => {
    if (!demandaIdParam) return null;
    return demandas.find((d) => d.id === demandaIdParam) ?? null;
  }, [demandaIdParam, demandas]);
  const abaDemandaDeepLink = demandaDeepLink ? tab : null;
  useEffect(() => {
    if (!demandaIdParam) return;
    // Limpa o param após o React renderizar (a prop já foi entregue à AreaTab)
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete("demanda");
      setSearchParams(next, { replace: true });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demandaIdParam]);

  const [novaTarefaOpen, setNovaTarefaOpen] = useState(false);
  const [novoDocOpen, setNovoDocOpen] = useState(false);
  const [novoPlanOpen, setNovoPlanOpen] = useState(false);
  const [editarBriefingTrigger, setEditarBriefingTrigger] = useState(false);

  if (!cliente) {
    return (
      <div className="p-6 text-muted-foreground">Cliente não encontrado.</div>
    );
  }

  const cardsCli = cards.filter((c) => c.cliente_id === clienteId);
  const demandasCli = demandas.filter((d) => d.cliente_id === clienteId);

  return (
    <div className="p-6 space-y-4 animate-fade-in min-w-0">
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
            <TabsTrigger value="urgencias" className="gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Urgências</TabsTrigger>
            <TabsTrigger value="documentacao" className="gap-1"><FolderOpen className="h-3.5 w-3.5" /> Acessos, Links e Materiais</TabsTrigger>
            <TabsTrigger value="reunioes" className="gap-1"><Mic className="h-3.5 w-3.5" /> Reuniões</TabsTrigger>
            <TabsTrigger value="briefing" className="gap-1"><ClipboardList className="h-3.5 w-3.5" /> Briefing</TabsTrigger>
            <TabsTrigger value="planejamento" className="gap-1"><CalendarRange className="h-3.5 w-3.5" /> Planejamento</TabsTrigger>
            <TabsTrigger value="atividades" className="gap-1"><Activity className="h-3.5 w-3.5" /> Atividades</TabsTrigger>
            <TabsTrigger value="relatorios" className="gap-1"><BarChart3 className="h-3.5 w-3.5" /> Relatórios</TabsTrigger>
          </TabsList>
        </div>

        {/* ============== VISÃO GERAL ============== */}
        <TabsContent value="visao" className="mt-4">
          <VisaoGeral
            cardsCli={cardsCli}
            demandasCli={demandasCli}
            docsCli={docs}
            onNavegar={handleTabChange}
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
            demandaInicial={abaDemandaDeepLink === "videos" ? demandaDeepLink : null}
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
            demandaInicial={abaDemandaDeepLink === "trafego" ? demandaDeepLink : null}
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
            demandaInicial={abaDemandaDeepLink === "lp" ? demandaDeepLink : null}
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
            demandaInicial={abaDemandaDeepLink === "ia" ? demandaDeepLink : null}
          />
        </TabsContent>

        {/* ============== URGÊNCIAS / OUTROS ============== */}
        <TabsContent value="urgencias" className="mt-4">
          <AreaTab
            titulo="Urgências"
            icone={AlertTriangle}
            clienteId={clienteId!}
            demandas={filtrarPorArea(demandasCli, "urgencias")}
            categoria="Personalizado"
            emptyHint="Nenhuma urgência registrada para este cliente."
            demandaInicial={abaDemandaDeepLink === "urgencias" ? demandaDeepLink : null}
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

        {/* ============== REUNIÕES ============== */}
        <TabsContent value="reunioes" className="mt-4">
          <ReunioesTab clienteId={clienteId!} />
        </TabsContent>

        {/* ============== BRIEFING ============== */}
        <TabsContent value="briefing" className="mt-4">
          <BriefingTab
            clienteId={clienteId!}
            modoEdicaoExterno={editarBriefingTrigger}
            onModoEdicaoChange={setEditarBriefingTrigger}
          />
        </TabsContent>

        {/* ============== PLANEJAMENTO ============== */}
        <TabsContent value="planejamento" className="mt-4">
          <PlanejamentoTab
            clienteId={clienteId!}
            novoOpenExterno={novoPlanOpen}
            onNovoOpenChangeExterno={setNovoPlanOpen}
          />
        </TabsContent>

        {/* ============== ATIVIDADES ============== */}
        <TabsContent value="atividades" className="mt-4">
          <AtividadesTab clienteId={clienteId!} demandasCli={demandasCli} />
        </TabsContent>

        {/* ============== RELATÓRIOS ============== */}
        <TabsContent value="relatorios" className="mt-4">
          <RelatoriosTab cardsCli={cardsCli} demandasCli={demandasCli} />
        </TabsContent>
      </Tabs>

      {/* Modal "Nova tarefa" — cria rascunho e leva para a aba certa */}
      <NovaTarefaSeletor
        open={novaTarefaOpen}
        onOpenChange={setNovaTarefaOpen}
        clienteId={clienteId!}
        onCriado={(categoria) => handleTabChange(categoriaParaAba(categoria))}
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
  const [modo, setModo] = useState<"lista" | "grid">("lista");

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

  const itens: VisaoGeralItem[] = [
    { key: "posts", titulo: "Posts", icone: FileText, total: postsTotal, pendentes: postsPend, atrasadas: postsAtras, responsaveis: respsPosts, onVerDetalhes: () => onNavegar("posts") },
    { key: "videos", titulo: "Vídeos", icone: Video, total: videos.total, pendentes: videos.pendentes, atrasadas: videos.atrasadas, responsaveis: videos.resps, onVerDetalhes: () => onNavegar("videos") },
    { key: "trafego", titulo: "Tráfego Pago", icone: Megaphone, total: trafego.total, pendentes: trafego.pendentes, atrasadas: trafego.atrasadas, responsaveis: trafego.resps, onVerDetalhes: () => onNavegar("trafego") },
    { key: "lp", titulo: "LP / Site", icone: Globe, total: lp.total, pendentes: lp.pendentes, atrasadas: lp.atrasadas, responsaveis: lp.resps, onVerDetalhes: () => onNavegar("lp") },
    { key: "ia", titulo: "IA / Atendimento", icone: Bot, total: ia.total, pendentes: ia.pendentes, atrasadas: ia.atrasadas, responsaveis: ia.resps, onVerDetalhes: () => onNavegar("ia") },
    { key: "documentacao", titulo: "Acessos, Links e Materiais", icone: FolderOpen, total: docsCli.length, pendentes: 0, atrasadas: 0, responsaveis: [], onVerDetalhes: () => onNavegar("documentacao") },
    { key: "briefing", titulo: "Briefing", icone: ClipboardList, total: briefing.total, pendentes: briefing.pendentes, atrasadas: briefing.atrasadas, responsaveis: briefing.resps, onVerDetalhes: () => onNavegar("briefing") },
    { key: "planejamento", titulo: "Planejamento", icone: CalendarRange, total: planejamento.total, pendentes: planejamento.pendentes, atrasadas: planejamento.atrasadas, responsaveis: planejamento.resps, onVerDetalhes: () => onNavegar("planejamento") },
    { key: "urgencias", titulo: "Urgências / Outros", icone: AlertTriangle, total: urgencias.total, pendentes: urgencias.pendentes, atrasadas: urgencias.atrasadas, responsaveis: urgencias.resps, onVerDetalhes: () => onNavegar("urgencias") },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1">
        <Button
          variant={modo === "lista" ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setModo("lista")}
        >
          <List className="h-3.5 w-3.5" /> Lista
        </Button>
        <Button
          variant={modo === "grid" ? "default" : "outline"}
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setModo("grid")}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Grade
        </Button>
      </div>

      {modo === "lista" ? (
        <VisaoGeralLista itens={itens} />
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {itens.map((it) => (
            <VisaoGeralCard
              key={it.key}
              titulo={it.titulo}
              icone={it.icone}
              total={it.total}
              pendentes={it.pendentes}
              atrasadas={it.atrasadas}
              responsaveis={it.responsaveis}
              onVerDetalhes={it.onVerDetalhes}
            />
          ))}
        </section>
      )}
    </div>
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

// =====================================================
// Mini-modal "Nova tarefa" — escolhe categoria, cria rascunho e
// navega para a aba correspondente, abrindo o card detalhado.
// =====================================================
function NovaTarefaSeletor({
  open,
  onOpenChange,
  clienteId,
  onCriado,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
  onCriado: (categoria: DemandaCategoria) => void;
}) {
  const [categoria, setCategoria] = useState<DemandaCategoria>("Personalizado");
  const [criando, setCriando] = useState(false);
  const [, setSearchParams] = useSearchParams();

  const submit = async () => {
    if (!clienteId) return;
    setCriando(true);
    const novo = await useDemandasStore.getState().createRascunho({
      cliente_id: clienteId,
      categoria,
    });
    setCriando(false);
    if (novo) {
      onOpenChange(false);
      // Navega para a aba e dispara deep-link para abrir o card.
      onCriado(categoria);
      setTimeout(() => {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set("demanda", novo.id);
            return next;
          },
          { replace: true }
        );
      }, 50);
    } else {
      toast.error("Não foi possível criar a tarefa");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !criando && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>
            Escolha a categoria. Você poderá ajustar todos os detalhes
            (responsáveis, anexos, briefing, prazo, status) direto no card.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={(v) => setCategoria(v as DemandaCategoria)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATLABEL_ALL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={criando}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={criando}>
            {criando ? "Abrindo..." : "Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
