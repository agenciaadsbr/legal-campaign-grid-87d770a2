/**
 * Estratégias Ativas — camada visual operacional.
 *
 * NÃO cria workflows, status, tarefas ou automações novos.
 * Apenas lê dados existentes (clientes, demandas, posts, regras de ativação)
 * e produz badges resumindo o escopo ativo do cliente.
 */

import type { Cliente } from "@/store/crm";

export type EstrategiaId =
  | "meta_ads"
  | "google_ads"
  | "posts"
  | "gmn"
  | "crm"
  | "lp";

export type EstrategiaStatus = "ativo" | "planejado" | "pendente" | "nao_iniciado";

export interface EstrategiaItem {
  id: EstrategiaId;
  label: string;       // texto curto do badge
  ariaLabel: string;   // descrição completa
  status: EstrategiaStatus;
  /** Classes tailwind para a cor base do badge (bg + text + border). */
  colorClass: string;
}

/** Catálogo. Cor por estratégia conforme spec. */
const CATALOGO: Record<EstrategiaId, { label: string; aria: string; colorClass: string }> = {
  meta_ads: {
    label: "META",
    aria: "Meta Ads",
    colorClass: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  google_ads: {
    label: "GOOGLE",
    aria: "Google Ads",
    colorClass: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
  },
  posts: {
    label: "POSTS",
    aria: "Posts",
    colorClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  gmn: {
    label: "GMN",
    aria: "Google Meu Negócio",
    colorClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  crm: {
    label: "CRM",
    aria: "CRM",
    colorClass: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  lp: {
    label: "LP",
    aria: "Landing Page",
    colorClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  },
};

export function statusIcone(status: EstrategiaStatus): string {
  switch (status) {
    case "ativo": return "✓";
    case "planejado": return "⏳";
    case "pendente": return "⚠";
    case "nao_iniciado":
    default: return "•";
  }
}

export function statusLabel(status: EstrategiaStatus): string {
  switch (status) {
    case "ativo": return "Ativo";
    case "planejado": return "Planejado";
    case "pendente": return "Pendente";
    case "nao_iniciado":
    default: return "Não iniciado";
  }
}

/** Regras globais (vindas de ativacao_regras) que indicam se a estratégia é parte do escopo padrão. */
export interface RegrasEscopo {
  requer_meta_ads?: boolean;
  requer_google_ads?: boolean;
  requer_posts?: boolean;
  requer_gmn?: boolean;
  requer_crm?: boolean;
  requer_lp?: boolean;
}

interface DemandaLike {
  cliente_id: string;
  titulo?: string | null;
  subtipo?: string | null;
  categoria?: string | null;
  status?: string | null;
}

interface CardLike {
  cliente_id: string;
}

/**
 * Deriva as estratégias de um cliente combinando:
 * - override manual em `cliente.custom.estrategias_ativas`
 * - sinais reais (posts existentes, demandas por palavra-chave)
 * - regras globais de ativação (planejado / pendente)
 */
export function deriveEstrategias(
  cliente: Cliente,
  demandas: DemandaLike[],
  cards: CardLike[],
  regras?: RegrasEscopo | null,
): EstrategiaItem[] {
  const override = (cliente.custom?.estrategias_ativas ?? {}) as Partial<
    Record<EstrategiaId, { ativo?: boolean; status?: EstrategiaStatus }>
  >;

  const demCli = demandas.filter((d) => d.cliente_id === cliente.id);
  const cardsCli = cards.filter((c) => c.cliente_id === cliente.id);
  const isOnboarding = (cliente.status_global ?? "Onboarding") === "Onboarding";

  const matchKeyword = (kws: string[]) =>
    demCli.some((d) => {
      const hay = `${d.titulo ?? ""} ${d.subtipo ?? ""} ${d.categoria ?? ""}`.toLowerCase();
      return kws.some((k) => hay.includes(k));
    });

  const resolve = (
    id: EstrategiaId,
    derivedAtivo: boolean,
    requerido: boolean | undefined,
  ): EstrategiaStatus => {
    const ov = override[id];
    if (ov?.status) return ov.status;
    if (ov?.ativo === true) return "ativo";
    if (ov?.ativo === false) return "nao_iniciado";
    if (derivedAtivo) return "ativo";
    if (requerido && isOnboarding) return "planejado";
    if (requerido) return "pendente";
    return "nao_iniciado";
  };

  const itens: EstrategiaItem[] = [
    {
      id: "meta_ads",
      ...CATALOGO.meta_ads.label && {},
      label: CATALOGO.meta_ads.label,
      ariaLabel: CATALOGO.meta_ads.aria,
      colorClass: CATALOGO.meta_ads.colorClass,
      status: resolve("meta_ads", matchKeyword(["meta ads", "facebook ads", "instagram ads"]), regras?.requer_meta_ads),
    },
    {
      id: "google_ads",
      label: CATALOGO.google_ads.label,
      ariaLabel: CATALOGO.google_ads.aria,
      colorClass: CATALOGO.google_ads.colorClass,
      status: resolve("google_ads", matchKeyword(["google ads", "google_ads"]), regras?.requer_google_ads),
    },
    {
      id: "posts",
      label: CATALOGO.posts.label,
      ariaLabel: CATALOGO.posts.aria,
      colorClass: CATALOGO.posts.colorClass,
      status: resolve("posts", cardsCli.length > 0, regras?.requer_posts),
    },
    {
      id: "gmn",
      label: CATALOGO.gmn.label,
      ariaLabel: CATALOGO.gmn.aria,
      colorClass: CATALOGO.gmn.colorClass,
      status: resolve("gmn", matchKeyword(["gmn", "google meu negócio", "google meu negocio", "google my business"]), regras?.requer_gmn),
    },
    {
      id: "crm",
      label: CATALOGO.crm.label,
      ariaLabel: CATALOGO.crm.aria,
      colorClass: CATALOGO.crm.colorClass,
      status: resolve("crm", matchKeyword(["crm"]), regras?.requer_crm),
    },
    {
      id: "lp",
      label: CATALOGO.lp.label,
      ariaLabel: CATALOGO.lp.aria,
      colorClass: CATALOGO.lp.colorClass,
      status: resolve("lp", matchKeyword(["landing page", "landingpage", "lp "]), regras?.requer_lp),
    },
  ];

  return itens;
}

/** Filtra apenas estratégias com status diferente de nao_iniciado (úteis para badges compactos). */
export function estrategiasVisiveis(itens: EstrategiaItem[]): EstrategiaItem[] {
  return itens.filter((i) => i.status !== "nao_iniciado");
}

/** Estratégias para uso em selects de filtros. */
export const ESTRATEGIAS_FILTRO: { id: EstrategiaId; label: string }[] = [
  { id: "meta_ads", label: "Meta Ads" },
  { id: "google_ads", label: "Google Ads" },
  { id: "posts", label: "Posts" },
  { id: "gmn", label: "GMN" },
  { id: "crm", label: "CRM" },
  { id: "lp", label: "Landing Page" },
];
