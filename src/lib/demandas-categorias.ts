export type DemandaCategoria =
  | "Designer"
  | "EditorVideo"
  | "LandingPage"
  | "TrafegoPago"
  | "Tecnologia"
  | "Suporte"
  | "Personalizado";

export const CATEGORIA_LABEL: Record<DemandaCategoria, string> = {
  Designer: "Designer",
  EditorVideo: "Editor de Vídeo",
  LandingPage: "Landing Page",
  TrafegoPago: "Tráfego Pago",
  Tecnologia: "Tecnologia",
  Suporte: "Suporte",
  Personalizado: "Personalizado",
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
    "Vídeo anúncio",
    "Edição vídeo post",
    "Edição reels",
    "Corte vídeo cliente",
  ],
  LandingPage: [
    "Criar landing page",
    "Ajustar landing page",
    "Revisar landing page",
  ],
  TrafegoPago: [
    "Criar campanha Meta",
    "Criar campanha Google",
    "Otimizar campanha",
    "Subir campanha",
    "Relatório",
    "Recarga saldo",
  ],
  Tecnologia: ["CRM", "IA", "Integração", "Wix", "Sistema"],
  Suporte: [
    "Ajuste cliente",
    "Alteração urgente",
    "Reunião performance",
    "Reunião start",
    "Reunião apresentação",
  ],
  Personalizado: ["Outro"],
};

export const CATEGORIAS: DemandaCategoria[] = [
  "Designer",
  "EditorVideo",
  "LandingPage",
  "TrafegoPago",
  "Tecnologia",
  "Suporte",
  "Personalizado",
];

export type DemandaStatus =
  | "Planejamento"
  | "Criar"
  | "Revisar"
  | "Entregue"
  | "Concluido"
  | "Atrasado";

export const STATUS_DEMANDA: DemandaStatus[] = [
  "Planejamento",
  "Criar",
  "Revisar",
  "Entregue",
  "Concluido",
  "Atrasado",
];

export const STATUS_DEMANDA_LABEL: Record<DemandaStatus, string> = {
  Planejamento: "Planejamento",
  Criar: "Criar",
  Revisar: "Revisar",
  Entregue: "Entregue",
  Concluido: "Concluído",
  Atrasado: "Atrasado",
};

export const STATUS_DEMANDA_COR: Record<DemandaStatus, string> = {
  Planejamento: "hsl(var(--muted-foreground))",
  Criar: "hsl(var(--status-criar))",
  Revisar: "hsl(var(--status-revisar))",
  Entregue: "hsl(var(--status-agendar))",
  Concluido: "hsl(var(--status-postado))",
  Atrasado: "hsl(var(--destructive))",
};

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
