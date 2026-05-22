import { useMemo, useState } from "react";
import { useReunioes, useReunioesBootstrap, type Reuniao, type ReuniaoPostStatus, type TemperaturaCliente, TEMPERATURA_LABEL } from "@/store/reunioes";
import { useCRM } from "@/store/crm";
import { useMeetingTasks, useMeetingTasksBootstrap } from "@/store/meetingTasks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Calendar, ExternalLink, MoreHorizontal, Search, FileText, Mic, Users,
  CheckCircle2, XCircle, Eye, AlertTriangle, Clock,
} from "lucide-react";
import { ReuniaoDialog } from "@/components/projeto/ReuniaoDialog";
import { DelegarTarefasDialog } from "@/components/reunioes/DelegarTarefasDialog";
import { cn } from "@/lib/utils";
import { FiltroPeriodoButton, resolveIntervaloPeriodo, type FiltroPeriodo } from "@/components/shared/FiltroPeriodoButton";

const STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  nao_realizada: "Não realizada",
};
const POST_LABEL: Record<string, string> = {
  nao_analisada: "Não analisada",
  em_analise: "Em análise",
  delegada: "Delegada",
  sem_acao: "Sem ação",
};

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const styles: Record<string, string> = {
    agendada: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
    realizada: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    nao_realizada: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={cn("text-[10px]", styles[status])}>{STATUS_LABEL[status] ?? status}</Badge>;
}

function PostStatusBadge({ post }: { post?: string | null }) {
  if (!post) return <span className="text-[10px] text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    nao_analisada: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    em_analise: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    delegada: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
    sem_acao: "bg-muted text-muted-foreground border-border",
  };
  return <Badge variant="outline" className={cn("text-[10px]", styles[post])}>{POST_LABEL[post] ?? post}</Badge>;
}

