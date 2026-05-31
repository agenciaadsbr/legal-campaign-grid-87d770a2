/**
 * Lógica pura da Central de Ativação.
 * Não busca dados, não toca em store. Recebe agregados e devolve cálculos.
 */
import type { Cliente, Card } from "@/store/crm";
import type { Demanda } from "@/store/demandas";
import type { CardPai, CardPaiEtapa } from "@/store/cardPai";
import { canonicalStatus } from "@/lib/demandas-categorias";

export type Risco = "OK" | "Atencao" | "Critico";

/** Status exclusivamente visual/gerencial da Central. Não altera status reais. */
export type StatusVisual = "No prazo" | "Atenção" | "Risco" | "Atrasado" | "Travado";

export const META_ATIVACAO_DIAS = 30;

export interface AtivacaoRegras {
  id: string;
  requer_meta_ads: boolean;
  requer_google_ads: boolean;
  requer_posts: boolean;
  requer_crm: boolean;
  requer_lp: boolean;
  requer_gmn: boolean;
  requer_reuniao_performance: boolean;
  requer_checklist: boolean;
  modo_regra: "todas" | "minimo";
  quantidade_minima: number;
}

export const REGRAS_PADRAO: Omit<AtivacaoRegras, "id"> = {
  requer_meta_ads: true,
  requer_google_ads: true,
  requer_posts: true,
  requer_crm: false,
  requer_lp: false,
  requer_gmn: false,
  requer_reuniao_performance: false,
  requer_checklist: true,
  modo_regra: "todas",
  quantidade_minima: 4,
};

/** Status considerados "resolvidos" (não contam como gargalo nem como pendência de progresso). */
const STATUS_RESOLVIDOS = new Set([
  "Concluido",
  "Concluído",
  "Entregue",
  "Postado",
]);

const STATUS_INTERNO_RESOLVIDOS = new Set(["ja_existente", "nao_aplicavel"]);

export function isStatusResolvido(s: string | null | undefined): boolean {
  return STATUS_RESOLVIDOS.has(canonicalStatus(s));
}

export function isEtapaResolvida(e: CardPaiEtapa): boolean {
  if (e.concluido) return true;
  const v = (e.status_interno_valor ?? "").trim();
  if (STATUS_INTERNO_RESOLVIDOS.has(v)) return true;
  return false;
}

/** Dias corridos entre dois ISO. */
export function diasEntre(fromISO: string | null | undefined, toISO?: string | null): number {
  if (!fromISO) return 0;
  const from = new Date(fromISO).getTime();
  const to = toISO ? new Date(toISO).getTime() : Date.now();
  return Math.max(0, Math.floor((to - from) / 86400000));
}

export function diasNoOnboarding(cliente: Cliente): number {
  return diasEntre(cliente.data_inicio_onboarding ?? cliente.created_at);
}

/** Calcula progresso considerando Cards Pai, suas etapas e tarefas operacionais do cliente. */
export function calcularProgresso(
  etapas: CardPaiEtapa[],
  demandas: Demanda[],
): { resolvidas: number; total: number; pct: number } {
  let resolvidas = 0;
  let total = 0;

  for (const e of etapas) {
    total += 1;
    if (isEtapaResolvida(e)) resolvidas += 1;
  }
  for (const d of demandas) {
    if (d.is_card_pai) continue;
    if (d.categoria !== "Operacional") continue;
    total += 1;
    if (isStatusResolvido(d.status) || d.marcado_ja_possui) resolvidas += 1;
  }

  if (total === 0) return { resolvidas: 0, total: 0, pct: 0 };
  return { resolvidas, total, pct: Math.round((resolvidas / total) * 100) };
}

