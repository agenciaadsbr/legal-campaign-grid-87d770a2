import type { Demanda } from "@/store/demandas";
import { getResponsaveisIds } from "@/store/demandas";
import type { Card as PostCard, Cliente, Contrato } from "@/store/crm";
import type { PlanItem } from "@/store/planejamento";
import type { DocumentacaoItem } from "@/store/documentacao";
import { CATEGORIA_LABEL } from "@/lib/demandas-categorias";
import { isAguardandoDependencia, type TaskDependency } from "@/lib/workflow";

export type TaskFonte = "demanda" | "post" | "planejamento" | "documentacao";
export type TaskStatus = "pendente" | "em_andamento" | "atrasado" | "concluido" | "aprovacao";
export type TaskPrioridade = "Baixa" | "Media" | "Alta" | "Urgente";

export interface UnifiedTask {
  id: string;
  fonte: TaskFonte;
  origem_id: string;
  cliente_id: string;
  cliente_nome: string;
  titulo: string;
  area: string;
  prioridade: TaskPrioridade;
  prazo: string | null;
  data_inicio: string | null;
  data_limite: string | null;
  status: TaskStatus;
  urgente: boolean;
  responsaveis_ids: string[];
  link: string;
  /** Permite reuso de anexos no fluxo de delegação (apenas demanda). */
  origem_categoria?: string | null;
  /** True se a demanda tem dependência ainda não liberada. */
  aguardando_liberacao?: boolean;
  /** Data em que entrou em "Aguardando aprovação do cliente". */
  approval_waiting_since?: string | null;
  /** Dias inteiros aguardando aprovação (null se não aplicável). */
  approval_dias?: number | null;
}

const PRIO_RANK: Record<TaskPrioridade, number> = {
  Urgente: 4,
  Alta: 3,
  Media: 2,
  Baixa: 1,
};

/**
 * Converte string de prazo em Date local (meia-noite local).
 * Aceita "YYYY-MM-DD" (sem deslocar fuso) e ISO completo.
 */
