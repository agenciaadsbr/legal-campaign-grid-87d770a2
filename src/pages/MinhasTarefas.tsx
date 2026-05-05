import { useMemo, useState } from "react";
import { useCRM } from "@/store/crm";
import { useDemandas, useDemandasBootstrap } from "@/store/demandas";
import { usePlanejamento, usePlanejamentoBootstrap } from "@/store/planejamento";
import { useDocumentacao, useDocumentacaoBootstrap } from "@/store/documentacao";
import { useAuth } from "@/hooks/useAuth";
import { useResponsavelAtual } from "@/hooks/useResponsavelAtual";
import {
  buildUnifiedTasks, ordenarTarefas, parsePrazoLocal, type UnifiedTask,
} from "@/lib/minhasTarefas";
import { MinhasTarefasFiltros, type FiltrosState } from "@/components/tarefas/MinhasTarefasFiltros";
import { MinhasTarefasTabela } from "@/components/tarefas/MinhasTarefasTabela";
import { ConcluirTarefaDialog } from "@/components/tarefas/ConcluirTarefaDialog";
import { KpiCard } from "@/components/relatorios/KpiCard";
import { AlertCircle, CheckCircle2, ListChecks, Zap } from "lucide-react";

const FILTROS_INICIAIS: FiltrosState = {
  cliente: "all",
  areas: [],
  status: [],
  busca: "",
  periodo: { preset: "todos", inicio: null, fim: null },
};

export default function MinhasTarefas() {
  useDemandasBootstrap();
  usePlanejamentoBootstrap();
  useDocumentacaoBootstrap();

  const { user } = useAuth();
  const { responsavel, responsavelId } = useResponsavelAtual();

  const clientes = useCRM((s) => s.clientes);
  const cards = useCRM((s) => s.cards);
  const contratos = useCRM((s) => s.contratos);
  const demandas = useDemandas((s) => s.demandas);
  const planejamento = usePlanejamento((s) => s.itens);
  const documentacao = useDocumentacao((s) => s.itens);

  const [filtros, setFiltros] = useState<FiltrosState>(FILTROS_INICIAIS);
  const [taskAlvo, setTaskAlvo] = useState<UnifiedTask | null>(null);

  const todasTarefas = useMemo(
    () =>
      buildUnifiedTasks({
        responsavelId,
        authUserId: user?.id ?? null,
        demandas,
        cards,
        planejamento,
        documentacao,
        clientes,
        contratos,
      }),
    [responsavelId, user?.id, demandas, cards, planejamento, documentacao, clientes, contratos],
  );

  const tarefasFiltradas = useMemo(() => {
    const { cliente, areas, status, busca, periodo } = filtros;
    const buscaLower = busca.trim().toLowerCase();
    const ini = periodo.inicio;
    const fim = periodo.fim;
    const isFuturo = ["hoje", "esta_semana", "prox_7", "prox_14", "prox_30"].includes(periodo.preset);
    const isPassado = ["ult_7", "ult_14", "ult_30", "mes_passado"].includes(periodo.preset);
    const isCustom = periodo.preset === "personalizado";
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
        const iniT = ini?.getTime() ?? null;
        const fimT = fim?.getTime() ?? null;

        if (isFuturo) {
          // Inclui tudo até "fim", trazendo também atrasadas pendentes
          if (fimT !== null && pTime > fimT) return false;
          if (iniT !== null && pTime < iniT && t.status !== "atrasado") return false;
        } else if (isPassado || isCustom) {
          if (iniT !== null && pTime < iniT) return false;
          if (fimT !== null && pTime > fimT) return false;
        }
      }
      return true;
    });
    return ordenarTarefas(filtradas);
  }, [todasTarefas, filtros]);

  const kpis = useMemo(() => {
    const total = todasTarefas.length;
    const pendentes = todasTarefas.filter((t) => t.status !== "concluido").length;
    const atrasadas = todasTarefas.filter((t) => t.status === "atrasado").length;
    const urgentes = todasTarefas.filter((t) => t.urgente && t.status !== "concluido").length;
    return { total, pendentes, atrasadas, urgentes };
  }, [todasTarefas]);

  const areasDisponiveis = useMemo(
    () => Array.from(new Set(todasTarefas.map((t) => t.area))),
    [todasTarefas],
  );

  return (
    <div className="px-5 py-4 space-y-3 animate-fade-in">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold leading-tight">Minhas Tarefas</h1>
          <p className="text-xs text-muted-foreground">
            {responsavel
              ? <>Painel individual de <strong>{responsavel.nome}</strong> — apenas tarefas atribuídas a você</>
              : "Suas tarefas em todos os clientes"}
          </p>
        </div>
      </header>

      {!responsavelId && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
          Seu usuário ainda não está vinculado a um responsável da equipe. Peça a um administrador
          para fazer o vínculo em <strong>Configurações → Equipe & Acessos</strong>.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard compact icon={ListChecks} label="Total" value={kpis.total} tone="primary" />
        <KpiCard compact icon={CheckCircle2} label="Pendentes" value={kpis.pendentes} tone="info" />
        <KpiCard compact icon={AlertCircle} label="Atrasadas" value={kpis.atrasadas}
          tone={kpis.atrasadas > 0 ? "destructive" : "default"} />
        <KpiCard compact icon={Zap} label="Urgentes" value={kpis.urgentes}
          tone={kpis.urgentes > 0 ? "destructive" : "default"} />
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
      />

      <ConcluirTarefaDialog
        task={taskAlvo}
        open={!!taskAlvo}
        onOpenChange={(o) => !o && setTaskAlvo(null)}
      />
    </div>
  );
}