/** Ordem do gargalo: o pior pendente vira o "status principal" exibido. */
const ORDEM_GARGALO: { match: (d: Demanda) => boolean; label: string }[] = [
  { match: (d) => canonicalStatus(d.status) === "Atrasado", label: "Atrasado" },
  { match: (d) => canonicalStatus(d.status) === "Aguardando ação do cliente", label: "Aguardando ação do cliente" },
  { match: (d) => canonicalStatus(d.status) === "Aguardando aprovação do cliente", label: "Aguardando aprovação do cliente" },
  { match: (d) => canonicalStatus(d.status) === "Aguardando etapa anterior", label: "Aguardando etapa anterior" },
  { match: (d) => canonicalStatus(d.status) === "Aguardando etapa interna", label: "Aguardando etapa interna" },
  { match: (d) => (d.responsaveis_ids?.length ?? 0) === 0 && !d.responsavel_id && !isStatusResolvido(d.status), label: "Sem responsável" },
  { match: (d) => !d.data_limite && !isStatusResolvido(d.status), label: "Sem prazo" },
  { match: (d) => canonicalStatus(d.status) === "Criar", label: "Criar" },
  { match: (d) => canonicalStatus(d.status) === "Planejamento", label: "Planejamento" },
];

export function calcularStatusPrincipal(demandas: Demanda[]): { label: string; demanda?: Demanda } {
  const ativas = demandas.filter((d) => !isStatusResolvido(d.status));
  for (const regra of ORDEM_GARGALO) {
    const d = ativas.find(regra.match);
    if (d) return { label: regra.label, demanda: d };
  }
  return { label: ativas.length === 0 ? "Entregue / Concluído" : canonicalStatus(ativas[0].status) || "—", demanda: ativas[0] };
}

/** Último avanço considerando demandas e etapas do cliente. */
export function calcularUltimoAvanco(demandas: Demanda[], etapas: CardPaiEtapa[]): string | null {
  const dates: string[] = [];
  for (const d of demandas) {
    if (d.data_conclusao) dates.push(d.data_conclusao);
    if (d.updated_at) dates.push(d.updated_at);
  }
  for (const e of etapas) {
    if (e.concluido_em) dates.push(e.concluido_em);
    if (e.updated_at) dates.push(e.updated_at);
  }
  if (dates.length === 0) return null;
  dates.sort();
  return dates[dates.length - 1];
}

/** Cálculo de risco baseado em prazos, badges, idade do onboarding e gargalos. */
export function calcularRisco(args: {
  cliente: Cliente;
  demandas: Demanda[];
  etapas: CardPaiEtapa[];
  ultimoAvanco: string | null;
}): { risco: Risco; motivos: string[] } {
  const { cliente, demandas, etapas, ultimoAvanco } = args;
  const motivos: string[] = [];
  let nivel: Risco = "OK";

  const promove = (alvo: Risco) => {
    if (alvo === "Critico") nivel = "Critico";
    else if (alvo === "Atencao" && nivel !== "Critico") nivel = "Atencao";
  };

  const dOnb = diasNoOnboarding(cliente);
  if (dOnb > 30) {
    promove("Critico");
    motivos.push(`${dOnb} dias em onboarding (acima de 30)`);
  } else if (dOnb > 20) {
    promove("Atencao");
    motivos.push(`${dOnb} dias em onboarding`);
  }

  const diasSemAvanco = ultimoAvanco ? diasEntre(ultimoAvanco) : dOnb;
  if (diasSemAvanco > 7) {
    promove("Critico");
    motivos.push(`Sem avanço há ${diasSemAvanco} dias`);
  } else if (diasSemAvanco >= 4) {
    promove("Atencao");
    motivos.push(`Sem avanço há ${diasSemAvanco} dias`);
  }

  const ativas = demandas.filter((d) => !isStatusResolvido(d.status));

  for (const d of ativas) {
    if (d.data_limite) {
      const dias = diasEntre(new Date().toISOString(), d.data_limite);
      const venc = diasEntre(d.data_limite);
      if (new Date(d.data_limite).getTime() < Date.now()) {
        promove("Critico");
        motivos.push(`Tarefa atrasada: ${d.titulo}`);
      } else if (dias <= 3) {
        promove("Atencao");
        motivos.push(`Prazo vencendo: ${d.titulo}`);
      }
      void venc;
    } else {
      promove("Atencao");
      motivos.push(`Sem prazo: ${d.titulo}`);
    }
    if ((d.responsaveis_ids?.length ?? 0) === 0 && !d.responsavel_id) {
      promove("Critico");
      motivos.push(`Sem responsável: ${d.titulo}`);
    }

    const status = canonicalStatus(d.status);
    if (status === "Aguardando ação do cliente" || status === "Aguardando aprovação do cliente") {
      const dias = diasEntre(d.updated_at);
      if (dias > 5) {
        promove("Critico");
        motivos.push(`Aguardando cliente há ${dias} dias: ${d.titulo}`);
      } else if (dias >= 2) {
        promove("Atencao");
        motivos.push(`Aguardando cliente há ${dias} dias: ${d.titulo}`);
      }
      if (d.status_motivo) {
        if (dias > 5) {
          promove("Critico");
          motivos.push(`Badge pendente "${d.status_motivo}" há ${dias} dias`);
        } else if (dias >= 2) {
          promove("Atencao");
        }
      }
    }
  }

  for (const e of etapas) {
    if (isEtapaResolvida(e)) continue;
    if (!e.responsavel_id && e.tipo === "tarefa_real") {
      promove("Atencao");
    }
  }

  return { risco: nivel, motivos };
}

