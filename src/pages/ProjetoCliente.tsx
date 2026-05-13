import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCRM } from "@/store/crm";
import { useDemandas, useDemandasBootstrap, Demanda, getResponsaveisIds, useDemandasStore } from "@/store/demandas";
import { useAtividades, useAtividadesBootstrap, type Atividade } from "@/store/atividades";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextView } from "@/components/RichTextView";
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
  Rocket,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { OperacionalTab } from "@/components/projeto/OperacionalTab";
import { ReunioesTab } from "@/components/projeto/ReunioesTab";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
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
import { ProjectNotesModal } from "@/components/projeto/ProjectNotesModal";
import { ProjectNotesButton } from "@/components/projeto/ProjectNotesButton";
import { ProjectNotesAlert } from "@/components/projeto/ProjectNotesAlert";
import { useProjectNotes } from "@/store/projectNotes";

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
    case "operacional":
      return demandas.filter((d) => d.categoria === "Operacional");
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
    case "Operacional": return "operacional";
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
            <TabsTrigger value="operacional" className="gap-1"><Rocket className="h-3.5 w-3.5" /> Operacional</TabsTrigger>
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

        {/* ============== OPERACIONAL ============== */}
        <TabsContent value="operacional" className="mt-4">
          <OperacionalTab
            clienteId={clienteId!}
            demandas={filtrarPorArea(demandasCli, "operacional")}
            demandaInicial={abaDemandaDeepLink === "operacional" ? demandaDeepLink : null}
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
      <DadosContratuais cliente={cliente} cardsCli={cardsCli} />
    </div>
  );
}

