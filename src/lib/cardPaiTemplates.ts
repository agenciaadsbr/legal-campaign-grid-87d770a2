import type { DemandaCategoria } from "@/lib/demandas-categorias";

export type CardPaiTemplateId = "meta_ads" | "google_ads";

export interface CardPaiTemplateStep {
  titulo: string;
  tipo: "tarefa" | "status";
  /** Apenas para tipo "tarefa": aba destino. */
  categoria?: DemandaCategoria;
  subtipo?: string | null;
  /** Nome do responsável padrão (será procurado em CRM responsaveis por nome). */
  responsavelNome?: string | null;
  /** Status inicial visível. */
  statusInicial?: "Criar" | "Planejamento" | "Aguardando etapa anterior";
  /** Se true, esta etapa nasce bloqueada (depende da anterior, ou da etapa indicada em dependsOnStepIndex). */
  bloqueada?: boolean;
  /** Índice (0-based) da etapa da qual esta depende. Se omitido, usa a etapa imediatamente anterior. */
  dependsOnStepIndex?: number;
  /** Observação curta (vai para descricao da etapa). */
  observacao?: string;
}


export interface CardPaiTemplate {
  id: CardPaiTemplateId;
  label: string;
  descricao: string;
  cardPai: {
    titulo: string;
    categoria: DemandaCategoria;
    subtipo: string;
    descricao: string;
  };
  steps: CardPaiTemplateStep[];
}

export const CARD_PAI_TEMPLATES: CardPaiTemplate[] = [
  {
    id: "meta_ads",
    label: "Ativar campanha Meta Ads",
    descricao: "Processo padrão: criativo → aprovação → ativação no Meta Ads.",
    cardPai: {
      titulo: "Ativar campanha Meta Ads",
      categoria: "Operacional",
      subtipo: "Onboarding",
      descricao:
        "Processo de criação, aprovação e ativação da campanha no Meta Ads.",
    },
    steps: [
      {
        titulo: "Criar anúncio de imagem",
        tipo: "tarefa",
        categoria: "TrafegoPago",
        subtipo: "Subir criativo",
        responsavelNome: "Lorenzo",
        statusInicial: "Criar",
        bloqueada: false,
      },
      {
        titulo: "Criar/editar anúncio em vídeo",
        tipo: "tarefa",
        categoria: "EditorVideo",
        subtipo: "Vídeo para anúncio",
        responsavelNome: "Bianca",
        statusInicial: "Criar",
        bloqueada: false,
        observacao:
          "Pode ser usado para vídeo IA, vídeo gravado ou edição de vídeo enviado pelo cliente.",
      },
      {
        titulo: "Aguardando aprovação do cliente",
        tipo: "status",
        bloqueada: false,
        observacao:
          "Checkpoint manual de aprovação. Conclua quando o cliente aprovar.",
      },
      {
        titulo: "Ativar campanha Meta Ads",
        tipo: "tarefa",
        categoria: "TrafegoPago",
        subtipo: "Criar campanha",
        responsavelNome: "Gleice",
        statusInicial: "Planejamento",

        bloqueada: true,
        dependsOnStepIndex: 2,
        observacao:
          "Confirmar se WhatsApp, criativos e acessos estão corretos antes da ativação.",
      },

    ],
  },
  {
    id: "google_ads",
    label: "Ativar campanha Google Ads",
    descricao:
      "Processo padrão: landing page → aprovações → domínio/tags → ativação.",
    cardPai: {
      titulo: "Ativar campanha Google Ads",
      categoria: "Operacional",
      subtipo: "Onboarding",
      descricao:
        "Processo de criação da landing page, validações técnicas e ativação da campanha no Google Ads.",
    },
    steps: [
      {
        titulo: "Criar Landing Page",
        tipo: "tarefa",
        categoria: "LandingPage",
        subtipo: "Criar landing page",
        responsavelNome: "Bruno",
        statusInicial: "Criar",
        bloqueada: false,
      },
      {
        titulo: "Aprovação interna da Landing Page",
        tipo: "status",
        responsavelNome: "Cristiano",
        bloqueada: true,
        observacao: "Validação interna antes de enviar ao cliente.",
      },
      {
        titulo: "Aguardando aprovação do cliente",
        tipo: "status",
        responsavelNome: "Bruno",
        bloqueada: true,
        observacao: "Checkpoint manual de aprovação do cliente.",
      },
      {
        titulo: "Configurar domínio e hospedagem",
        tipo: "tarefa",
        categoria: "LandingPage",
        subtipo: "Ajuste de domínio",
        responsavelNome: "Erick",
        statusInicial: "Aguardando etapa anterior",
        bloqueada: true,
      },
      {
        titulo: "Configurar tags, pixel e conversões",
        tipo: "tarefa",
        categoria: "LandingPage",
        subtipo: "Pixel/conversão",
        responsavelNome: "Erick",
        statusInicial: "Aguardando etapa anterior",
        bloqueada: true,
      },
      {
        titulo: "Ativar campanha Google Ads",
        tipo: "tarefa",
        categoria: "TrafegoPago",
        subtipo: "Criar campanha",
        responsavelNome: "Gleice",
        statusInicial: "Aguardando etapa anterior",
        bloqueada: true,
      },
    ],
  },
];

/** Procura um responsável pelo primeiro nome (case-insensitive). */
export function findResponsavelIdByNome(
  responsaveis: { id: string; nome: string }[],
  nome: string | null | undefined,
): string | null {
  if (!nome) return null;
  const target = nome.trim().toLowerCase();
  const match = responsaveis.find((r) => {
    const n = (r.nome ?? "").trim().toLowerCase();
    return n === target || n.startsWith(target + " ") || n.split(" ")[0] === target;
  });
  return match?.id ?? null;
}

/** Procura responsável aceitando uma lista de variações de primeiro nome. */
export function findResponsavelIdByNomes(
  responsaveis: { id: string; nome: string }[],
  nomes: string[],
): string | null {
  for (const nome of nomes) {
    const id = findResponsavelIdByNome(responsaveis, nome);
    if (id) return id;
  }
  return null;
}