const REGRA_PARA_CARD_PAI: Record<keyof Omit<AtivacaoRegras, "id" | "modo_regra" | "quantidade_minima">, RegExp> = {
  requer_meta_ads: /meta\s*ads/i,
  requer_google_ads: /google\s*ads/i,
  requer_posts: /post/i,
  requer_crm: /\bcrm\b|agente\s*ia|ia\s*atendimento/i,
  requer_lp: /landing\s*page|\blp\b|site/i,
  requer_gmn: /\bgmn\b|google\s*meu\s*neg/i,
  requer_reuniao_performance: /reuni[aã]o\s*(de\s*)?performance/i,
  requer_checklist: /checklist|onboarding/i,
};

function regraAtendida(
  key: keyof typeof REGRA_PARA_CARD_PAI,
  cardsPai: CardPai[],
  etapasByCard: Map<string, CardPaiEtapa[]>,
  demandas: Demanda[],
): boolean {
  const rx = REGRA_PARA_CARD_PAI[key];
  // 1) Existe Card Pai correspondente totalmente resolvido?
  const cardsMatch = cardsPai.filter((c) => rx.test(c.titulo));
  for (const c of cardsMatch) {
    const etapas = etapasByCard.get(c.id) ?? [];
    if (etapas.length > 0 && etapas.every(isEtapaResolvida)) return true;
    if (c.status_geral && /(concluí|conclui|finaliz|ativad)/i.test(c.status_geral)) return true;
  }
  // 2) Existe demanda operacional resolvida correspondente?
  const dMatch = demandas.find((d) => rx.test(d.titulo) && (isStatusResolvido(d.status) || d.marcado_ja_possui));
  if (dMatch) return true;
  return false;
}

export function clientePodeAtivar(args: {
  cliente: Cliente;
  cardsPai: CardPai[];
  etapas: CardPaiEtapa[];
  demandas: Demanda[];
  regras: AtivacaoRegras;
}): { pronto: boolean; pendencias: string[]; atendidas: string[] } {
  const { cardsPai, etapas, demandas, regras } = args;
  const etapasByCard = new Map<string, CardPaiEtapa[]>();
  for (const e of etapas) {
    const arr = etapasByCard.get(e.card_pai_id) ?? [];
    arr.push(e);
    etapasByCard.set(e.card_pai_id, arr);
  }

  const ativas: { key: keyof typeof REGRA_PARA_CARD_PAI; label: string }[] = [];
  if (regras.requer_meta_ads) ativas.push({ key: "requer_meta_ads", label: "Meta Ads ativo" });
  if (regras.requer_google_ads) ativas.push({ key: "requer_google_ads", label: "Google Ads ativo" });
  if (regras.requer_posts) ativas.push({ key: "requer_posts", label: "Posts ativos" });
  if (regras.requer_crm) ativas.push({ key: "requer_crm", label: "CRM / IA ativo" });
  if (regras.requer_lp) ativas.push({ key: "requer_lp", label: "Landing page publicada" });
  if (regras.requer_gmn) ativas.push({ key: "requer_gmn", label: "GMN criado" });
  if (regras.requer_reuniao_performance) ativas.push({ key: "requer_reuniao_performance", label: "Reunião de performance agendada" });
  if (regras.requer_checklist) ativas.push({ key: "requer_checklist", label: "Checklist de onboarding concluído" });

  const atendidas: string[] = [];
  const pendencias: string[] = [];
  for (const r of ativas) {
    if (regraAtendida(r.key, cardsPai, etapasByCard, demandas)) atendidas.push(r.label);
    else pendencias.push(r.label);
  }

  if (regras.modo_regra === "todas") {
    return { pronto: pendencias.length === 0, pendencias, atendidas };
  }
  const min = Math.max(1, regras.quantidade_minima);
  return { pronto: atendidas.length >= min, pendencias, atendidas };
}

