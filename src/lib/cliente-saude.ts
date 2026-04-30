import type { Cliente, Card, Comentario } from "@/store/crm";
import type { Demanda } from "@/store/demandas";

export type NivelSaude = "ok" | "atencao" | "critico";

export interface ResultadoSaude {
  nivel: NivelSaude;
  motivos: string[];
}

export interface MetricasCliente {
  saude: ResultadoSaude;
  /** Posts entregues (status "Postado") no mês corrente. */
  entregaMesFeitos: number;
  /** Meta de posts no mês corrente (do contrato ou total de cards do mês). */
  entregaMesMeta: number;
  /** Timestamp (ms) da última atividade conhecida ou null. */
  ultimaAtividadeMs: number | null;
}

export interface Contrato {
  cliente_id: string;
  total_posts: number;
}

const DIA_MS = 1000 * 60 * 60 * 24;

function diffDays(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / DIA_MS);
}

/**
 * Calcula o nível de saúde do cliente combinando atrasos, contrato,
 * onboarding e frescor de atividade.
 */
export function calcularSaude(args: {
  cliente: Cliente;
  cards: Card[];
  demandas: Demanda[];
  ultimaAtividadeMs: number | null;
  hoje?: Date;
}): ResultadoSaude {
  const hoje = args.hoje ?? (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const motivos: string[] = [];
  let nivel: NivelSaude = "ok";
  const promover = (n: NivelSaude) => {
    if (n === "critico") nivel = "critico";
    else if (n === "atencao" && nivel !== "critico") nivel = "atencao";
  };

  const postsAtrasados = args.cards.filter((c) => c.status_card === "Atrasado").length;
  const demAtrasadas = args.demandas.filter((d) => d.status === "Atrasado").length;

  if (postsAtrasados > 0) {
    promover("critico");
    motivos.push(`${postsAtrasados} post${postsAtrasados > 1 ? "s" : ""} atrasado${postsAtrasados > 1 ? "s" : ""}`);
  }
  if (demAtrasadas >= 3) {
    promover("critico");
    motivos.push(`${demAtrasadas} demandas atrasadas`);
  } else if (demAtrasadas > 0) {
    promover("atencao");
    motivos.push(`${demAtrasadas} demanda${demAtrasadas > 1 ? "s" : ""} atrasada${demAtrasadas > 1 ? "s" : ""}`);
  }

  // Contrato
  if (args.cliente.data_fim_contrato) {
    const fim = new Date(args.cliente.data_fim_contrato);
    const dias = diffDays(hoje, fim);
    if (dias < 0) {
      promover("critico");
      motivos.push("Contrato vencido");
    } else if (dias <= 30) {
      promover("atencao");
      motivos.push(`Contrato vence em ${dias}d`);
    }
  }

  // Onboarding
  if (
    (args.cliente.status_global ?? "Onboarding") === "Onboarding" &&
    args.cliente.prazo_onboarding
  ) {
    const prazo = new Date(args.cliente.prazo_onboarding);
    if (diffDays(hoje, prazo) < 0) {
      promover("critico");
      motivos.push("Onboarding com prazo vencido");
    }
  }

  // Frescor de atividade
  if (args.ultimaAtividadeMs == null) {
    promover("atencao");
    motivos.push("Sem atividade registrada");
  } else {
    const dias = Math.floor((hoje.getTime() - args.ultimaAtividadeMs) / DIA_MS);
    if (dias >= 14) {
      promover("critico");
      motivos.push(`Sem atividade há ${dias}d`);
    } else if (dias >= 7) {
      promover("atencao");
      motivos.push(`Sem atividade há ${dias}d`);
    }
  }

  if (motivos.length === 0) motivos.push("Tudo em dia");
  return { nivel, motivos };
}

/**
 * Calcula entrega do mês corrente e última atividade para um cliente.
 */
export function calcularMetricasCliente(args: {
  cliente: Cliente;
  cards: Card[];
  demandas: Demanda[];
  comentarios: Comentario[];
  contratoTotalPosts?: number | null;
  hoje?: Date;
}): MetricasCliente {
  const hoje = args.hoje ?? new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();

  const cardsCli = args.cards.filter((c) => c.cliente_id === args.cliente.id);
  const cardsMes = cardsCli.filter((c) => {
    if (!c.data_agendada) return false;
    const d = new Date(c.data_agendada);
    return d.getFullYear() === ano && d.getMonth() === mes;
  });
  const feitosMes = cardsMes.filter((c) => c.status_card === "Postado").length;
  const metaMes =
    (args.contratoTotalPosts && args.contratoTotalPosts > 0
      ? args.contratoTotalPosts
      : cardsMes.length) || 0;

  // Última atividade
  const tsList: number[] = [];
  args.comentarios
    .filter((co) => co.cliente_id === args.cliente.id)
    .forEach((co) => tsList.push(new Date(co.created_at).getTime()));
  cardsCli.forEach((c) =>
    tsList.push(new Date((c as any).updated_at ?? c.created_at).getTime()),
  );
  args.demandas
    .filter((d) => d.cliente_id === args.cliente.id)
    .forEach((d) => tsList.push(new Date((d as any).updated_at ?? d.created_at).getTime()));

  const ultimaAtividadeMs = tsList.length ? Math.max(...tsList) : null;

  const saude = calcularSaude({
    cliente: args.cliente,
    cards: cardsCli,
    demandas: args.demandas.filter((d) => d.cliente_id === args.cliente.id),
    ultimaAtividadeMs,
    hoje,
  });

  return {
    saude,
    entregaMesFeitos: feitosMes,
    entregaMesMeta: metaMes,
    ultimaAtividadeMs,
  };
}

export function formatarAtividade(ts: number | null, hoje: Date = new Date()): string {
  if (ts == null) return "nunca";
  const dias = Math.floor((hoje.getTime() - ts) / DIA_MS);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias}d`;
  if (dias < 30) {
    const sem = Math.floor(dias / 7);
    return `há ${sem} sem`;
  }
  if (dias < 365) {
    const meses = Math.floor(dias / 30);
    return `há ${meses}m`;
  }
  return "há +1 ano";
}

export function formatarMRR(valor: number | null | undefined): string {
  if (!valor || valor <= 0) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}
