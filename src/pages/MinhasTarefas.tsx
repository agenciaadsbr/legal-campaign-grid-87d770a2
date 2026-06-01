import { useEffect, useMemo, useState } from "react";
import { useCRM } from "@/store/crm";
import { useDemandas, useDemandasBootstrap, getResponsaveisIds } from "@/store/demandas";
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
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, ListChecks, Lock, Users, Zap } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TarefasSugeridasTab } from "@/components/tarefas/TarefasSugeridasTab";
import { MeetingDelegationTab } from "@/components/tarefas/MeetingDelegationTab";
import { lazy, Suspense } from "react";
const CadenciasOperacionaisTab = lazy(() =>
  import("@/components/tarefas/CadenciasOperacionaisTab").then((m) => ({ default: m.CadenciasOperacionaisTab })),
);

const FILTROS_INICIAIS: FiltrosState = {
  cliente: "all",
  areas: [],
  status: [],
  busca: "",
  periodo: { preset: "todos", inicio: null, fim: null },
  contexto: "todos",
  estrategia: "todas",
};

type Visualizacao = "minhas" | "todos" | string; // string = responsavel_id

export default function MinhasTarefas() {
  useDemandasBootstrap();
  usePlanejamentoBootstrap();
  useDocumentacaoBootstrap();

  const { user, isAdmin } = useAuth();
  const { responsavel, responsavelId, loading: loadingResp } = useResponsavelAtual();

  const { 
    clientes, 
    cards, 
    contratos, 
    responsaveis, 
    updateCard, 
    moveCard, 
    statusPostOptions 
  } = useCRM();
  
  const { 
    demandas, 
    dependencies, 
    updateDemanda, 
    moveStatus: moveDemandaStatus 
  } = useDemandasStore();
  
  const { itens: planejamento, update: updatePlan } = usePlanejamento();
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
    const { cliente, areas, status, busca, periodo, contexto } = filtros;
    const buscaLower = busca.trim().toLowerCase();
    const ini = periodo.inicio;
    const fim = periodo.fim;
    const periodoAtivo = (ini !== null || fim !== null) && periodo.preset !== "todos";

    const filtradas = todasTarefas.filter((t) => {
      if (cliente !== "all" && t.cliente_id !== cliente) return false;
      if (areas.length > 0 && !areas.includes(t.area)) return false;
      if (status.length > 0 && !status.includes(t.status)) return false;
      // Filtro de contexto: aplica apenas a posts; demais fontes passam livres.
      if (contexto !== "todos" && t.fonte === "post" && t.post_ciclo !== contexto) return false;
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

  const handleApplyResponsaveis = async (novosIds: string[], modo: "substituir" | "adicionar") => {
    const selectedTasks = todasTarefas.filter(t => selectedTaskIds.includes(t.id));
    let count = 0;
    
    await Promise.all(selectedTasks.map(async (t) => {
      if (t.fonte === 'demanda') {
        const atual = getResponsaveisIds(demandas.find(d => d.id === t.origem_id)!);
        const finalIds = modo === 'substituir' ? novosIds : Array.from(new Set([...atual, ...novosIds]));
        await updateDemanda(t.origem_id, { responsaveis_ids: finalIds });
        count++;
      } else if (t.fonte === 'post') {
        const [_, cid, rid, ctid] = t.id.split(':');
        // Filtra os cards que pertencem a este grupo específico na Central de Tarefas
        const cardsNoGrupo = cards.filter(c => c.cliente_id === cid && c.responsaveis.includes(rid));
        // Para posts, a atualização é em cada card do grupo
        await Promise.all(cardsNoGrupo.map(c => {
          const atual = c.responsaveis ?? [];
          const finalIds = modo === 'substituir' ? novosIds : Array.from(new Set([...atual, ...novosIds]));
          return updateCard(c.id, { responsaveis: finalIds });
        }));
        count += cardsNoGrupo.length;
      } else if (t.fonte === 'planejamento') {
        await updatePlan(t.origem_id, { responsavel_id: novosIds[0] });
        count++;
      }
    }));
    
    toast.success(`${count} itens atualizados`);
    setSelectedTaskIds([]);
  };

  const handleApplyDatas = async (datas: {
    data_inicio?: string;
    data_limite?: string;
    data_agendamento?: string;
    data_postagem?: string;
  }) => {
    const selectedTasks = todasTarefas.filter(t => selectedTaskIds.includes(t.id));
    let count = 0;

    await Promise.all(selectedTasks.map(async (t) => {
      if (t.fonte === 'demanda') {
        await updateDemanda(t.origem_id, {
          data_inicio: datas.data_inicio || undefined,
          data_limite: datas.data_limite || undefined,
        });
        count++;
      } else if (t.fonte === 'post') {
        const [_, cid, rid] = t.id.split(':');
        const cardsNoGrupo = cards.filter(c => c.cliente_id === cid && (
          c.responsaveis.includes(rid) || ((c as any).responsaveis_postagem ?? []).includes(rid)
        ));
        await Promise.all(cardsNoGrupo.map(c => {
          const patch: any = {};
          if (datas.data_inicio !== undefined) patch.data_inicio_tarefa = datas.data_inicio || undefined;
          if (datas.data_limite !== undefined) patch.data_limite_tarefa = datas.data_limite || undefined;
          if (datas.data_agendamento !== undefined) patch.data_agendada = datas.data_agendamento || null;
          if (datas.data_postagem !== undefined) patch.data_postagem = datas.data_postagem || null;
          return updateCard(c.id, patch);
        }));
        count += cardsNoGrupo.length;
      } else if (t.fonte === 'planejamento') {
        await updatePlan(t.origem_id, { prazo: datas.data_limite || undefined });
        count++;
      }
    }));

    toast.success(`${count} itens atualizados`);
    setSelectedTaskIds([]);
  };

  const selecaoTemPost = useMemo(
    () => todasTarefas.some((t) => selectedTaskIds.includes(t.id) && t.fonte === "post"),
    [todasTarefas, selectedTaskIds],
  );

  const handleApplyStatus = async (novoStatus: string) => {
    const selectedTasks = todasTarefas.filter(t => selectedTaskIds.includes(t.id));
    let count = 0;

    await Promise.all(selectedTasks.map(async (t) => {
      if (t.fonte === 'demanda') {
        let statusParaDemanda = novoStatus;
        // Mapeamento de compatibilidade entre status de Post e Demanda
        if (novoStatus === 'Agendar') statusParaDemanda = 'Entregue';
        if (novoStatus === 'Postado') statusParaDemanda = 'Concluido';
        
        await moveDemandaStatus(t.origem_id, statusParaDemanda as any);
        count++;
      } else if (t.fonte === 'post') {
        const [_, cid, rid] = t.id.split(':');
        const cardsNoGrupo = cards.filter(c => c.cliente_id === cid && c.responsaveis.includes(rid));
        await Promise.all(cardsNoGrupo.map(c => moveCard(c.id, novoStatus as any)));
        count += cardsNoGrupo.length;
      } else if (t.fonte === 'planejamento') {
        let statusPlan = novoStatus.toLowerCase();
        if (statusPlan === 'postado') statusPlan = 'concluido';
        if (statusPlan === 'agendar') statusPlan = 'em_andamento';
        await updatePlan(t.origem_id, { status: statusPlan as any });
        count++;
      }
    }));

    toast.success(`${count} itens atualizados`);
    setSelectedTaskIds([]);
  };

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
          <TabsTrigger value="cadencias" className="text-xs h-7">Cadências Operacionais</TabsTrigger>
          <TabsTrigger value="sugeridas" className="text-xs h-7">Tarefas Sugeridas</TabsTrigger>
          <TabsTrigger value="delegacoes" className="text-xs h-7">Delegação de Reunião</TabsTrigger>
        </TabsList>

        <TabsContent value="cadencias" className="mt-3">
          <Suspense fallback={<div className="text-xs text-muted-foreground p-4">Carregando…</div>}>
            <CadenciasOperacionaisTab
              scopeResponsavelId={
                visualizacao === "todos"
                  ? null
                  : visualizacao === "minhas"
                    ? responsavelId
                    : visualizacao
              }
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="sugeridas" className="mt-3">
          <TarefasSugeridasTab />
        </TabsContent>

        <TabsContent value="delegacoes" className="mt-3">
          <MeetingDelegationTab />
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

      {selectedTaskIds.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap rounded-lg border bg-card p-2.5 animate-in fade-in slide-in-from-top-1">
          <Badge variant="secondary" className="text-xs h-7 px-3">
            {selectedTaskIds.length} {selectedTaskIds.length === 1 ? "selecionado" : "selecionados"}
          </Badge>
          <div className="flex items-center gap-2 flex-wrap">
            <AtribuirResponsaveisPopover
              responsaveis={responsaveis}
              count={selectedTaskIds.length}
              onApply={handleApplyResponsaveis}
            />

            <DefinirDatasPopover
              count={selectedTaskIds.length}
              onApply={handleApplyDatas}
              postsMode={selecaoTemPost}
            />

            <AlterarStatusPopover
              count={selectedTaskIds.length}
              options={statusPostOptions}
              onApply={handleApplyStatus}
            />

            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setSelectedTaskIds([])}
            >
              Limpar
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setSelectedTaskIds([])}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Sair
            </Button>
          </div>
        </div>
      )}

      <MinhasTarefasTabela
        tasks={tarefasFiltradas}
        onConcluir={(t) => setTaskAlvo(t)}
        mostrarResponsavel={mostrarColunaResponsavel}
        selectedIds={selectedTaskIds}
        onSelectionChange={setSelectedTaskIds}
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
