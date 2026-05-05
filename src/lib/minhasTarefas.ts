import type { Demanda } from "@/store/demandas";
import { getResponsaveisIds } from "@/store/demandas";
import type { Card as PostCard, Cliente, Contrato } from "@/store/crm";
import type { PlanItem } from "@/store/planejamento";
import type { DocumentacaoItem } from "@/store/documentacao";
import { CATEGORIA_LABEL } from "@/lib/demandas-categorias";

export type TaskFonte = "demanda" | "post" | "planejamento" | "documentacao";
export type TaskStatus = "pendente" | "em_andamento" | "atrasado" | "concluido";
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
  status: TaskStatus;
  urgente: boolean;
  responsaveis_ids: string[];
  link: string;
  /** Permite reuso de anexos no fluxo de delegação (apenas demanda). */
  origem_categoria?: string | null;
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
function categoriaParaAba(cat: string): string {
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
}

export function buildUnifiedTasks(args: BuildArgs): UnifiedTask[] {
  const {
    responsavelId, authUserId, demandas, cards, planejamento, documentacao,
    clientes, contratos = [], scopeResponsaveisIds, scopeAuthUserIds,
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
  if (responsavelId) {
    demandas
      .filter((d) => getResponsaveisIds(d).includes(responsavelId))
      .forEach((d) => {
        let status: TaskStatus = "pendente";
        if (d.status === "Concluido") status = "concluido";
        else if (d.status === "Atrasado") status = "atrasado";
        else if (d.status === "Criar" || d.status === "Revisar" || d.status === "Entregue") status = "em_andamento";
        if (status !== "concluido" && isAtrasado(d.data_limite, status)) status = "atrasado";

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
          status,
          urgente: d.prioridade === "Urgente",
          responsaveis_ids: getResponsaveisIds(d),
          link: `/clientes/${d.cliente_id}/projeto?tab=${categoriaParaAba(d.categoria)}&demanda=${d.id}`,
          origem_categoria: d.categoria,
        });
      });
  }

  // --- Posts (cards) AGRUPADOS por cliente + responsável + contrato ---
  // Uma única tarefa por contrato: 3 meses → 12 posts, 6 meses → 24 posts, etc.
  if (responsavelId) {
    // Indexa contratos por cliente
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
      // fallback: Ativo mais recente; senão o mais recente em geral
      const ativos = lista.filter((c) => c.status === "Ativo");
      const pool = ativos.length ? ativos : lista;
      const escolhido = [...pool].sort(
        (a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime(),
      )[0];
      return escolhido?.id ?? "all";
    };

    const grupos = new Map<string, { cards: PostCard[]; contrato_id: string }>();
    cards
      .filter((c) => (c.responsaveis ?? []).includes(responsavelId))
      .forEach((c) => {
        const contrato_id = resolverContratoId(c.cliente_id, c.data_agendada ?? c.created_at);
        const key = `${c.cliente_id}::${responsavelId}::${contrato_id}`;
        const g = grupos.get(key) ?? { cards: [], contrato_id };
        g.cards.push(c);
        grupos.set(key, g);
      });

    grupos.forEach((grupo) => {
      const cardsGrupo = grupo.cards;
      const cliente_id = cardsGrupo[0].cliente_id;
      const pendentes = cardsGrupo.filter((c) => c.status_card !== "Postado");
      const todosConcluidos = pendentes.length === 0;

      // prazo = menor data_agendada entre pendentes; fallback: data_fim do contrato
      const prazosPendentes = pendentes
        .map((c) => c.data_agendada)
        .filter((p): p is string => !!p)
        .sort();
      let prazo: string | null = prazosPendentes[0] ?? null;
      if (!prazo && grupo.contrato_id !== "all") {
        const ct = contratos.find((x) => x.id === grupo.contrato_id);
        prazo = ct?.data_fim ?? null;
      }

      const algumUrgente = cardsGrupo.some((c) => !!c.is_urgent);
      const algumEmAndamento = pendentes.some(
        (c) => c.status_card === "Criar" || c.status_card === "Revisar" || c.status_card === "Agendar",
      );

      let status: TaskStatus;
      if (todosConcluidos) status = "concluido";
      else if (isAtrasado(prazo, "pendente")) status = "atrasado";
      else if (algumEmAndamento) status = "em_andamento";
      else status = "pendente";

      const titulo = todosConcluidos
        ? `${cardsGrupo.length} posts concluídos`
        : `Criar ${pendentes.length} post${pendentes.length === 1 ? "" : "s"}`;

      out.push({
        id: `posts:${cliente_id}:${responsavelId}:${grupo.contrato_id}`,
        fonte: "post",
        origem_id: cardsGrupo[0].id,
        cliente_id,
        cliente_nome: clienteMap.get(cliente_id) ?? "—",
        titulo,
        area: "Posts",
        prioridade: algumUrgente ? "Urgente" : "Media",
        prazo,
        status,
        urgente: algumUrgente,
        responsaveis_ids: [responsavelId],
        link: `/clientes/${cliente_id}/projeto?tab=posts`,
      });
    });
  }

  // --- Planejamento ---
  if (responsavelId) {
    planejamento
      .filter((p) => p.responsavel_id === responsavelId)
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
          status,
          urgente: p.prioridade === "urgente",
          responsaveis_ids: p.responsavel_id ? [p.responsavel_id] : [],
          link: `/clientes/${p.cliente_id}/projeto?tab=planejamento`,
        });
      });
  }

  // --- Documentação --- (enviado_por é o auth.uid)
  if (authUserId) {
    documentacao
      .filter((d) => d.enviado_por === authUserId)
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
          status,
          urgente: false,
          responsaveis_ids: [],
          link: `/clientes/${d.cliente_id}/projeto?tab=documentacao`,
        });
      });
  }

  // ---------- TRAVA DE SEGURANÇA ----------
  // Nunca exibir tarefas que não pertençam ao responsável atual.
  // Documentação é exceção: já filtrada por authUserId e não tem responsavel_id.
  if (responsavelId) {
    const filtrado = out.filter((t) => {
      if (t.fonte === "documentacao") return true;
      return t.responsaveis_ids.includes(responsavelId);
    });
    if (filtrado.length !== out.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[MinhasTarefas] Trava de responsável descartou ${out.length - filtrado.length} tarefa(s) que não pertencem a ${responsavelId}.`,
      );
    }
    return filtrado;
  }
  // Sem vínculo de responsável: só documentação do próprio usuário.
  return out.filter((t) => t.fonte === "documentacao");
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
};

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