/** Pendências críticas independentes das regras (gate antes de marcar Ativo). */
export function pendenciasCriticasParaAtivar(args: {
  demandas: Demanda[];
  etapas: CardPaiEtapa[];
}): string[] {
  const { demandas, etapas } = args;
  const list: string[] = [];
  const ativas = demandas.filter((d) => !isStatusResolvido(d.status));

  if (ativas.some((d) => canonicalStatus(d.status) === "Atrasado"))
    list.push("Há tarefas atrasadas");
  if (ativas.some((d) => (d.responsaveis_ids?.length ?? 0) === 0 && !d.responsavel_id))
    list.push("Há tarefas sem responsável");
  if (ativas.some((d) => !d.data_limite))
    list.push("Há tarefas sem prazo");
  if (ativas.some((d) => canonicalStatus(d.status) === "Aguardando ação do cliente"))
    list.push("Há etapas aguardando ação do cliente");
  if (ativas.some((d) => canonicalStatus(d.status) === "Aguardando aprovação do cliente"))
    list.push("Há etapas aguardando aprovação do cliente");
  if (etapas.some((e) => !isEtapaResolvida(e) && e.tipo === "tarefa_real" && !e.responsavel_id))
    list.push("Há etapas de Card Pai sem responsável");
  return list;
}

/** Filtra cliente (para filtros da Central). */
export function clienteNaCentral(c: Cliente): boolean {
  return (c.status_global ?? "Onboarding") === "Onboarding" && !c.oculto;
}

/** Resumo do que o card "Card Pai" deve exibir como módulo. */
export interface ModuloAtivacao {
  card: CardPai;
  etapaAtual?: CardPaiEtapa;
  resolvidas: number;
  total: number;
  pct: number;
}

export function modulosDoCliente(
  cardsPai: CardPai[],
  etapas: CardPaiEtapa[],
): ModuloAtivacao[] {
  return cardsPai.map((card) => {
    const minhas = etapas
      .filter((e) => e.card_pai_id === card.id)
      .sort((a, b) => a.ordem - b.ordem);
    const total = minhas.length;
    const resolvidas = minhas.filter(isEtapaResolvida).length;
    const etapaAtual = minhas.find((e) => !isEtapaResolvida(e));
    return {
      card,
      etapaAtual,
      resolvidas,
      total,
      pct: total === 0 ? 0 : Math.round((resolvidas / total) * 100),
    };
  });
}

/** Resumo de gargalo: rótulo do próximo bloqueio (etapa não resolvida do Card Pai mais relevante). */
export function proximoBloqueio(modulos: ModuloAtivacao[]): string | null {
  // Pega o módulo mais "atrasado" (menor pct, mas com pendência).
  const pendentes = modulos.filter((m) => m.etapaAtual);
  if (pendentes.length === 0) return null;
  pendentes.sort((a, b) => a.pct - b.pct);
  const top = pendentes[0];
  return `${top.card.titulo} — ${top.etapaAtual?.titulo ?? "etapa em andamento"}`;
}

// Suprime warning de "Card" não usado se import futuro for removido
export type _Card = Card;
