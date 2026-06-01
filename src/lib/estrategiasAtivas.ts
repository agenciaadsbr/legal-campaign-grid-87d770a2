/**
 * Estratégias Ativas — camada visual operacional.
 *
 * Configuração 100% manual via `cliente.custom.estrategias_ativas`.
 * Status permitidos por estratégia:
 *   - "ativo"     → exibe badge colorido
 *   - "pendente"  → exibe badge discreto (contorno pontilhado / dim)
 *   - "nao_usar"  → não exibe na UI pública (só aparece no formulário)
 *
 * LP NÃO é considerada estratégia ativa (apoio do Google Ads).
 */

import type { Cliente } from "@/store/crm";

export type EstrategiaId =
  | "meta_ads"
  | "google_ads"
  | "posts"
  | "gmn"
  | "crm";

export type EstrategiaStatus = "ativo" | "pendente" | "nao_usar";

export interface EstrategiaItem {
  id: EstrategiaId;
  label: string;       // texto do badge
  ariaLabel: string;   // descrição completa
  status: EstrategiaStatus;
  /** Classes tailwind para a cor base do badge (bg + text + border). */
  colorClass: string;
}

const CATALOGO: Record<EstrategiaId, { label: string; aria: string; colorClass: string }> = {
  meta_ads: {
    label: "Meta",
    aria: "Meta Ads",
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  google_ads: {
    label: "Google",
    aria: "Google Ads",
    colorClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  },
  posts: {
    label: "Posts",
    aria: "Posts",
    colorClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  gmn: {
    label: "GMN",
    aria: "Google Meu Negócio",
    colorClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  crm: {
    label: "CRM/IA",
    aria: "CRM/IA",
    colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
};

const META_GOOGLE_COMBO_CLASS =
  "bg-gradient-to-r from-blue-500/10 to-red-500/10 text-foreground border-foreground/20";

export function statusLabel(status: EstrategiaStatus): string {
  switch (status) {
    case "ativo": return "Ativo";
    case "pendente": return "Pendente";
    case "nao_usar":
    default: return "Não usar";
  }
}

/**
 * Normaliza valores legados:
 *  - "planejado" / "nao_iniciado" / boolean / objeto → status novo
 */
export function normalizeEstrategiaStatus(raw: any): EstrategiaStatus {
  if (raw == null) return "nao_usar";
  if (typeof raw === "boolean") return raw ? "ativo" : "nao_usar";
  if (typeof raw === "object") {
    if (raw.status) return normalizeEstrategiaStatus(raw.status);
    if (raw.ativo === true) return "ativo";
    if (raw.ativo === false) return "nao_usar";
    return "nao_usar";
  }
  const s = String(raw).toLowerCase().trim();
  if (s === "ativo" || s === "active" || s === "ativa" || s === "on" || s === "true") return "ativo";
  if (s === "pendente" || s === "planejado" || s === "pending") return "pendente";
  return "nao_usar";
}

const ORDEM: EstrategiaId[] = ["meta_ads", "google_ads", "posts", "gmn", "crm"];

/** Lê o mapa manual de estratégias do cliente. */
export function lerEstrategiasManuais(
  cliente: Pick<Cliente, "custom"> | null | undefined,
): Record<EstrategiaId, EstrategiaStatus> {
  const raw = (cliente?.custom?.estrategias_ativas ?? {}) as Record<string, any>;
  const out: Record<EstrategiaId, EstrategiaStatus> = {
    meta_ads: "nao_usar",
    google_ads: "nao_usar",
    posts: "nao_usar",
    gmn: "nao_usar",
    crm: "nao_usar",
  };
  for (const id of ORDEM) {
    if (id in raw) out[id] = normalizeEstrategiaStatus(raw[id]);
  }
  return out;
}

/**
 * Deriva estratégias do cliente (configuração 100% manual).
 * Parâmetros adicionais mantidos por compatibilidade — não são usados.
 */
export function deriveEstrategias(
  cliente: Cliente,
  _demandas?: unknown,
  _cards?: unknown,
  _regras?: unknown,
): EstrategiaItem[] {
  const map = lerEstrategiasManuais(cliente);
  return ORDEM.map((id) => ({
    id,
    label: CATALOGO[id].label,
    ariaLabel: CATALOGO[id].aria,
    colorClass: CATALOGO[id].colorClass,
    status: map[id],
  }));
}

/** Filtra apenas estratégias visíveis (ativo ou pendente). */
export function estrategiasVisiveis(itens: EstrategiaItem[]): EstrategiaItem[] {
  return itens.filter((i) => i.status !== "nao_usar");
}

/**
 * Item visual já agrupado, pronto para renderização.
 * Lida com a regra especial Meta+Google.
 */
export interface BadgeVisual {
  key: string;
  label: string;
  ariaLabel: string;
  colorClass: string;
  pendente: boolean;
}

export function badgesParaExibir(itens: EstrategiaItem[]): BadgeVisual[] {
  const byId = new Map(itens.map((i) => [i.id, i]));
  const meta = byId.get("meta_ads");
  const google = byId.get("google_ads");

  const out: BadgeVisual[] = [];

  // Regra Meta + Google
  if (meta?.status === "ativo" && google?.status === "ativo") {
    out.push({
      key: "meta_google",
      label: "Meta + Google",
      ariaLabel: "Meta Ads + Google Ads",
      colorClass: META_GOOGLE_COMBO_CLASS,
      pendente: false,
    });
  } else {
    if (meta && meta.status !== "nao_usar") {
      out.push({
        key: "meta_ads",
        label: meta.status === "pendente" ? "Meta pendente" : meta.label,
        ariaLabel: meta.ariaLabel,
        colorClass: meta.colorClass,
        pendente: meta.status === "pendente",
      });
    }
    if (google && google.status !== "nao_usar") {
      out.push({
        key: "google_ads",
        label: google.status === "pendente" ? "Google pendente" : google.label,
        ariaLabel: google.ariaLabel,
        colorClass: google.colorClass,
        pendente: google.status === "pendente",
      });
    }
  }

  for (const id of ["posts", "gmn", "crm"] as EstrategiaId[]) {
    const it = byId.get(id);
    if (!it || it.status === "nao_usar") continue;
    out.push({
      key: id,
      label: it.status === "pendente" ? `${it.label} pendente` : it.label,
      ariaLabel: it.ariaLabel,
      colorClass: it.colorClass,
      pendente: it.status === "pendente",
    });
  }

  return out;
}

/** Estratégias para uso em selects de filtros. */
export const ESTRATEGIAS_FILTRO: { id: EstrategiaId; label: string }[] = [
  { id: "meta_ads", label: "Meta Ads" },
  { id: "google_ads", label: "Google Ads" },
  { id: "posts", label: "Posts" },
  { id: "gmn", label: "GMN" },
  { id: "crm", label: "CRM/IA" },
];

/** Lista de configuração no formulário do cliente. */
export const ESTRATEGIAS_CONFIG: { id: EstrategiaId; label: string }[] = [
  { id: "meta_ads", label: "Meta Ads" },
  { id: "google_ads", label: "Google Ads" },
  { id: "posts", label: "Posts" },
  { id: "gmn", label: "GMN" },
  { id: "crm", label: "CRM/IA" },
];
