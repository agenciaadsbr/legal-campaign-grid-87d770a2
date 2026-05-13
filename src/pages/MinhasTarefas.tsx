import { useEffect, useMemo, useState } from "react";
import { useCRM } from "@/store/crm";
import { useDemandas, useDemandasBootstrap } from "@/store/demandas";
import { usePlanejamento, usePlanejamentoBootstrap } from "@/store/planejamento";
import { useDocumentacao, useDocumentacaoBootstrap } from "@/store/documentacao";
import { useAuth } from "@/hooks/useAuth";
import { useResponsavelAtual } from "@/hooks/useResponsavelAtual";
import { supabase } from "@/integrations/supabase/client";
import {
  buildUnifiedTasks, ordenarTarefas, parsePrazoLocal, type UnifiedTask,
} from "@/lib/minhasTarefas";
import { MinhasTarefasFiltros, type FiltrosState } from "@/components/tarefas/MinhasTarefasFiltros";
import { MinhasTarefasTabela } from "@/components/tarefas/MinhasTarefasTabela";
import { ConcluirTarefaDialog } from "@/components/tarefas/ConcluirTarefaDialog";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { AtribuirResponsaveisPopover } from "@/components/demandas/AtribuirResponsaveisPopover";
import { DefinirDatasPopover } from "@/components/demandas/DefinirDatasPopover";
import { AlterarStatusPopover } from "@/components/demandas/AlterarStatusPopover";
import { useDemandasStore } from "@/store/demandas";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, ListChecks, Lock, Users, Zap } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TarefasSugeridasTab } from "@/components/tarefas/TarefasSugeridasTab";

const FILTROS_INICIAIS: FiltrosState = {
  cliente: "all",
  areas: [],
  status: [],
  busca: "",
  periodo: { preset: "todos", inicio: null, fim: null },
};

type Visualizacao = "minhas" | "todos" | string; // string = responsavel_id

