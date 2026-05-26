export type DemandaCategoria =
  | "Designer"
  | "EditorVideo"
  | "LandingPage"
  | "TrafegoPago"
  | "Tecnologia"
  | "Suporte"
  | "Personalizado"
  | "IAAtendimento"
  | "Briefing"
  | "Planejamento"
  | "Operacional";

export const CATEGORIA_LABEL: Record<DemandaCategoria, string> = {
  Designer: "Designer",
  EditorVideo: "Vídeo",
  LandingPage: "Landing Page / Site",
  TrafegoPago: "Tráfego Pago",
  Tecnologia: "Tecnologia",
  Suporte: "Suporte",
  Personalizado: "Urgência / Outro",
  IAAtendimento: "IA / Atendimento",
  Briefing: "Briefing",
  Planejamento: "Planejamento",
  Operacional: "Operacional",
};

export const CATEGORIA_SUBTIPOS: Record<DemandaCategoria, string[]> = {
  Designer: [
    "Criativo de anúncio",
    "Imagem para campanha",
    "Carrossel",
    "Thumbnail",
    "Banner",
  ],
  EditorVideo: [
    "Vídeo para anúncio",
    "Vídeo orgânico/feed",
    "Vídeo enviado pelo cliente",
    "Vídeo IA com imagem do cliente",
    "Vídeo IA com personagem da agência",
    "Edição reels",
    "Corte vídeo cliente",
  ],
  LandingPage: [
    "Lovable",
    "Wix",
    "WordPress",
    "Criar landing page",
    "Ajustar landing page",
    "Correção de formulário",
    "Ajuste de domínio",
    "Pixel/conversão",
    "Alteração texto/design",
  ],
  TrafegoPago: [
    "Meta Ads",
    "Google Ads",
    "Criar campanha",
    "Ajustar campanha",
    "Subir criativo",
    "Corrigir anúncio",
    "Revisar segmentação",
    "Ajuste de conversão/pixel",
    "Otimizar campanha",
    "Relatório",
    "Recarga saldo",
  ],
  Tecnologia: ["CRM", "Integração", "Wix", "Sistema"],
  Suporte: [
    "Ajuste cliente",
    "Alteração urgente",
    "Reunião performance",
    "Reunião start",
    "Reunião apresentação",
  ],
  Personalizado: ["Outro"],
  IAAtendimento: [
    "Agente de IA",
    "Automação WhatsApp",
    "Integração",
    "Ajuste de atendimento",
    "Prompt",
    "Fluxo",
    "Botões",
    "Mensagens automáticas",
  ],
  Briefing: ["Reunião inicial", "Atualização", "Revisão", "Outro"],
  Planejamento: ["Mensal", "Trimestral", "Campanha", "Lançamento", "Outro"],
  Operacional: ["Onboarding", "Acessos", "Configuração", "Outro"],
};

export const CATEGORIAS: DemandaCategoria[] = [
  // Designer e Tecnologia foram descontinuados (ver memória do projeto):
  // - Designer → migra para Personalizado (Urgência/Outro)
  // - Tecnologia → migra para IAAtendimento
  // As chaves seguem existindo em CATEGORIA_LABEL/CATEGORIA_SUBTIPOS para
  // manter retrocompatibilidade de leitura de demandas antigas.
  "EditorVideo",
  "LandingPage",
  "TrafegoPago",
  "IAAtendimento",
  "Briefing",
  "Planejamento",
  "Operacional",
  "Suporte",
  "Personalizado",
];

export type DemandaStatus =
  | "Planejamento"
  | "Criar"
  | "Revisar"
  | "Entregue"
  | "Concluido"
  | "Atrasado"
  | "Aguardando etapa anterior"
  | "Aguardando etapa interna"
  | "Aguardando ação do cliente"
  | "Aguardando aprovação do cliente"
  | "Agendado"
  | "Postado";