export function parsePrazoLocal(s: string | null | undefined): Date | null {
  if (!s) return null;
  // Se for YYYY-MM-DD puro, parseia como local
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function isAtrasado(prazo: string | null, status: TaskStatus): boolean {
  if (!prazo || status === "concluido") return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = parsePrazoLocal(prazo);
  return d !== null && d < hoje;
}

function mapCategoriaArea(cat: string): string {
  // Reaproveita labels do módulo de demandas
  return CATEGORIA_LABEL[cat as keyof typeof CATEGORIA_LABEL] ?? cat;
}

/** Mapeia categoria de demanda -> aba do Projeto Completo. */
export function categoriaParaAba(cat: string): string {
  switch (cat) {
    case "EditorVideo": return "videos";
    case "TrafegoPago": return "trafego";
    case "LandingPage": return "lp";
    case "IAAtendimento": return "ia";
    case "Briefing": return "briefing";
    case "Planejamento": return "planejamento";
    case "Personalizado":
    case "Suporte":
    case "Designer":   // legado
    case "Tecnologia": // legado
    default:
      return "urgencias";
  }
}

function mapPrioridadePlan(p: string): TaskPrioridade {
  switch (p) {
    case "urgente": return "Urgente";
    case "alta": return "Alta";
    case "baixa": return "Baixa";
    default: return "Media";
  }
}

interface BuildArgs {
  /** Responsável "principal" usado para agrupar posts e como id default. Pode ser null. */
  responsavelId: string | null;
  /** Auth uid do usuário atual (para documentação enviada por ele). */
  authUserId: string | null;
  /**
   * Escopo de visualização (admin):
   * - omitido/undefined: comportamento legado (apenas responsavelId).
   * - "all": todas as tarefas de qualquer responsável (e qualquer doc).
   * - string[]: tarefas pertencentes a qualquer responsável da lista.
   */
  scopeResponsaveisIds?: string[] | "all";
  /** Auth uids cuja documentação deve ser incluída (admin). "all" ou array. */
  scopeAuthUserIds?: string[] | "all";
  demandas: Demanda[];
  cards: PostCard[];
  planejamento: PlanItem[];
  documentacao: DocumentacaoItem[];
  clientes: Cliente[];
  contratos?: Contrato[];
  /** Dependências entre tarefas para marcar bloqueio. */
  dependencies?: TaskDependency[];
}

export function buildUnifiedTasks(args: BuildArgs): UnifiedTask[] {
  const {
    responsavelId, authUserId, demandas, cards, planejamento, documentacao,
    clientes, contratos = [], scopeResponsaveisIds, scopeAuthUserIds,
    dependencies = [],
  } = args;

  // Define o conjunto de responsáveis "visíveis"
  const respScope: Set<string> | "all" | null =
    scopeResponsaveisIds === "all"
      ? "all"
      : scopeResponsaveisIds && scopeResponsaveisIds.length > 0
        ? new Set(scopeResponsaveisIds)
        : responsavelId
          ? new Set([responsavelId])
          : null;

  const matchResp = (ids: string[]) => {
    if (respScope === "all") return true;
    if (!respScope) return false;
    return ids.some((id) => respScope.has(id));
  };

  // Conjunto de auth uids para documentação
  const docAuthScope: Set<string> | "all" | null =
    scopeAuthUserIds === "all"
      ? "all"
      : scopeAuthUserIds && scopeAuthUserIds.length > 0
        ? new Set(scopeAuthUserIds)
        : authUserId
          ? new Set([authUserId])
          : null;

  const matchDocAuth = (uid: string | null | undefined) => {
    if (!uid) return false;
    if (docAuthScope === "all") return true;
    if (!docAuthScope) return false;
    return docAuthScope.has(uid);
  };
  const clienteMap = new Map(clientes.map((c) => [c.id, c.nome_cliente]));
  const out: UnifiedTask[] = [];

  // --- Demandas ---
  // Demandas em status "Planejamento" são apenas rascunho/modelo da estrutura operacional
  // (geradas pelos templates) e NÃO devem aparecer na Central de Tarefas.
  // Também ignoramos demandas ativas sem nenhuma data operacional, que representam
  // apenas estrutura e não tarefas reais a executar.
  if (respScope) {
    demandas
      .filter((d) => matchResp(getResponsaveisIds(d)))
      .filter((d) => (d.status as string) !== "Planejamento")
      .filter(
        (d) =>
          !!d.data_inicio ||
          !!d.data_limite ||
          d.status === "Concluido" ||
          d.status === "Entregue" ||
          d.status === "Atrasado" ||
          d.status === "Revisar",
      )
      .forEach((d) => {
        let status: TaskStatus = "pendente";
        if (d.status === "Concluido") status = "concluido";
        else if (d.status === "Atrasado") status = "atrasado";
        else if (d.status === "Revisar") status = "aprovacao";
        else if (d.status === "Criar" || d.status === "Entregue") status = "em_andamento";
        if (status !== "concluido" && status !== "aprovacao" && isAtrasado(d.data_limite, status)) status = "atrasado";

        const approval_waiting_since = d.status === "Revisar" ? (d.approval_waiting_since ?? null) : null;
        out.push({
          id: `demanda:${d.id}`,
          fonte: "demanda",
          origem_id: d.id,
          cliente_id: d.cliente_id,
          cliente_nome: clienteMap.get(d.cliente_id) ?? "—",
          titulo: d.titulo,
          area: mapCategoriaArea(d.categoria),
          prioridade: d.prioridade as TaskPrioridade,
          prazo: d.data_limite,
          data_inicio: d.data_inicio,
          data_limite: d.data_limite,
          status,
          urgente: d.prioridade === "Urgente",
          responsaveis_ids: getResponsaveisIds(d),
          link: `/clientes/${d.cliente_id}/projeto?tab=${categoriaParaAba(d.categoria)}&demanda=${d.id}`,
          origem_categoria: d.categoria,
          aguardando_liberacao: isAguardandoDependencia(d.id, dependencies),
          approval_waiting_since,
          approval_dias: diasDesde(approval_waiting_since),
        });
      });
  }

  // --- Posts (cards) AGRUPADOS por cliente + responsável + contrato ---
  if (respScope) {
    const contratosPorCliente = new Map<string, Contrato[]>();
    for (const c of contratos) {
      const arr = contratosPorCliente.get(c.cliente_id) ?? [];
      arr.push(c);
      contratosPorCliente.set(c.cliente_id, arr);
    }

    const resolverContratoId = (cliente_id: string, dataRef: string | null): string => {
      const lista = contratosPorCliente.get(cliente_id) ?? [];
      if (lista.length === 0) return "all";
      if (dataRef) {
        const t = new Date(dataRef).getTime();
        const cobre = lista.find((c) => {
          const ini = new Date(c.data_inicio).getTime();
          const fim = new Date(c.data_fim).getTime();
          return !isNaN(ini) && !isNaN(fim) && t >= ini && t <= fim;
        });
        if (cobre) return cobre.id;
      }
      const ativos = lista.filter((c) => c.status === "Ativo");
      const pool = ativos.length ? ativos : lista;
      const escolhido = [...pool].sort(
        (a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime(),
      )[0];
      return escolhido?.id ?? "all";
    };

    // Agrupa por cliente + cada responsável visível do card + contrato
    const grupos = new Map<string, { cards: PostCard[]; contrato_id: string; responsavel_id: string }>();
    cards.forEach((c) => {
      const respsCard = c.responsaveis ?? [];
      // responsáveis visíveis nesse card segundo o escopo
      const respsVisiveis = respScope === "all"
        ? respsCard
        : respsCard.filter((r) => respScope.has(r));
      if (respsVisiveis.length === 0) return;
      const contrato_id = resolverContratoId(c.cliente_id, c.data_agendada ?? c.created_at);
      respsVisiveis.forEach((rid) => {
        const key = `${c.cliente_id}::${rid}::${contrato_id}`;
        const g = grupos.get(key) ?? { cards: [], contrato_id, responsavel_id: rid };
        g.cards.push(c);
        grupos.set(key, g);
      });
    });

    grupos.forEach((grupo) => {
      const cardsGrupo = grupo.cards;
      const cliente_id = cardsGrupo[0].cliente_id;
      const pendentes = cardsGrupo.filter((c) => c.status_card !== "Postado");
      const todosConcluidos = pendentes.length === 0;

      const emRevisar = pendentes.filter((c) => c.status_card === "Revisar");
      const ativos = pendentes.filter((c) => c.status_card !== "Revisar");

      const prazosAtivos = ativos
        .map((c) => c.data_limite_tarefa)
        .filter((p): p is string => !!p)
        .sort();
      const prazosPendentes = pendentes
        .map((c) => c.data_limite_tarefa)
        .filter((p): p is string => !!p)
        .sort();

      const iniciosPendentes = pendentes
        .map((c) => c.data_inicio_tarefa)
        .filter((p): p is string => !!p)
        .sort();

      // Prazo prioriza cards ativos (fora de aprovação); fallback para qualquer pendente
      let prazo: string | null = prazosAtivos[0] ?? prazosPendentes[0] ?? null;
      let data_inicio: string | null = iniciosPendentes[0] ?? null;
      let data_limite: string | null = prazo;

      if (!prazo && grupo.contrato_id !== "all") {
        const ct = contratos.find((x) => x.id === grupo.contrato_id);
        prazo = ct?.data_fim ?? null;
        if (!data_limite) data_limite = ct?.data_fim ?? null;
      }

      const algumUrgente = cardsGrupo.some((c) => !!c.is_urgent);
      const algumAtivoEmAndamento = ativos.some(
        (c) => c.status_card === "Criar" || c.status_card === "Agendar",
      );

      let status: TaskStatus;
      if (todosConcluidos) status = "concluido";
      else if (ativos.length === 0 && emRevisar.length > 0) status = "aprovacao";
      else if (isAtrasado(prazosAtivos[0] ?? null, "pendente")) status = "atrasado";
      else if (algumAtivoEmAndamento) status = "em_andamento";
      else status = "pendente";

      const titulo = todosConcluidos
        ? `${cardsGrupo.length} posts concluídos`
        : `Criar ${pendentes.length} post${pendentes.length === 1 ? "" : "s"}`;

      // Aprovação: usa o card em Revisar com aprovação mais antiga
      const approvalDates = emRevisar
        .map((c) => c.approval_waiting_since)
        .filter((p): p is string => !!p)
        .sort();
      const approval_waiting_since = status === "aprovacao" ? (approvalDates[0] ?? null) : null;

      out.push({
        id: `posts:${cliente_id}:${grupo.responsavel_id}:${grupo.contrato_id}`,
        fonte: "post",
        origem_id: cardsGrupo[0].id,
        cliente_id,
        cliente_nome: clienteMap.get(cliente_id) ?? "—",
        titulo,
        area: "Posts",
        prioridade: algumUrgente ? "Urgente" : "Media",
        prazo,
        data_inicio,
        data_limite,
        status,
        urgente: algumUrgente,
        responsaveis_ids: [grupo.responsavel_id],
        link: `/clientes/${cliente_id}/projeto?tab=posts`,
        approval_waiting_since,
        approval_dias: diasDesde(approval_waiting_since),
      });
    });
  }

  // --- Planejamento ---
  if (respScope) {
    planejamento
      .filter((p) => p.responsavel_id && matchResp([p.responsavel_id]))
      .filter((p) => p.situacao !== "nao_aplicavel")
      .forEach((p) => {
        let status: TaskStatus = "pendente";
        if (p.status === "concluido") status = "concluido";
        else if (p.status === "em_andamento") status = "em_andamento";
        else if (p.status === "atrasado") status = "atrasado";
        if (status !== "concluido" && isAtrasado(p.prazo, status)) status = "atrasado";

        out.push({
          id: `planejamento:${p.id}`,
          fonte: "planejamento",
          origem_id: p.id,
          cliente_id: p.cliente_id,
          cliente_nome: clienteMap.get(p.cliente_id) ?? "—",
          titulo: p.titulo,
          area: "Planejamento",
          prioridade: mapPrioridadePlan(p.prioridade),
          prazo: p.prazo,
          data_inicio: null, // Planejamento não tem data_inicio no schema atual
          data_limite: p.prazo,
          status,
          urgente: p.prioridade === "urgente",
          responsaveis_ids: p.responsavel_id ? [p.responsavel_id] : [],
          link: `/clientes/${p.cliente_id}/projeto?tab=planejamento`,
        });
      });
  }

  // --- Documentação --- (enviado_por é o auth.uid)
  if (docAuthScope) {
    documentacao
      .filter((d) => matchDocAuth(d.enviado_por))
      .forEach((d) => {
        const status: TaskStatus = d.enviado ? "concluido" : "pendente";
        out.push({
          id: `documentacao:${d.id}`,
          fonte: "documentacao",
          origem_id: d.id,
          cliente_id: d.cliente_id,
          cliente_nome: clienteMap.get(d.cliente_id) ?? "—",
          titulo: d.titulo,
          area: "Documentação",
          prioridade: "Media",
          prazo: d.data_evento,
          data_inicio: null,
          data_limite: d.data_evento,
          status,
          urgente: false,
          responsaveis_ids: [],
          link: `/clientes/${d.cliente_id}/projeto?tab=documentacao`,
        });
      });
  }

  // ---------- TRAVA DE SEGURANÇA ----------
  // Garante que tarefas exibidas pertencem ao escopo solicitado.
  if (respScope && respScope !== "all") {
    const filtrado = out.filter((t) => {
      if (t.fonte === "documentacao") return true;
      return t.responsaveis_ids.some((id) => respScope.has(id));
    });
    return filtrado;
  }
  return out;
}

export function ordenarTarefas(tasks: UnifiedTask[]): UnifiedTask[] {
  return [...tasks].sort((a, b) => {
    // 1. Urgente sempre no topo
    if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
    // 2. Atrasado vem antes
    const aAtrasado = a.status === "atrasado" ? 1 : 0;
    const bAtrasado = b.status === "atrasado" ? 1 : 0;
    if (aAtrasado !== bAtrasado) return bAtrasado - aAtrasado;
    // 3. Prazo asc (nulls no fim)
    const aP = a.prazo ? new Date(a.prazo).getTime() : Number.POSITIVE_INFINITY;
    const bP = b.prazo ? new Date(b.prazo).getTime() : Number.POSITIVE_INFINITY;
    if (aP !== bP) return aP - bP;
    // 4. Prioridade desc
    return PRIO_RANK[b.prioridade] - PRIO_RANK[a.prioridade];
  });
}

/** Dias até o prazo (negativo = atrasado, null = sem prazo) */
export function diasParaPrazo(prazo: string | null): number | null {
  if (!prazo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const p = new Date(prazo);
  p.setHours(0, 0, 0, 0);
  return Math.round((p.getTime() - hoje.getTime()) / 86400000);
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  atrasado: "Atrasado",
  concluido: "Concluído",
  aprovacao: "Aguardando aprovação do cliente",
};

/** Calcula dias inteiros desde uma data ISO (>=0). */
export function diasDesde(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

export const AREAS_DISPONIVEIS: string[] = [
  "Posts",
  "Vídeo",
  "Landing Page / Site",
  "Tráfego Pago",
  "IA / Atendimento",
  "Briefing",
  "Planejamento",
  "Suporte",
  "Urgência / Outro",
  "Documentação",
];