export default function MinhasTarefas() {
  useDemandasBootstrap();
  usePlanejamentoBootstrap();
  useDocumentacaoBootstrap();

  const { user, isAdmin } = useAuth();
  const { responsavel, responsavelId, loading: loadingResp } = useResponsavelAtual();

  const clientes = useCRM((s) => s.clientes);
  const cards = useCRM((s) => s.cards);
  const contratos = useCRM((s) => s.contratos);
  const responsaveis = useCRM((s) => s.responsaveis);
  const demandas = useDemandas((s) => s.demandas);
  const dependencies = useDemandas((s) => s.dependencies);
  const planejamento = usePlanejamento((s) => s.itens);
  const documentacao = useDocumentacao((s) => s.itens);

  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIAIS);
  const [taskAlvo, setTaskAlvo] = useState<UnifiedTask | null>(null);
  const [visualizacao, setVisualizacao] = useState<Visualizacao>("minhas");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Mapa responsavel_id -> auth.uid (para documentação no modo admin por usuário específico)
  const [respToAuth, setRespToAuth] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!isAdmin) return;
    let cancel = false;
    supabase
      .from("profiles")
      .select("id, responsavel_id")
      .not("responsavel_id", "is", null)
      .then(({ data }) => {
        if (cancel || !data) return;
        const map: Record<string, string> = {};
        for (const p of data as { id: string; responsavel_id: string | null }[]) {
          if (p.responsavel_id) map[p.responsavel_id] = p.id;
        }
        setRespToAuth(map);
      });
    return () => { cancel = true; };
  }, [isAdmin]);

  // Resolve escopo passado ao builder
  const { scopeResp, scopeAuth } = useMemo(() => {
    if (!isAdmin || visualizacao === "minhas") {
      return {
        scopeResp: undefined as string[] | "all" | undefined,
        scopeAuth: undefined as string[] | "all" | undefined,
      };
    }
    if (visualizacao === "todos") {
      return { scopeResp: "all" as const, scopeAuth: "all" as const };
    }
    // responsavel específico
    const authUid = respToAuth[visualizacao];
    return {
      scopeResp: [visualizacao] as string[],
      scopeAuth: authUid ? ([authUid] as string[]) : [],
    };
  }, [isAdmin, visualizacao, respToAuth]);

  const todasTarefas = useMemo(
    () =>
      buildUnifiedTasks({
        responsavelId,
        authUserId: user?.id ?? null,
        scopeResponsaveisIds: scopeResp,
        scopeAuthUserIds: scopeAuth,
        demandas,
        cards,
        planejamento,
        documentacao,
        clientes,
        contratos,
        dependencies,
      }),
    [responsavelId, user?.id, scopeResp, scopeAuth, demandas, cards, planejamento, documentacao, clientes, contratos, dependencies],
  );

  const tarefasFiltradas = useMemo(() => {
    const { cliente, areas, status, busca, periodo } = filtros;
    const buscaLower = busca.trim().toLowerCase();
    const ini = periodo.inicio;
    const fim = periodo.fim;
    const periodoAtivo = (ini !== null || fim !== null) && periodo.preset !== "todos";

    const filtradas = todasTarefas.filter((t) => {
      if (cliente !== "all" && t.cliente_id !== cliente) return false;
      if (areas.length > 0 && !areas.includes(t.area)) return false;
      if (status.length > 0 && !status.includes(t.status)) return false;
      if (buscaLower) {
        const hay = `${t.titulo} ${t.cliente_nome}`.toLowerCase();
        if (!hay.includes(buscaLower)) return false;
      }
      if (periodoAtivo) {
        const prazoDate = parsePrazoLocal(t.prazo);
        if (!prazoDate) return false;
        const pTime = prazoDate.getTime();
        let iniT: number | null = null;
        let fimT: number | null = null;
        if (ini) {
          const x = new Date(ini);
          x.setHours(0, 0, 0, 0);
          iniT = x.getTime();
        }
        if (fim) {
          const x = new Date(fim);
          x.setHours(23, 59, 59, 999);
          fimT = x.getTime();
        }
        // Filtro estrito por dia
        if (iniT !== null && pTime < iniT) return false;
        if (fimT !== null && pTime > fimT) return false;
      }
      return true;
    });
    return ordenarTarefas(filtradas);
  }, [todasTarefas, filtros]);

  const kpis = useMemo(() => {
    const total = tarefasFiltradas.length;
    const pendentes = tarefasFiltradas.filter((t) => t.status !== "concluido").length;
    const atrasadas = tarefasFiltradas.filter((t) => t.status === "atrasado").length;
    const urgentes = tarefasFiltradas.filter((t) => t.urgente && t.status !== "concluido").length;
    const aguardando = tarefasFiltradas.filter((t) => t.aguardando_liberacao && t.status !== "concluido").length;
    return { total, pendentes, atrasadas, urgentes, aguardando };
  }, [tarefasFiltradas]);

  const tarefasAguardando = useMemo(
    () => tarefasFiltradas.filter((t) => t.aguardando_liberacao && t.status !== "concluido"),
    [tarefasFiltradas],
  );

  const areasDisponiveis = useMemo(
    () => Array.from(new Set(todasTarefas.map((t) => t.area))),
    [todasTarefas],
  );

  const responsaveisOrdenados = useMemo(
    () => [...responsaveis].sort((a, b) => a.nome.localeCompare(b.nome)),
    [responsaveis],
  );

  const responsavelSelecionado = useMemo(() => {
    if (visualizacao === "minhas" || visualizacao === "todos") return null;
    return responsaveis.find((r) => r.id === visualizacao) ?? null;
  }, [visualizacao, responsaveis]);

  const subtitulo = (() => {
    if (!isAdmin || visualizacao === "minhas") {
      return responsavel
        ? <>Painel individual de <strong>{responsavel.nome}</strong> — apenas tarefas atribuídas a você</>
        : "Suas tarefas em todos os clientes";
    }
    if (visualizacao === "todos") {
      return <>Visão administrativa — tarefas de <strong>todos os usuários</strong></>;
    }
    return <>Visualizando tarefas de <strong>{responsavelSelecionado?.nome ?? "—"}</strong></>;
  })();

  const mostrarColunaResponsavel = isAdmin && visualizacao !== "minhas";

  return (
    <div className="px-5 py-4 space-y-3 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold leading-tight">Central de Tarefas</h1>
          <p className="text-xs text-muted-foreground">{subtitulo}</p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={visualizacao} onValueChange={(v) => setVisualizacao(v)}>
              <SelectTrigger className="h-8 w-[240px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minhas">Minhas tarefas</SelectItem>
                <SelectItem value="todos">Todos os usuários</SelectItem>
                {responsaveisOrdenados.length > 0 && (
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Por responsável
                  </div>
                )}
                {responsaveisOrdenados.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </header>

      <Tabs defaultValue="tarefas">
        <TabsList className="h-8">
          <TabsTrigger value="tarefas" className="text-xs h-7">Tarefas</TabsTrigger>
          <TabsTrigger value="sugeridas" className="text-xs h-7">Tarefas Sugeridas</TabsTrigger>
        </TabsList>

        <TabsContent value="sugeridas" className="mt-3">
          <TarefasSugeridasTab />
        </TabsContent>

        <TabsContent value="tarefas" className="mt-3 space-y-3">

      {loadingResp && !responsavelId && (!isAdmin || visualizacao === "minhas") && (
        <div className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">
          Carregando suas tarefas…
        </div>
      )}

      {!loadingResp && !responsavelId && (!isAdmin || visualizacao === "minhas") && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
          Seu usuário ainda não está vinculado a um responsável da equipe. Peça a um administrador
          para fazer o vínculo em <strong>Configurações → Equipe & Acessos</strong>.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <KpiCard compact icon={ListChecks} label="Total" value={kpis.total} tone="primary" />
        <KpiCard compact icon={CheckCircle2} label="Pendentes" value={kpis.pendentes} tone="info" />
        <KpiCard compact icon={AlertCircle} label="Atrasadas" value={kpis.atrasadas}
          tone={kpis.atrasadas > 0 ? "destructive" : "default"} />
        <KpiCard compact icon={Zap} label="Urgentes" value={kpis.urgentes}
          tone={kpis.urgentes > 0 ? "destructive" : "default"} />
        <KpiCard compact icon={Lock} label="Aguardando" value={kpis.aguardando}
          tone={kpis.aguardando > 0 ? "warning" : "default"} />
      </div>

      <MinhasTarefasFiltros
        value={filtros}
        onChange={setFiltros}
        clientes={clientes}
        areasDisponiveis={areasDisponiveis}
      />

      <MinhasTarefasTabela
        tasks={tarefasFiltradas}
        onConcluir={(t) => setTaskAlvo(t)}
        mostrarResponsavel={mostrarColunaResponsavel}
      />

      {tarefasAguardando.length > 0 && (
        <section className="space-y-2 pt-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold">Aguardando liberação</h2>
            <span className="text-xs text-muted-foreground">
              ({tarefasAguardando.length}) — bloqueadas até a etapa anterior ser concluída
            </span>
          </div>
          <MinhasTarefasTabela
            tasks={tarefasAguardando}
            onConcluir={(t) => setTaskAlvo(t)}
            mostrarResponsavel={mostrarColunaResponsavel}
          />
        </section>
      )}

      <ConcluirTarefaDialog
        task={taskAlvo}
        open={!!taskAlvo}
        onOpenChange={(o) => !o && setTaskAlvo(null)}
      />
        </TabsContent>
      </Tabs>
    </div>
  );
}
