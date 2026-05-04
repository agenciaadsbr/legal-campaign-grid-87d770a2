import type { Demanda } from "@/store/demandas";
import { getResponsaveisIds } from "@/store/demandas";
import type { Card as PostCard, Cliente } from "@/store/crm";
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

function isAtrasado(prazo: string | null, status: TaskStatus): boolean {
  if (!prazo || status === "concluido") return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return new Date(prazo) < hoje;
}

function mapCategoriaArea(cat: string): string {
  // Reaproveita labels do módulo de demandas
  return CATEGORIA_LABEL[cat as keyof typeof CATEGORIA_LABEL] ?? cat;
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
  responsavelId: string | null;
  authUserId: string | null;
  demandas: Demanda[];
  cards: PostCard[];
  planejamento: PlanItem[];
  documentacao: DocumentacaoItem[];
  clientes: Cliente[];
}

export function buildUnifiedTasks(args: BuildArgs): UnifiedTask[] {
  const { responsavelId, authUserId, demandas, cards, planejamento, documentacao, clientes } = args;
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
          link: `/clientes/${d.cliente_id}/projeto`,
          origem_categoria: d.categoria,
        });
      });
  }

  // --- Posts (cards) ---
  if (responsavelId) {
    cards
      .filter((c) => (c.responsaveis ?? []).includes(responsavelId))
      .forEach((c) => {
        let status: TaskStatus = "pendente";
        if (c.status_card === "Postado") status = "concluido";
        else if (c.status_card === "Criar" || c.status_card === "Revisar" || c.status_card === "Agendar") status = "em_andamento";
        const prazo = c.data_agendada ?? null;
        if (status !== "concluido" && isAtrasado(prazo, status)) status = "atrasado";

        out.push({
          id: `post:${c.id}`,
          fonte: "post",
          origem_id: c.id,
          cliente_id: c.cliente_id,
          cliente_nome: clienteMap.get(c.cliente_id) ?? "—",
          titulo: c.titulo_card,
          area: "Posts",
          prioridade: c.is_urgent ? "Urgente" : "Media",
          prazo,
          status,
          urgente: !!c.is_urgent,
          responsaveis_ids: c.responsaveis ?? [],
          link: `/clientes/${c.cliente_id}/projeto`,
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
          link: `/clientes/${p.cliente_id}/projeto`,
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
          link: `/clientes/${d.cliente_id}/projeto`,
        });
      });
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