export default function CentralReunioes() {
  useReunioesBootstrap();
  useMeetingTasksBootstrap();
  const reunioes = useReunioes((s) => s.reunioes);
  const loading = useReunioes((s) => s.loading);
  const loaded = useReunioes((s) => s.loaded);
  const marcarRealizada = useReunioes((s) => s.marcarRealizada);
  const marcarNaoRealizada = useReunioes((s) => s.marcarNaoRealizada);
  const iniciarAnalise = useReunioes((s) => s.iniciarAnalise);
  const marcarSemAcao = useReunioes((s) => s.marcarSemAcao);

  const clientes = useCRM((s) => s.clientes);
  const responsaveis = useCRM((s) => s.responsaveis);
  const meetingTasks = useMeetingTasks((s) => s.tasks);

  const [busca, setBusca] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState<string>("__all__");
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [statusFiltro, setStatusFiltro] = useState<string>("__all__");
  const [postFiltro, setPostFiltro] = useState<string>("__all__");
  const [respFiltro, setRespFiltro] = useState<string>("__all__");
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>({ tipo: "todos" });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const [editOpen, setEditOpen] = useState(false);
  const [editReuniao, setEditReuniao] = useState<Reuniao | null>(null);

  const [delegarOpen, setDelegarOpen] = useState(false);
  const [delegarReuniao, setDelegarReuniao] = useState<Reuniao | null>(null);

  const [naoRealizadaOpen, setNaoRealizadaOpen] = useState(false);
  const [naoRealizadaReuniao, setNaoRealizadaReuniao] = useState<Reuniao | null>(null);
  const [naoRealizadaMotivo, setNaoRealizadaMotivo] = useState("");

  const [semAcaoOpen, setSemAcaoOpen] = useState(false);
  const [semAcaoReuniao, setSemAcaoReuniao] = useState<Reuniao | null>(null);

  const counts = useMemo(() => {
    const c = { pendentes: 0, analise: 0, delegada: 0, semAcao: 0, agendada: 0, naoRealizada: 0 };
    for (const r of reunioes) {
      if (r.status === "realizada" && r.post_status === "nao_analisada") c.pendentes++;
      if (r.post_status === "em_analise") c.analise++;
      if (r.post_status === "delegada") c.delegada++;
      if (r.post_status === "sem_acao") c.semAcao++;
      if (r.status === "agendada") c.agendada++;
      if (r.status === "nao_realizada") c.naoRealizada++;
    }
    return c;
  }, [reunioes]);

  const filtradas = useMemo(() => {
    const intervalo = resolveIntervaloPeriodo(filtroPeriodo);
    const q = busca.trim().toLowerCase();
    return reunioes.filter((r) => {
      if (clienteFiltro !== "__all__" && r.cliente_id !== clienteFiltro) return false;
      if (tipoFiltro && (r.tipo ?? "").toLowerCase() !== tipoFiltro.toLowerCase()) return false;
      if (statusFiltro !== "__all__" && r.status !== statusFiltro) return false;
      if (postFiltro !== "__all__") {
        if (postFiltro === "__null__" && r.post_status) return false;
        if (postFiltro !== "__null__" && r.post_status !== postFiltro) return false;
      }
      if (respFiltro !== "__all__" && r.responsavel_id !== respFiltro) return false;
      if (intervalo) {
        const d = new Date(r.data);
        if (d < intervalo.inicio || d > intervalo.fim) return false;
      }
      if (q) {
        const cli = clientes.find((c) => c.id === r.cliente_id)?.nome_cliente ?? "";
        const resp = responsaveis.find((p) => p.id === r.responsavel_id)?.nome ?? "";
        const blob = `${cli} ${r.titulo} ${r.tipo ?? ""} ${resp} ${r.resumo_cliente ?? ""} ${r.resumo_tarefas ?? ""} ${r.observacoes ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [reunioes, busca, clienteFiltro, tipoFiltro, statusFiltro, postFiltro, respFiltro, filtroPeriodo, clientes, responsaveis]);

  const pagina = filtradas.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));

  const tipos = useMemo(() => Array.from(new Set(reunioes.map((r) => r.tipo).filter(Boolean))) as string[], [reunioes]);

  const aplicarFiltroWidget = (key: "pendentes" | "analise" | "delegada" | "semAcao" | "agendada" | "naoRealizada") => {
    setPage(0);
    switch (key) {
      case "pendentes":
        setStatusFiltro("realizada"); setPostFiltro("nao_analisada"); break;
      case "analise":
        setStatusFiltro("__all__"); setPostFiltro("em_analise"); break;
      case "delegada":
        setStatusFiltro("__all__"); setPostFiltro("delegada"); break;
      case "semAcao":
        setStatusFiltro("__all__"); setPostFiltro("sem_acao"); break;
      case "agendada":
        setStatusFiltro("agendada"); setPostFiltro("__all__"); break;
      case "naoRealizada":
        setStatusFiltro("nao_realizada"); setPostFiltro("__all__"); break;
    }
  };

  const isCritica = (r: Reuniao) => {
    if (r.status !== "realizada" || r.post_status !== "nao_analisada") return false;
    const ref = new Date(r.updated_at || r.data).getTime();
    return Date.now() - ref > 24 * 60 * 60 * 1000;
  };
  const isAlerta = (r: Reuniao) => {
    if (r.post_status !== "em_analise") return false;
    const ref = new Date(r.analise_iniciada_em || r.updated_at).getTime();
    if (Date.now() - ref < 24 * 60 * 60 * 1000) return false;
    const temTask = meetingTasks.some((t) => t.meeting_id === r.id);
    return !temTask;
  };

  const handleAbrir = (r: Reuniao) => { setEditReuniao(r); setEditOpen(true); };
  const handleNova = () => { setEditReuniao(null); setEditOpen(true); };

  const widgets = [
    { key: "pendentes", label: "Pendentes", n: counts.pendentes, tone: "amber" },
    { key: "analise", label: "Em análise", n: counts.analise, tone: "sky" },
    { key: "delegada", label: "Delegadas", n: counts.delegada, tone: "violet" },
    { key: "semAcao", label: "Sem ação", n: counts.semAcao, tone: "muted" },
    { key: "agendada", label: "Agendadas", n: counts.agendada, tone: "blue" },
    { key: "naoRealizada", label: "Não realizadas", n: counts.naoRealizada, tone: "muted" },
  ] as const;

  const toneClasses: Record<string, string> = {
    amber: "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    sky: "border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10 text-sky-700 dark:text-sky-300",
    violet: "border-violet-500/40 bg-violet-500/5 hover:bg-violet-500/10 text-violet-700 dark:text-violet-300",
    blue: "border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 text-blue-700 dark:text-blue-300",
    muted: "border-border bg-card hover:bg-accent/40 text-muted-foreground",
  };

  return (
    <div className="px-4 py-3 space-y-2 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="leading-tight">
          <h1 className="text-lg font-bold leading-tight">Central de Reuniões</h1>
          <p className="text-[11px] text-muted-foreground">
            {reunioes.length} reuniões{counts.pendentes > 0 ? ` · ${counts.pendentes} pendentes de análise` : ""}
          </p>
        </div>
        <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={handleNova}>
          <Plus className="h-3.5 w-3.5" /> Nova Reunião
        </Button>
      </div>

      {/* Widgets compactos */}
      <div className="flex flex-wrap gap-1.5">
        {widgets.map((w) => (
          <button
            key={w.key}
            onClick={() => aplicarFiltroWidget(w.key as any)}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-md border transition-colors",
              toneClasses[w.tone],
            )}
          >
            <span className="text-[10px] uppercase font-semibold tracking-wider">{w.label}</span>
            <span className="text-xs font-bold text-foreground">{w.n}</span>
          </button>
        ))}
      </div>

      {/* Filtros inline */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-2 text-muted-foreground" />
          <Input className="pl-7 h-7 text-xs w-[220px]" placeholder="Buscar..." value={busca} onChange={(e) => { setBusca(e.target.value); setPage(0); }} />
        </div>
        <Select value={clienteFiltro} onValueChange={(v) => { setClienteFiltro(v); setPage(0); }}>
          <SelectTrigger className="h-7 text-xs w-[150px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os clientes</SelectItem>
            {clientes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome_cliente}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={tipoFiltro || "__all__"} onValueChange={(v) => { setTipoFiltro(v === "__all__" ? "" : v); setPage(0); }}>
          <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os tipos</SelectItem>
            {tipos.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v); setPage(0); }}>
          <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos status</SelectItem>
            <SelectItem value="agendada">Agendada</SelectItem>
            <SelectItem value="realizada">Realizada</SelectItem>
            <SelectItem value="nao_realizada">Não realizada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={postFiltro} onValueChange={(v) => { setPostFiltro(v); setPage(0); }}>
          <SelectTrigger className="h-7 text-xs w-[140px]"><SelectValue placeholder="Pós-reunião" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos pós</SelectItem>
            <SelectItem value="__null__">Sem pós-status</SelectItem>
            <SelectItem value="nao_analisada">Não analisada</SelectItem>
            <SelectItem value="em_analise">Em análise</SelectItem>
            <SelectItem value="delegada">Delegada</SelectItem>
            <SelectItem value="sem_acao">Sem ação</SelectItem>
          </SelectContent>
        </Select>
        <Select value={respFiltro} onValueChange={(v) => { setRespFiltro(v); setPage(0); }}>
          <SelectTrigger className="h-7 text-xs w-[150px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos responsáveis</SelectItem>
            {responsaveis.map((r) => (<SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>))}
          </SelectContent>
        </Select>
        <FiltroPeriodoButton
          value={filtroPeriodo}
          onChange={(v) => { setFiltroPeriodo(v); setPage(0); }}
          size="xs"
        />
      </div>



      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading && !loaded ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : pagina.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma reunião encontrada com os filtros aplicados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-2 py-1 font-semibold">Cliente</th>
                    <th className="text-left px-2 py-1 font-semibold">Tipo</th>
                    <th className="text-left px-2 py-1 font-semibold">Data</th>
                    <th className="text-left px-2 py-1 font-semibold">Status</th>
                    <th className="text-left px-2 py-1 font-semibold">Pós-reunião</th>
                    <th className="text-left px-2 py-1 font-semibold">Responsável</th>
                    <th className="text-left px-2 py-1 font-semibold">Gravação</th>
                    <th className="text-left px-2 py-1 font-semibold">Resumo</th>
                    <th className="text-right px-2 py-1 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagina.map((r) => {
                    const cli = clientes.find((c) => c.id === r.cliente_id);
                    const resp = responsaveis.find((p) => p.id === r.responsavel_id);
                    const temResumo = !!(r.resumo_cliente || r.resumo_tarefas);
                    const critica = isCritica(r);
                    const alerta = isAlerta(r);
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                        <td className="px-2 py-1 leading-tight">
                          <button onClick={() => handleAbrir(r)} className="text-left hover:underline">
                            <div className="font-medium text-xs leading-tight">{cli?.nome_cliente ?? "—"}</div>
                            <div className="text-[10px] text-muted-foreground line-clamp-1 leading-tight">{r.titulo}</div>
                          </button>
                        </td>
                        <td className="px-2 py-1 text-xs">{r.tipo ?? "—"}</td>
                        <td className="px-2 py-1 text-xs whitespace-nowrap">
                          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(r.data).toLocaleString("pt-BR")}</span>
                        </td>
                        <td className="px-2 py-1"><StatusBadge status={r.status} /></td>
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-1">
                            <PostStatusBadge post={r.post_status} />
                            {critica && <AlertTriangle className="h-3.5 w-3.5 text-destructive" aria-label="Pendência crítica" />}
                            {alerta && <Clock className="h-3.5 w-3.5 text-amber-500" aria-label="Em análise há mais de 24h sem tarefa" />}
                          </div>
                        </td>
                        <td className="px-2 py-1 text-xs">{resp?.nome ?? "—"}</td>
                        <td className="px-2 py-1">
                          {r.link_tldv ? (
                            <a href={r.link_tldv} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5 text-xs"><ExternalLink className="h-3 w-3" /> TLDV</a>
                          ) : <span className="text-[10px] text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-1">
                          {temResumo ? <FileText className="h-3.5 w-3.5 text-emerald-600" /> : <span className="text-[10px] text-muted-foreground">—</span>}
                        </td>
                        <td className="px-2 py-1 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onClick={() => handleAbrir(r)}><Eye className="h-4 w-4 mr-2" /> Abrir / Editar</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {r.status !== "realizada" && (
                                <DropdownMenuItem onClick={() => marcarRealizada(r.id)}>
                                  <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" /> Marcar como realizada
                                </DropdownMenuItem>
                              )}
                              {r.status !== "nao_realizada" && (
                                <DropdownMenuItem onClick={() => { setNaoRealizadaReuniao(r); setNaoRealizadaMotivo(""); setNaoRealizadaOpen(true); }}>
                                  <XCircle className="h-4 w-4 mr-2" /> Marcar como não realizada
                                </DropdownMenuItem>
                              )}
                              {r.status === "realizada" && r.post_status !== "em_analise" && r.post_status !== "delegada" && (
                                <DropdownMenuItem onClick={() => iniciarAnalise(r.id)}>
                                  <Mic className="h-4 w-4 mr-2" /> Marcar Em análise
                                </DropdownMenuItem>
                              )}
                              {r.status === "realizada" && (
                                <DropdownMenuItem onClick={() => { setDelegarReuniao(r); setDelegarOpen(true); }}>
                                  <Users className="h-4 w-4 mr-2" /> Delegar tarefas
                                </DropdownMenuItem>
                              )}
                              {r.status === "realizada" && r.post_status !== "sem_acao" && (
                                <DropdownMenuItem onClick={() => { setSemAcaoReuniao(r); setSemAcaoOpen(true); }}>
                                  <FileText className="h-4 w-4 mr-2" /> Sem ação necessária
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtradas.length > PAGE_SIZE && (
            <div className="flex items-center justify-between p-3 border-t border-border text-xs">
              <span className="text-muted-foreground">
                Página {page + 1} de {totalPaginas} · {filtradas.length} reuniões
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={page + 1 >= totalPaginas} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <ReuniaoDialog open={editOpen} onOpenChange={setEditOpen} reuniao={editReuniao} />

      {delegarReuniao && (
        <DelegarTarefasDialog
          open={delegarOpen}
          onOpenChange={(o) => { setDelegarOpen(o); if (!o) setDelegarReuniao(null); }}
          meetingId={delegarReuniao.id}
          clientId={delegarReuniao.cliente_id}
          projectId={delegarReuniao.project_id ?? null}
        />
      )}

      <AlertDialog open={naoRealizadaOpen} onOpenChange={setNaoRealizadaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como não realizada</AlertDialogTitle>
            <AlertDialogDescription>
              Adicione um motivo opcional (cliente não compareceu, cancelada, remarcada, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Motivo (opcional)</Label>
            <Textarea rows={3} value={naoRealizadaMotivo} onChange={(e) => setNaoRealizadaMotivo(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (naoRealizadaReuniao) await marcarNaoRealizada(naoRealizadaReuniao.id, naoRealizadaMotivo || undefined);
              setNaoRealizadaOpen(false); setNaoRealizadaReuniao(null);
            }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={semAcaoOpen} onOpenChange={setSemAcaoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como sem ação necessária</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que esta reunião não precisa de nenhuma ação? Essa marcação só deve ser usada quando realmente não houver pendências.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (semAcaoReuniao) await marcarSemAcao(semAcaoReuniao.id);
              setSemAcaoOpen(false); setSemAcaoReuniao(null);
            }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