// "Revisar" é o valor legado equivalente a "Aguardando aprovação do cliente".
// Não exibimos como opção separada para evitar duplicação. A canonicalização
// abaixo garante que dados existentes com status "Revisar" sejam tratados
// como "Aguardando aprovação do cliente" em filtros, kanbans e dropdowns.
export const STATUS_DEMANDA: DemandaStatus[] = [
  "Planejamento",
  "Criar",
  "Aguardando etapa anterior",
  "Aguardando etapa interna",
  "Aguardando ação do cliente",
  "Aguardando aprovação do cliente",
  "Agendado",
  "Entregue",
  "Postado",
  "Concluido",
  "Atrasado",
];

/** Retorna o status canônico, mapeando aliases legados ("Revisar"). */
export function canonicalStatus(s: string | null | undefined): string {
  if (!s) return "";
  const trimmed = String(s).trim();
  if (trimmed === "Revisar") return "Aguardando aprovação do cliente";
  return trimmed;
}

/** True quando a demanda pertence à coluna/filtro do status informado. */
export function statusMatchesColuna(itemStatus: string | null | undefined, coluna: string): boolean {
  return canonicalStatus(itemStatus) === canonicalStatus(coluna);
}

export const STATUS_DEMANDA_LABEL: Record<DemandaStatus, string> = {
  Planejamento: "Planejamento",
  Criar: "Criar",
  Revisar: "Aguardando aprovação do cliente",
  Entregue: "Entregue",
  Concluido: "Concluído",
  Atrasado: "Atrasado",
  "Aguardando etapa anterior": "Aguardando etapa anterior",
  "Aguardando etapa interna": "Aguardando etapa interna",
  "Aguardando ação do cliente": "Aguardando ação do cliente",
  "Aguardando aprovação do cliente": "Aguardando aprovação do cliente",
  Agendado: "Agendado",
  Postado: "Postado",
};

export const STATUS_DEMANDA_COR: Record<DemandaStatus, string> = {
  Planejamento: "hsl(var(--muted-foreground))",
  Criar: "hsl(var(--status-criar))",
  Revisar: "hsl(var(--status-revisar))",
  Entregue: "hsl(var(--status-agendar))",
  Concluido: "hsl(var(--status-postado))",
  Atrasado: "hsl(var(--destructive))",
  "Aguardando etapa anterior": "hsl(var(--warning))",
  "Aguardando etapa interna": "hsl(var(--warning))",
  "Aguardando ação do cliente": "hsl(var(--status-revisar))",
  "Aguardando aprovação do cliente": "hsl(var(--status-revisar))",
  Agendado: "hsl(var(--status-agendar))",
  Postado: "hsl(var(--status-postado))",
};

/** Status em que o sistema registra "Entrada no status" e "Dias no status". */
export const STATUS_MONITORADOS: DemandaStatus[] = [
  "Revisar",
  "Aguardando aprovação do cliente",
  "Aguardando ação do cliente",
  "Aguardando etapa interna",
  "Aguardando etapa anterior",
];

export function isStatusMonitorado(s: string | null | undefined): boolean {
  if (!s) return false;
  return (STATUS_MONITORADOS as string[]).includes(s);
}

/** Status que exigem badge de motivo (Aguardando ação do cliente / etapa interna). */
export function statusRequerMotivo(s: string | null | undefined): "cliente" | "interno" | null {
  if (s === "Aguardando ação do cliente") return "cliente";
  if (s === "Aguardando etapa interna") return "interno";
  return null;
}


export type DemandaPrioridade = "Baixa" | "Media" | "Alta" | "Urgente";

export const PRIORIDADES: DemandaPrioridade[] = ["Baixa", "Media", "Alta", "Urgente"];

export const PRIORIDADE_LABEL: Record<DemandaPrioridade, string> = {
  Baixa: "Baixa",
  Media: "Média",
  Alta: "Alta",
  Urgente: "Urgente",
};

export const PRIORIDADE_COR: Record<DemandaPrioridade, string> = {
  Baixa: "hsl(var(--muted-foreground))",
  Media: "hsl(var(--info))",
  Alta: "hsl(var(--status-renovacao))",
  Urgente: "hsl(var(--destructive))",
};