function StatItem({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</span>
      <span className="text-sm font-medium">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function DadosContratuais({ cliente, cardsCli }: { cliente: any; cardsCli: any[] }) {
  const { updateCliente } = useCRM();
  const [editing, setEditing] = useState(false);
  
  const postsCriados = cardsCli.length;
  const postsPublicados = cardsCli.filter(c => c.status_card === "Postado").length;
  const postsPendentes = postsCriados - postsPublicados;

  const [formData, setFormData] = useState({
    plano: cliente.plano || "",
    data_inicio_contrato: cliente.data_inicio_contrato || "",
    data_fim_contrato: cliente.data_fim_contrato || "",
    observacoes_renovacao: (cliente as any).observacoes_renovacao || "",
    status_renovacao: (cliente as any).status_renovacao || "Pendente"
  });

  const handleSave = async () => {
    await updateCliente(cliente.id, {
      ...formData,
      // Mapeamento se necessário
    } as any);
    setEditing(false);
    toast.success("Dados contratuais atualizados");
  };

  return (
    <Card className="bg-muted/30 border-none shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" /> Dados do Contrato
          </h3>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => editing ? handleSave() : setEditing(true)}>
            {editing ? "Salvar" : "Editar"}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="space-y-4">
            {editing ? (
              <div className="space-y-1">
                <Label className="text-[10px]">Plano</Label>
                <Input value={formData.plano} onChange={e => setFormData(prev => ({ ...prev, plano: e.target.value }))} className="h-7 text-xs" />
              </div>
            ) : (
              <StatItem label="Plano" value={cliente.plano || "Não definido"} />
            )}
            <StatItem label="Início" value={cliente.data_inicio_contrato ? format(new Date(cliente.data_inicio_contrato), "dd/MM/yyyy") : "---"} />
          </div>

          <div className="space-y-4">
            <StatItem label="Término" value={cliente.data_fim_contrato ? format(new Date(cliente.data_fim_contrato), "dd/MM/yyyy") : "---"} />
            <StatItem label="Renovação" value={(cliente as any).status_renovacao || "Pendente"} />
          </div>

          <div className="space-y-4">
            <StatItem label="Posts Criados" value={postsCriados} />
            <StatItem label="Publicados" value={postsPublicados} />
          </div>

          <div className="space-y-4">
            <StatItem label="Pendentes" value={postsPendentes} />
            <StatItem label="Contratados" value={cliente.plano === 'Mensal' ? 4 : cliente.plano === 'Trimestral' ? 12 : cliente.plano === 'Semestral' ? 24 : "---"} />
          </div>

          <div className="md:col-span-1">
            <StatItem label="Observações" value={(cliente as any).observacoes_renovacao || "Nenhuma"} />
          </div>
        </div>
      </CardContent>
    </Card>
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
  if (acao === "iniciado" || acao === "Iniciado") return <Play className={cn(cls, "text-amber-500")} />;
  if (acao === "concluido" || acao === "Concluído") return <CheckCircle2 className={cn(cls, "text-emerald-500")} />;
  if (acao === "status") return <ArrowRight className={cn(cls, "text-muted-foreground")} />;
  if (acao === "responsavel") return <Plus className={cn(cls, "text-orange-500")} />;
  if (acao === "prazo") return <CalendarRange className={cn(cls, "text-purple-500")} />;
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
function badgeAreaPorCategoria(cat: string): { label: string; cls: string } {
  switch (cat) {
    case "EditorVideo": return { label: "VÍDEO", cls: "border-purple-500/40 text-purple-500" };
    case "TrafegoPago": return { label: "TRÁFEGO", cls: "border-emerald-500/40 text-emerald-500" };
    case "LandingPage": return { label: "LP / SITE", cls: "border-blue-500/40 text-blue-500" };
    case "IAAtendimento": return { label: "IA / ATEND.", cls: "border-cyan-500/40 text-cyan-500" };
    case "Briefing": return { label: "BRIEFING", cls: "border-amber-500/40 text-amber-500" };
    case "Planejamento": return { label: "PLANEJ.", cls: "border-indigo-500/40 text-indigo-500" };
    case "Operacional": return { label: "OPERACIONAL", cls: "border-orange-500/40 text-orange-500" };
    case "Direto": return { label: "CLIENTE", cls: "border-green-500/40 text-green-500" };
    case "Posts": return { label: "POST", cls: "border-primary/40 text-primary" };
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
  const [searchParams] = useSearchParams();
  const itens = useAtividades((s) => s.porCliente[clienteId]);
  const loading = useAtividades((s) => s.loading[clienteId]);
  const hasMore = useAtividades((s) => s.hasMore[clienteId]);
  const load = useAtividades((s) => s.loadByCliente);
  const { responsaveis } = useCRM();

  const [filtroTipo, setFiltroTipo] = useState<string>(() => searchParams.get("tipo") ?? "todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("30");

  useEffect(() => {
    const tipo = searchParams.get("tipo");
    if (tipo) {
      setFiltroTipo(tipo);
    }
  }, [searchParams]);

  const lista = useMemo(() => {
    let filtrados = itens ?? [];
    
    if (filtroTipo !== "todos") {
      if (filtroTipo === "comentario") filtrados = filtrados.filter(a => a.acao === "comentario");
      else if (filtroTipo === "post") filtrados = filtrados.filter(a => a.tipo === "post");
      else if (filtroTipo === "demanda") filtrados = filtrados.filter(a => a.tipo === "demanda");
      else if (filtroTipo === "status") filtrados = filtrados.filter(a => a.acao === "status");
      else if (filtroTipo === "responsavel") filtrados = filtrados.filter(a => a.acao === "responsavel");
      else if (filtroTipo === "prazo") filtrados = filtrados.filter(a => a.acao === "prazo");
      else if (filtroTipo === "Gerencial") filtrados = filtrados.filter(a => (a.tipo as string) === "Gerencial" && a.acao !== "comentario");
    }

    const agora = new Date();
    if (filtroPeriodo !== "tudo") {
      const dias = parseInt(filtroPeriodo);
      const limite = new Date();
      if (filtroPeriodo === "0") {
        limite.setHours(0, 0, 0, 0);
      } else {
        limite.setDate(agora.getDate() - dias);
      }
      filtrados = filtrados.filter(a => new Date(a.created_at) >= limite);
    }

    return filtrados;
  }, [itens, filtroTipo, filtroPeriodo]);

  const grupos = useMemo(() => {
    const map = new Map<string, Atividade[]>();
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
    <div className="space-y-4">
      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Histórico de Atividades</h3>
          </div>
          
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Eventos</SelectItem>
              <SelectItem value="comentario">Comentários</SelectItem>
              <SelectItem value="post">Posts</SelectItem>
              <SelectItem value="demanda">Tarefas</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="responsavel">Responsáveis</SelectItem>
              <SelectItem value="prazo">Prazos</SelectItem>
              <SelectItem value="Gerencial">Sistema</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Hoje</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="tudo">Tudo</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            {lista.length} registros encontrados
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-6">
          {grupos.length === 0 && !loading && (
            <div className="text-center text-sm text-muted-foreground py-12 flex flex-col items-center gap-2">
              <Activity className="h-8 w-8 opacity-20" />
              <span>Nenhuma atividade encontrada com os filtros atuais.</span>
            </div>
          )}
          
          {grupos.map(([dia, listaDia]) => (
            <div key={dia} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap bg-background px-2">
                  {rotuloDia(dia)}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-4">
                {listaDia.map((a) => {
                  const autor = responsaveis.find((r) => r.id === a.usuario_id);
                  const badge = badgeAreaPorCategoria(a.area || (a.tipo === "post" ? "Posts" : "Urgência"));
                  
                  return (
                    <div key={a.id} className="flex gap-3 group">
                      <div className="shrink-0 mt-1">
                        <AcaoIcone tipo={a.tipo} acao={a.acao} />
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold uppercase tracking-tight">
                            {autor?.nome ?? "Sistema"}
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            • {format(new Date(a.created_at), "HH:mm", { locale: ptBR })}
                          </span>
                          <Badge variant="outline" className={cn("text-[9px] h-4 px-1 font-bold", badge.cls)}>
                            {badge.label}
                          </Badge>
                        </div>

                        {a.titulo_tarefa && (
                          <div className="text-[11px] font-semibold text-primary/80 flex items-center gap-1">
                            <span className="text-muted-foreground/60 font-normal">Relacionado:</span>
                            {a.titulo_tarefa}
                          </div>
                        )}

                        <div className={cn(
                          "text-sm leading-relaxed",
                          a.acao === "comentario" ? "bg-muted/30 p-2.5 rounded-lg border-l-2 border-primary/20 italic" : "text-foreground/80"
                        )}>
                          {a.acao === "comentario" ? (
                            <RichTextView content={a.descricao || ""} className="text-xs" />
                          ) : (
                            <span>{a.descricao}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-2"
                disabled={loading}
                onClick={() => load(clienteId)}
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Carregar mais atividades
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
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
