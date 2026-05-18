import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

// ===================== Tipos =====================
export type StatusCliente = string; // dinâmico via tabela status_options
export type StatusCard = "ideias" | "Criar" | "Revisar" | "Agendar" | "Postado" | "Renovação" | "Aguardando etapa anterior" | string;
export type TipoAlerta =
  | "Renovacao"
  | "Posts_Pendentes"
  | "Contrato_Finalizando"
  | "Cliente_Pausado"
  | "Sem_Posts_Ativos"
  | "Posts_Atrasados"
  | "Onboarding_Sem_Demanda"
  | "Onboarding_Sem_Post"
  | "Onboarding_Prazo_Vencido";
export type Permissao = "admin" | "editor" | "viewer";
export type ColumnTipo =
  | "texto"
  | "numero"
  | "data"
  | "dropdown"
  | "responsaveis"
  | "link"
  | "status"
  | "etiqueta";

export interface Responsavel {
  id: string;
  nome: string;
  avatar_url?: string;
  cor: string;
  permissao: Permissao;
  email: string;
}

export type StatusClienteGlobal = "Onboarding" | "Ativo" | "Pausado" | "Encerrado";

export interface Cliente {
  id: string;
  nome_cliente: string;
  nicho: string;
  /** Nicho secundário/extra opcional. */
  nicho_extra?: string | null;
  status_cliente: StatusCliente;
  /** Status global do ciclo de vida (Onboarding/Ativo/Pausado/Encerrado) — independente de `status_cliente` */
  status_global: StatusClienteGlobal;
  data_inicio_onboarding: string | null;
  prazo_onboarding: string | null;
  data_ativacao: string | null;
  data_inicio_contrato: string;
  data_fim_contrato: string;
  responsaveis: string[];
  observacoes: string;
  ultimo_comentario: string;
  created_at: string;
  custom: Record<string, any>;
  primary_status?: string;
  /** Plano nominal contratado: Mensal | Trimestral | Semestral | Anual | Personalizado */
  plano?: string | null;
  /** Valor de venda do contrato (R$). */
  valor_venda?: number | null;
  /** Data em que o cliente foi contratado (gerencial, opcional). */
  data_contratacao?: string | null;
  /** Status de relacionamento: Bom | Neutro | Crítico */
  status_relacionamento?: string | null;
  /** Status de performance: Alto | Médio | Baixo */
  status_performance?: string | null;
  /** URL de relatório externo (PowerDash, Recarga Wise, etc.) */
  link_relatorio?: string | null;
}

export interface Contrato {
  id: string;
  cliente_id: string;
  status: "Ativo" | "Renovação" | "Finalizado";
  data_inicio: string;
  data_fim: string;
  total_posts: number;
  posts_concluidos: number;
}

export interface Card {
  id: string;
  cliente_id: string;
  titulo_card: string;
  descricao?: string | null;
  mes_referencia: number;
  numero_semana: number;
  status_card: StatusCard;
  responsaveis: string[];
  responsaveis_postagem?: string[];
    data_agendada?: string | null;
    data_inicio_tarefa?: string | null;
    data_limite_tarefa?: string | null;
    is_urgent?: boolean;
    formato?: string | null;
  qtd_slides?: number | null;
  created_at: string;
}

export interface Post {
  id: string;
  card_id: string;
  titulo_post: string;
  descricao: string;
  data_agendamento?: string;
  data_postagem?: string;
  link_post?: string;
  link_meister?: string;
  status: StatusCard;
  legenda: string;
  anexos: { id: string; nome: string; url: string }[];
  created_at: string;
}

export interface Comentario {
  id: string;
  post_id?: string;
  cliente_id?: string;
  usuario_id: string;
  comentario_texto: string;
  imagem_url?: string;
  created_at: string;
}

export interface Alerta {
  id: string;
  cliente_id: string;
  tipo_alerta: TipoAlerta;
  data_alerta: string;
  status: "Pendente" | "Resolvido";
  mensagem: string;
  created_at: string;
}

export interface CustomField {
  id: string;
  escopo: "cliente" | "post";
  nome: string;
  tipo: "texto" | "numero" | "data" | "dropdown" | "link";
  opcoes?: { label: string; cor: string }[];
  ordem: number;
}

export interface ColumnConfig {
  key: string;
  label: string;
  tipo: ColumnTipo;
  ordem: number;
  oculta: boolean;
  fixada: boolean;
  largura: number;
  cor?: string;
  fixa?: boolean;
  opcoes?: { label: string; cor: string }[];
}

export interface DropdownOption {
  label: string;
  cor: string;
}

export interface ModeloColunas {
  id: string;
  nome: string;
  colunas: ColumnConfig[];
  created_at: string;
}

interface State {
  // dados
  responsaveis: Responsavel[];
  clientes: Cliente[];
  contratos: Contrato[];
  cards: Card[];
  posts: Post[];
  comentarios: Comentario[];
  alertas: Alerta[];
  customFields: CustomField[];
  colunasCliente: ColumnConfig[];
  modelosColunas: ModeloColunas[];
  nichos: DropdownOption[];
  statusOptions: DropdownOption[];
  statusPostOptions: DropdownOption[];
  /** Mapa auth.uid → autor exibível (nome, cor, avatar). Resolvido via profiles.responsavel_id → responsaveis */
  authoresPorAuthId: Record<string, { nome: string; cor: string; avatar_url?: string }>;
  loading: boolean;
  loaded: boolean;
  heavyDataLoading: boolean;
  heavyDataLoaded: boolean;
  /** Última mensagem técnica de erro do carregamento do CRM (apenas diagnóstico). */
  crmError: string | null;
  /** ISO timestamp da última tentativa de _loadAll, para diferenciar "ainda não carregou" de "tentou e falhou". */
  lastLoadAttemptAt: string | null;

  // ações cliente
  addCliente: (
    data: Omit<Cliente, "id" | "created_at" | "ultimo_comentario" | "custom" | "status_global" | "data_inicio_onboarding" | "prazo_onboarding" | "data_ativacao"> & {
      status_global?: StatusClienteGlobal;
      data_inicio_onboarding?: string | null;
      prazo_onboarding?: string | null;
      data_ativacao?: string | null;
    },
  ) => Promise<string>;
  updateCliente: (id: string, patch: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;

  addResponsavel: (r: Omit<Responsavel, "id">) => string;
  updateResponsavel: (id: string, patch: Partial<Responsavel>) => Promise<void>;
  deleteResponsavel: (id: string) => Promise<void>;

  moveCard: (cardId: string, novoStatus: StatusCard) => Promise<void>;
  updateCard: (id: string, patch: Partial<Card>) => Promise<void>;
  updatePost: (id: string, patch: Partial<Post>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  iniciarTarefa: (
    cardId: string,
    payload: { responsaveis: string[]; data_agendada?: string | null; titulo?: string; descricao?: string | null; formato?: string | null; qtd_slides?: number | null },
  ) => Promise<void>;
  createCardRascunho: (payload: { cliente_id: string; mes_referencia?: number }) => Promise<{ cardId: string; postId: string } | null>;

  addComentario: (c: Omit<Comentario, "id" | "created_at">) => Promise<string | null>;
  updateComentario: (
    id: string,
    patch: Partial<Pick<Comentario, "comentario_texto" | "imagem_url">>,
  ) => Promise<void>;
  deleteComentario: (id: string) => Promise<void>;

  resolverAlerta: (id: string) => Promise<void>;

  addColumn: (col: Omit<ColumnConfig, "ordem">) => Promise<void>;
  updateColumn: (key: string, patch: Partial<ColumnConfig>) => Promise<void>;
  deleteColumn: (key: string) => Promise<void>;
  reorderColumns: (keys: string[]) => Promise<void>;
  saveModeloColunas: (nome: string) => Promise<void>;
  applyModeloColunas: (id: string) => Promise<void>;
  deleteModeloColunas: (id: string) => Promise<void>;

  addCustomField: (f: Omit<CustomField, "id" | "ordem">) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;

  addNicho: (n: DropdownOption) => Promise<boolean>;
  updateNicho: (oldLabel: string, patch: Partial<DropdownOption>) => Promise<number>;
  deleteNicho: (label: string) => Promise<number>;
  addStatusOption: (s: DropdownOption) => Promise<boolean>;
  updateStatusOption: (oldLabel: string, patch: Partial<DropdownOption>) => Promise<number>;
  deleteStatusOption: (label: string) => Promise<number>;
  reorderStatusOptions: (labels: string[]) => Promise<void>;
  addStatusPostOption: (s: DropdownOption) => Promise<boolean>;
  updateStatusPostOption: (oldLabel: string, patch: Partial<DropdownOption>) => Promise<number>;
  deleteStatusPostOption: (label: string) => Promise<number>;
  reorderStatusPostOptions: (labels: string[]) => Promise<void>;

  addAtividade: (args: {
    clienteId: string;
    acao: string;
    descricao: string;
    refId?: string;
    tipo?: "post" | "demanda" | "Gerencial";
    area?: string;
    titulo_tarefa?: string;
    payload?: any;
  }) => Promise<void>;
  createCicloPosts: (payload: { cliente_id: string; tipo: "mensal" | "trimestral" | "semestral"; observacao?: string; criar_alerta?: boolean }) => Promise<void>;
  // internas
  _loadAll: () => Promise<void>;
  _scheduleReload: () => void;
}

const today = () => new Date().toISOString();

// calcula meses entre duas datas ISO (clamp 1–6)
export function mesesEntre(inicioISO: string, fimISO: string): number {
  const ini = new Date(inicioISO);
  const fim = new Date(fimISO);
  if (isNaN(ini.getTime()) || isNaN(fim.getTime())) return 3;
  const meses = (fim.getFullYear() - ini.getFullYear()) * 12 + (fim.getMonth() - ini.getMonth());
  return Math.max(1, Math.min(6, meses || 1));
}

// ===================== Mappers DB → App =====================
function mapCliente(
  row: any,
  contratos: any[],
  comentarios: Comentario[],
  responsaveis: Responsavel[],
  authoresPorAuthId: Record<string, { nome: string; cor: string; avatar_url?: string }> = {},
): Cliente {
  const contrato = contratos.find((c) => c.cliente_id === row.id);
  const comsCliente = comentarios.filter((c) => c.cliente_id === row.id);
  let ultimo = "";
  if (comsCliente.length > 0) {
    const u = comsCliente.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    const autor =
      authoresPorAuthId[u.usuario_id]?.nome ??
      responsaveis.find((r) => r.id === u.usuario_id)?.nome ??
      "Usuário";
    const trecho = u.comentario_texto.replace(/<[^>]+>/g, "").slice(0, 60);
    const data = new Date(u.created_at).toLocaleDateString("pt-BR");
    ultimo = `${autor}: ${trecho} — ${data}`;
  }
  return {
    id: row.id,
    nome_cliente: row.nome ?? "",
    nicho: row.nicho ?? "",
    // Unificado: ambos refletem o ciclo de vida (Onboarding/Ativo/Pausado/Encerrado)
    status_cliente: (row.status_cliente as StatusClienteGlobal) ?? "Onboarding",
    status_global: (row.status_cliente as StatusClienteGlobal) ?? "Onboarding",
    data_inicio_onboarding: row.data_inicio_onboarding ?? null,
    prazo_onboarding: row.prazo_onboarding ?? null,
    data_ativacao: row.data_ativacao ?? null,
    data_inicio_contrato: contrato?.data_inicio ?? "",
    data_fim_contrato: contrato?.data_fim ?? "",
    responsaveis: row.responsaveis_ids ?? [],
    observacoes: row.descricao ?? "",
    ultimo_comentario: ultimo,
    created_at: row.created_at,
    custom: row.campos_personalizados ?? {},
    primary_status: row.primary_status ?? "Criar",
    plano: row.plano ?? null,
    valor_venda: row.valor_venda ?? null,
    nicho_extra: row.nicho_extra ?? null,
    data_contratacao: row.data_contratacao ?? null,
    status_relacionamento: row.status_relacionamento ?? null,
    status_performance: row.status_performance ?? null,
    link_relatorio: row.link_relatorio ?? null,
  };
}

function mapContrato(row: any): Contrato {
  return {
    id: row.id,
    cliente_id: row.cliente_id,
    status: row.status,
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    total_posts: row.total_posts ?? 0,
    posts_concluidos: row.posts_concluidos ?? 0,
  };
}

function mapResponsavel(row: any): Responsavel {
  return {
    id: row.id,
    nome: row.nome,
    avatar_url: row.avatar_url ?? undefined,
    cor: row.cor ?? "#6366f1",
    permissao: row.permissao ?? "editor",
    email: row.email ?? "",
  };
}

function mapColuna(row: any): ColumnConfig {
  return {
    key: row.key,
    label: row.label,
    tipo: row.tipo,
    ordem: row.ordem,
    oculta: row.oculta,
    fixada: row.fixada,
    largura: row.largura ?? 150,
    cor: row.cor ?? undefined,
    fixa: row.fixa,
    opcoes: row.opcoes ?? [],
  };
}

function mapModelo(row: any): ModeloColunas {
  return {
    id: row.id,
    nome: row.nome,
    colunas: (row.colunas ?? []) as ColumnConfig[],
    created_at: row.created_at,
  };
}

function mapStatusOpt(row: any): DropdownOption {
  return { label: row.label, cor: row.cor };
}

function mapNicho(row: any): DropdownOption {
  return { label: row.label, cor: row.cor };
}

function mapCard(row: any): Card {
  const pos = row.posicao ?? 0;
  return {
    id: row.id,
    cliente_id: row.cliente_id,
    titulo_card: row.titulo,
    descricao: row.descricao ?? "",
    mes_referencia: Math.floor(pos / 4) + 1,
    numero_semana: (pos % 4) + 1,
    status_card: row.status,
    responsaveis: row.responsaveis_ids ?? [],
    responsaveis_postagem: row.responsaveis_postagem_ids ?? [],
    data_agendada: row.data_agendada ?? null,
    data_inicio_tarefa: row.data_inicio_tarefa ?? null,
    data_limite_tarefa: row.data_limite_tarefa ?? null,
    is_urgent: row.is_urgent ?? false,
    formato: row.formato ?? null,
    qtd_slides: row.qtd_slides ?? null,
    created_at: row.created_at,
  };
}

function mapPost(row: any): Post {
  return {
    id: row.id,
    card_id: row.card_id,
    titulo_post: row.titulo ?? "",
    descricao: "",
    legenda: row.legenda ?? "",
    anexos: row.anexos ?? [],
    status: row.status,
    data_agendamento: row.data_agendamento ?? undefined,
    data_postagem: row.data_postagem ?? undefined,
    link_post: row.link_post ?? undefined,
    link_meister: row.link_meister ?? undefined,
    created_at: row.created_at,
  };
}

function mapComentario(row: any): Comentario {
  return {
    id: row.id,
    post_id: row.post_id ?? undefined,
    cliente_id: row.cliente_id ?? undefined,
    usuario_id: row.usuario_id,
    comentario_texto: row.comentario_texto,
    imagem_url: row.imagem_url ?? undefined,
    created_at: row.created_at,
  };
}

function mapAlerta(row: any): Alerta {
  return {
    id: row.id,
    cliente_id: row.cliente_id,
    tipo_alerta: row.tipo_alerta,
    data_alerta: row.data_alerta,
    status: row.status,
    mensagem: row.mensagem,
    created_at: row.created_at,
  };
}

function mapCustomField(row: any): CustomField {
  return {
    id: row.id,
    escopo: row.escopo,
    nome: row.nome,
    tipo: row.tipo,
    opcoes: row.opcoes ?? [],
    ordem: row.ordem,
  };
}

// ===================== Store =====================
let realtimeStarted = false;
let _reloadTimer: ReturnType<typeof setTimeout> | null = null;

export const useCRM = create<State>()((set, get) => ({
  responsaveis: [],
  clientes: [],
  contratos: [],
  cards: [],
  posts: [],
  comentarios: [],
  alertas: [],
  customFields: [],
  colunasCliente: [],
  modelosColunas: [],
  nichos: [],
  statusOptions: [],
  statusPostOptions: [],
  authoresPorAuthId: {},
  loading: false,
  loaded: false,
  heavyDataLoading: false,
  heavyDataLoaded: false,
  crmError: null,
  lastLoadAttemptAt: null,

  _loadAll: async () => {
    if (get().loading) return;
    set({ loading: true, crmError: null, lastLoadAttemptAt: new Date().toISOString() });

    // Detecta erros transitórios de Supabase/PostgREST (PGRST002, 503, 504, Failed to fetch, timeout local).
    const isTransient = (err: any): boolean => {
      if (!err) return false;
      const code = String(err.code ?? "").toUpperCase();
      const msg = String(err.message ?? err).toLowerCase();
      const status = Number(err.status ?? err.statusCode ?? 0);
      if (code === "PGRST002") return true;
      if (status === 503 || status === 504) return true;
      if (msg.includes("failed to fetch")) return true;
      if (msg.includes("timeout")) return true;
      if (msg.includes("network")) return true;
      if (msg.includes("503") || msg.includes("504")) return true;
      if (msg.includes("could not query the database for the schema cache")) return true;
      return false;
    };

    // Timeout/retry por query individual — não deixa uma tabela lenta travar as outras.
    // Diferencia { transient: true } (erro transitório → preservar dados em memória) de
    // { transient: false } (erro definitivo → tratar como vazio).
    const safe = async <T,>(
      label: string,
      run: () => PromiseLike<{ data: T[] | null; error: any }>,
      ms = 15000,
    ): Promise<{ data: T[]; error: any; transient: boolean }> => {
      const attempt = async (): Promise<{ data: T[] | null; error: any }> => {
        try {
          return await Promise.race([
            Promise.resolve(run()),
            new Promise<{ data: null; error: any }>((resolve) =>
              setTimeout(
                () => resolve({ data: null, error: new Error(`timeout ${ms}ms`) }),
                ms,
              ),
            ),
          ]);
        } catch (err) {
          return { data: null, error: err };
        }
      };

      let res = await attempt();
      if (res.error && isTransient(res.error)) {
        // 1 retry curto após 800ms para erros transitórios (PGRST002/503/504/network).
        await new Promise((r) => setTimeout(r, 800));
        res = await attempt();
      }

      if (res.error) {
        const transient = isTransient(res.error);
        const e: any = res.error;
        // Log técnico real (tabela, code, message, details, hint)
        // eslint-disable-next-line no-console
        console.error(`[crm] erro ao carregar ${label}`, {
          tabela: label,
          code: e?.code ?? null,
          message: e?.message ?? String(e),
          details: e?.details ?? null,
          hint: e?.hint ?? null,
          transient,
        });
        return { data: [], error: res.error, transient };
      }
      return { data: (res.data as T[]) ?? [], error: null, transient: false };
    };

    let clientesRowsRef: any[] = [];
    let contratosRowsRef: any[] = [];
    let responsaveisRef: Responsavel[] = [];
    let authoresRef: Record<string, { nome: string; cor: string; avatar_url?: string }> = {};

    try {
      const [
        responsaveisRes,
        clientesRes,
        contratosRes,
        colunasRes,
        modelosRes,
        statusRes,
        nichosRes,
        statusPostRes,
        profilesRes,
        customFieldsRes,
      ] = await Promise.all([
        safe<any>("responsaveis", () => supabase.from("responsaveis").select("*").order("nome")),
        safe<any>("clientes", () => supabase.from("clientes").select("*").order("created_at", { ascending: false })),
        safe<any>("contratos", () => supabase.from("contratos").select("*")),
        safe<any>("colunas_cliente", () => supabase.from("colunas_cliente").select("*").order("ordem")),
        safe<any>("modelos_colunas", () => supabase.from("modelos_colunas").select("*").order("created_at")),
        safe<any>("status_options", () => supabase.from("status_options").select("*").order("ordem", { ascending: true })),
        safe<any>("nichos", () => supabase.from("nichos").select("*").order("label")),
        safe<any>("status_post_options", () => supabase.from("status_post_options").select("*").order("ordem", { ascending: true })),
        safe<any>("profiles", () => supabase.from("profiles").select("id,nome,email,avatar_url,responsavel_id")),
        safe<any>("custom_fields", () => supabase.from("custom_fields").select("*").order("ordem")),
      ]);

      // Estado atual: usado para preservar dados em memória quando a falha é transitória.
      const cur = get();

      // Helper: escolhe o resultado novo OU mantém o atual quando a falha é transitória
      // e já havia dados carregados (evita "zerar falso" no Dashboard).
      const pickRows = <R,>(res: { data: any[]; error: any; transient: boolean }, current: R[]): { rows: any[]; keepCurrent: boolean } => {
        if (res.error && res.transient && current.length > 0) {
          return { rows: [], keepCurrent: true };
        }
        return { rows: res.data, keepCurrent: false };
      };

      // Responsáveis
      const respPick = pickRows(responsaveisRes, cur.responsaveis);
      const responsaveis = respPick.keepCurrent ? cur.responsaveis : respPick.rows.map(mapResponsavel);

      // Contratos
      const contratosPick = pickRows(contratosRes, cur.contratos);
      const contratos = contratosPick.keepCurrent ? cur.contratos : contratosPick.rows.map(mapContrato);
      contratosRowsRef = contratosPick.keepCurrent
        ? cur.contratos.map((c) => ({
            id: c.id,
            cliente_id: c.cliente_id,
            status: c.status,
            data_inicio: c.data_inicio,
            data_fim: c.data_fim,
            total_posts: c.total_posts,
            posts_concluidos: c.posts_concluidos,
          }))
        : contratosRes.data;

      responsaveisRef = responsaveis;

      // Profiles → autores (não precisamos preservar; é apenas mapa de UI)
      const authoresPorAuthId: Record<string, { nome: string; cor: string; avatar_url?: string }> = {};
      const profilesSource = profilesRes.error && profilesRes.transient
        ? Object.entries(cur.authoresPorAuthId).map(([id, a]) => ({ id, nome: a.nome, email: "", avatar_url: a.avatar_url, responsavel_id: null }))
        : profilesRes.data;
      for (const p of profilesSource) {
        const resp = p.responsavel_id ? responsaveis.find((r) => r.id === p.responsavel_id) : undefined;
        authoresPorAuthId[p.id] = {
          nome: resp?.nome ?? p.nome ?? p.email ?? "Usuário",
          cor: resp?.cor ?? "#6366f1",
          avatar_url: resp?.avatar_url ?? p.avatar_url ?? undefined,
        };
      }
      authoresRef = authoresPorAuthId;

      // Clientes: a tabela crítica. Se falha transitória e já havia clientes, preserva.
      const clientesTransientKeep = clientesRes.error && clientesRes.transient && cur.clientes.length > 0;
      let clientes: Cliente[];
      if (clientesTransientKeep) {
        clientes = cur.clientes;
        clientesRowsRef = cur.clientes.map((c) => ({
          id: c.id,
          nome: c.nome_cliente,
          nicho: c.nicho,
          descricao: c.observacoes,
          status_cliente: c.status_cliente,
          data_inicio_onboarding: c.data_inicio_onboarding,
          prazo_onboarding: c.prazo_onboarding,
          data_ativacao: c.data_ativacao,
          responsaveis_ids: c.responsaveis,
          campos_personalizados: c.custom,
          created_at: c.created_at,
          primary_status: c.primary_status,
          plano: c.plano,
          valor_venda: c.valor_venda,
          nicho_extra: c.nicho_extra,
          data_contratacao: c.data_contratacao,
          status_relacionamento: c.status_relacionamento,
          status_performance: c.status_performance,
          link_relatorio: c.link_relatorio,
        }));
      } else {
        clientesRowsRef = clientesRes.data;
        clientes = clientesRowsRef.map((r) =>
          mapCliente(r, contratosRowsRef, [], responsaveis, authoresPorAuthId),
        );
      }

      // Tabelas auxiliares: se falha transitória e já tínhamos dados, preservar.
      const colunasPick = pickRows(colunasRes, cur.colunasCliente);
      const modelosPick = pickRows(modelosRes, cur.modelosColunas);
      const statusPick = pickRows(statusRes, cur.statusOptions);
      const nichosPick = pickRows(nichosRes, cur.nichos);
      const statusPostPick = pickRows(statusPostRes, cur.statusPostOptions);
      const customFieldsPick = pickRows(customFieldsRes, cur.customFields);

      const statusPostOptions = statusPostPick.keepCurrent
        ? cur.statusPostOptions
        : [
            { label: "Aguardando etapa anterior", cor: "#f59e0b" },
            ...statusPostPick.rows.map(mapStatusOpt).filter((o) => o.label !== "Aguardando etapa anterior"),
          ];

      set({
        responsaveis,
        clientes,
        contratos,
        colunasCliente: colunasPick.keepCurrent ? cur.colunasCliente : colunasPick.rows.map(mapColuna),
        modelosColunas: modelosPick.keepCurrent ? cur.modelosColunas : modelosPick.rows.map(mapModelo),
        statusOptions: statusPick.keepCurrent ? cur.statusOptions : statusPick.rows.map(mapStatusOpt),
        nichos: nichosPick.keepCurrent ? cur.nichos : nichosPick.rows.map(mapNicho),
        statusPostOptions,
        authoresPorAuthId,
        customFields: customFieldsPick.keepCurrent ? cur.customFields : customFieldsPick.rows.map(mapCustomField),
        loaded: true,
      });

      // Mensagem só quando é primeira carga E clientes falhou (não há nada em tela).
      if (clientesRes.error) {
        const e: any = clientesRes.error;
        const technical = `[clientes] ${e?.code ?? ""} ${e?.message ?? e}`.trim();
        set({ crmError: technical });
        if (!clientesTransientKeep) {
          toast.error("Não foi possível carregar os clientes. Verifique sua conexão.");
        } else {
          // Falha transitória mas há dados em memória → não polui a UI; só registra.
          console.warn("[crm] falha transitória em clientes — mantendo dados em memória.");
        }
      }
    } catch (err) {
      console.error("[crm] Falha no carregamento essencial:", err);
      set({ crmError: String((err as any)?.message ?? err) });
      // Só exibe toast quando não há dados em memória
      if (get().clientes.length === 0) {
        toast.error("Falha ao carregar dados do CRM. Verifique sua conexão e tente recarregar.");
      }
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }


    // 2. Carrega dados PESADOS em segundo plano (Cards, Posts, Comentários, Alertas)
    if (get().heavyDataLoading || get().heavyDataLoaded) return;
    set({ heavyDataLoading: true });
    try {
      const fetchAll = async (
        table: "cards" | "posts" | "comentarios",
        orderBy?: { column: string; ascending?: boolean },
      ): Promise<{ data: any[]; error: any }> => {
        const PAGE = 1000;
        const all: any[] = [];
        let from = 0;
        while (true) {
          let q = supabase.from(table).select("*").range(from, from + PAGE - 1);
          if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
          const { data, error } = await q;
          if (error) return { data: all, error };
          const rows = data ?? [];
          all.push(...rows);
          if (rows.length < PAGE) break;
          from += PAGE;
        }
        return { data: all, error: null };
      };

      const withTimeoutP = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
        ]);

      const [cardsRes, postsRes, comentariosRes, alertasRes] = await withTimeoutP(
        Promise.all([
          fetchAll("cards", { column: "posicao", ascending: true }),
          fetchAll("posts"),
          fetchAll("comentarios", { column: "created_at", ascending: true }),
          supabase.from("alertas").select("*").order("created_at", { ascending: false }).then(
            (r) => ({ data: r.data ?? [], error: r.error }),
          ),
        ]),
        45000,
        [
          { data: [], error: new Error("timeout") },
          { data: [], error: new Error("timeout") },
          { data: [], error: new Error("timeout") },
          { data: [], error: new Error("timeout") },
        ] as any,
      );
      // Detecta erro transitório por resultado de cada fetch (PGRST002/503/504/timeout/network).
      const isTransientLite = (err: any) => {
        if (!err) return false;
        const code = String(err.code ?? "").toUpperCase();
        const msg = String(err.message ?? err).toLowerCase();
        return (
          code === "PGRST002" ||
          msg.includes("failed to fetch") ||
          msg.includes("timeout") ||
          msg.includes("network") ||
          msg.includes("503") ||
          msg.includes("504") ||
          msg.includes("schema cache")
        );
      };

      const cur = get();
      const cardsTransient = cardsRes.error && isTransientLite(cardsRes.error) && cur.cards.length > 0;
      const postsTransient = postsRes.error && isTransientLite(postsRes.error) && cur.posts.length > 0;
      const comentariosTransient =
        comentariosRes.error && isTransientLite(comentariosRes.error) && cur.comentarios.length > 0;
      const alertasTransient =
        alertasRes.error && isTransientLite(alertasRes.error) && cur.alertas.length > 0;

      const comentarios = comentariosTransient ? cur.comentarios : (comentariosRes.data ?? []).map(mapComentario);
      const cards = cardsTransient ? cur.cards : (cardsRes.data ?? []).map(mapCard);
      const posts = postsTransient ? cur.posts : (postsRes.data ?? []).map(mapPost);
      const alertas = alertasTransient ? cur.alertas : (alertasRes.data ?? []).map(mapAlerta);

      // Re-mapeia clientes agora que temos os comentários (apenas se o ref de clientes está válido)
      const clientesAtualizados =
        clientesRowsRef.length > 0
          ? clientesRowsRef.map((r) => mapCliente(r, contratosRowsRef, comentarios, responsaveisRef, authoresRef))
          : cur.clientes;

      // heavyDataLoaded só vira true se NÃO houve falha transitória pendente —
      // assim o realtime/scheduleReload pode tentar novamente mais tarde.
      const anyTransient = cardsTransient || postsTransient || comentariosTransient || alertasTransient
        || (cardsRes.error && !cur.cards.length) || (postsRes.error && !cur.posts.length);

      set({
        cards,
        posts,
        comentarios,
        alertas,
        clientes: clientesAtualizados,
        heavyDataLoaded: !anyTransient,
      });

      if (cardsRes.error || postsRes.error || comentariosRes.error || alertasRes.error) {
        console.warn("[crm] carregamento pesado parcial/transitório:", {
          cards: cardsRes.error?.message,
          posts: postsRes.error?.message,
          comentarios: comentariosRes.error?.message,
          alertas: alertasRes.error?.message,
        });
      }
    } catch (err) {
      console.error("[crm] Falha no carregamento pesado:", err);
    } finally {
      set({ heavyDataLoading: false });
    }
  },


  /**
   * Agenda um reload completo com debounce de 600ms.
   * Múltiplas chamadas seguidas (ex: várias mutações ou bursts de realtime)
   * colapsam em uma única recarga, evitando o "loop de sincronização".
   */
  _scheduleReload: () => {
    if (_reloadTimer) clearTimeout(_reloadTimer);
    _reloadTimer = setTimeout(() => {
      _reloadTimer = null;
      const s = get();
      // Evita reentrância: se já está carregando essencial ou pesado, re-agenda.
      if (s.loading || s.heavyDataLoading) {
        _reloadTimer = setTimeout(() => {
          _reloadTimer = null;
          void get()._loadAll();
        }, 1200);
        return;
      }
      void get()._loadAll();
    }, 600);
  },


  addCliente: async (data) => {
    const { data: inserted, error } = await supabase
      .from("clientes")
      .insert({
        nome: data.nome_cliente,
        nicho: data.nicho || null,
        status: (data.status_global ?? data.status_cliente ?? "Onboarding") as any,
        status_cliente: (data.status_global ?? data.status_cliente ?? "Onboarding") as any,
        data_inicio_onboarding:
          data.data_inicio_onboarding ?? new Date().toISOString(),
        prazo_onboarding: data.prazo_onboarding ?? null,
        data_ativacao: data.data_ativacao ?? null,
        responsaveis_ids: data.responsaveis ?? [],
        descricao: data.observacoes ?? "",
        campos_personalizados: {},
        plano: (data as any).plano ?? null,
        valor_venda: (data as any).valor_venda ?? null,
        nicho_extra: (data as any).nicho_extra ?? null,
      } as any)
      .select()
      .single();
    if (error || !inserted) {
      toast.error(error?.message ?? "Falha ao criar cliente");
      throw error ?? new Error("Falha ao criar cliente");
    }

    let meses = 3;
    if (data.data_inicio_contrato && data.data_fim_contrato) {
      meses = mesesEntre(data.data_inicio_contrato, data.data_fim_contrato);
      const { error: cErr } = await supabase.from("contratos").insert({
        cliente_id: inserted.id,
        status: "Ativo",
        data_inicio: data.data_inicio_contrato,
        data_fim: data.data_fim_contrato,
        total_posts: meses * 4,
        posts_concluidos: 0,
      });
      if (cErr) toast.error(`Cliente criado, mas o contrato falhou: ${cErr.message}`);
    }

    // Gera automaticamente meses × 4 cards (um por semana) + posts correspondentes
    const statusInicial = get().statusPostOptions.find((o) => o.label === "Planejamento")?.label ?? "Planejamento";
    const cardsPayload = [] as any[];
    for (let m = 1; m <= meses; m++) {
      for (let s = 1; s <= 4; s++) {
        cardsPayload.push({
          cliente_id: inserted.id,
          titulo: `Post Mês ${m} - Semana ${s}`,
          status: statusInicial,
          posicao: (m - 1) * 4 + (s - 1),
          responsaveis_ids: data.responsaveis ?? [],
        });
      }
    }
    const { data: cardsInseridos, error: cardsErr } = await supabase
      .from("cards")
      .insert(cardsPayload)
      .select();
    if (cardsErr) {
      toast.error(`Cliente criado, mas os cards falharam: ${cardsErr.message}`);
    } else if (cardsInseridos && cardsInseridos.length > 0) {
      const postsPayload = cardsInseridos.map((c: any) => ({
        card_id: c.id,
        titulo: c.titulo,
        status: c.status,
      }));
      const { error: postsErr } = await supabase.from("posts").insert(postsPayload);
      if (postsErr) toast.error(`Cards criados, mas os posts falharam: ${postsErr.message}`);
    }

    // ===== Aplicar documentos padrão da empresa (Configurações > Documentos) =====
    try {
      const { data: globais } = await supabase
        .from("documentos_globais" as any)
        .select("*")
        .eq("escopo", "cliente")
        .eq("ativo", true)
        .eq("aplicar_automatico", true)
        .order("ordem", { ascending: true });
      if (globais && globais.length > 0) {
        const docsPayload = (globais as any[]).map((g, i) => ({
          cliente_id: inserted.id,
          bloco: g.bloco ?? "materiais",
          tipo: g.tipo ?? "material",
          titulo: g.titulo,
          url: g.url ?? null,
          login: g.login ?? null,
          senha: g.senha ?? null,
          observacao: g.descricao ?? null,
          formato: null,
          data_evento: null,
          enviado_por: null,
          ordem: i,
          origem_global_id: g.id,
        }));
        const { error: docsErr } = await supabase
          .from("cliente_documentacao")
          .insert(docsPayload as any);
        if (docsErr) console.warn("Falha ao aplicar documentos padrão:", docsErr.message);
      }
    } catch (e) {
      console.warn("Erro inesperado ao aplicar documentos padrão", e);
    }

    // ===== Aplicar estrutura operacional automática (templates) =====
    try {
      const { gerarEstruturaOperacional } = await import("@/store/operationalTemplates");
      const n = await gerarEstruturaOperacional(inserted.id);
      if (n > 0) {
        console.info(`[onboarding] ${n} cards operacionais criados para o cliente ${inserted.id}`);
      }
    } catch (e) {
      console.warn("Falha ao gerar estrutura operacional automática", e);
    }

    get()._scheduleReload();
    return inserted.id;
  },

  updateCliente: async (id, patch) => {
    const dbPatch: any = {};
    if (patch.nome_cliente !== undefined) dbPatch.nome = patch.nome_cliente;
    if (patch.nicho !== undefined) dbPatch.nicho = patch.nicho || null;
    if (patch.responsaveis !== undefined) dbPatch.responsaveis_ids = patch.responsaveis;
    if (patch.observacoes !== undefined) dbPatch.descricao = patch.observacoes;
    if (patch.custom !== undefined) dbPatch.campos_personalizados = patch.custom;
    if ((patch as any).plano !== undefined) dbPatch.plano = (patch as any).plano ?? null;
    if ((patch as any).valor_venda !== undefined) dbPatch.valor_venda = (patch as any).valor_venda ?? null;
    if ((patch as any).nicho_extra !== undefined) dbPatch.nicho_extra = (patch as any).nicho_extra ?? null;
    if ((patch as any).data_contratacao !== undefined) dbPatch.data_contratacao = (patch as any).data_contratacao || null;
    if ((patch as any).status_relacionamento !== undefined) dbPatch.status_relacionamento = (patch as any).status_relacionamento || null;
    if ((patch as any).status_performance !== undefined) dbPatch.status_performance = (patch as any).status_performance || null;
    if ((patch as any).link_relatorio !== undefined) dbPatch.link_relatorio = (patch as any).link_relatorio || null;
    // Unificado: status_cliente e status_global são o mesmo campo (ciclo de vida)
    const novoStatusUnificado =
      (patch as any).status_global ?? (patch.status_cliente as any);
    if (novoStatusUnificado !== undefined) {
      const novoStatus = novoStatusUnificado as StatusClienteGlobal;
      dbPatch.status = novoStatus;
      dbPatch.status_cliente = novoStatus;
      const cur = get().clientes.find((c) => c.id === id);
      if (novoStatus === "Ativo" && cur && !cur.data_ativacao) {
        dbPatch.data_ativacao = new Date().toISOString();
      }
    }
    if ((patch as any).data_inicio_onboarding !== undefined)
      dbPatch.data_inicio_onboarding = (patch as any).data_inicio_onboarding;
    if ((patch as any).prazo_onboarding !== undefined)
      dbPatch.prazo_onboarding = (patch as any).prazo_onboarding;
    if ((patch as any).data_ativacao !== undefined)
      dbPatch.data_ativacao = (patch as any).data_ativacao;
    if (Object.keys(dbPatch).length > 0) {
      await supabase.from("clientes").update(dbPatch).eq("id", id);
    }
    if (patch.data_inicio_contrato !== undefined || patch.data_fim_contrato !== undefined) {
      const cur = get().contratos.find((c) => c.cliente_id === id);
      const inicio = patch.data_inicio_contrato ?? cur?.data_inicio;
      const fim = patch.data_fim_contrato ?? cur?.data_fim;
      if (cur && inicio && fim) {
        await supabase.from("contratos").update({ data_inicio: inicio, data_fim: fim }).eq("id", cur.id);
      }
    }
    get()._scheduleReload();
  },

  deleteCliente: async (id) => {
    await supabase.from("contratos").delete().eq("cliente_id", id);
    await supabase.from("alertas").delete().eq("cliente_id", id);
    const cardsCli = get().cards.filter((c) => c.cliente_id === id).map((c) => c.id);
    if (cardsCli.length > 0) {
      await supabase.from("posts").delete().in("card_id", cardsCli);
      await supabase.from("cards").delete().eq("cliente_id", id);
    }
    await supabase.from("clientes").delete().eq("id", id);
    get()._scheduleReload();
  },

  // ============= Responsáveis =============
  addResponsavel: (r) => {
    const tempId = crypto.randomUUID();
    set((s) => ({ responsaveis: [...s.responsaveis, { ...r, id: tempId }] }));
    supabase
      .from("responsaveis")
      .insert({
        nome: r.nome,
        cor: r.cor,
        permissao: r.permissao,
        email: r.email && r.email.trim() ? r.email.trim() : null,
        avatar_url: r.avatar_url ?? null,
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao salvar responsável:", error);
          // remove o item otimista para refletir falha
          set((s) => ({ responsaveis: s.responsaveis.filter((x) => x.id !== tempId) }));
          import("sonner").then(({ toast }) =>
            toast.error(`Não foi possível salvar: ${error.message}`)
          );
          return;
        }
        if (data) {
          set((s) => ({
            responsaveis: s.responsaveis.map((x) => (x.id === tempId ? mapResponsavel(data) : x)),
          }));
        }
      });
    return tempId;
  },

  updateResponsavel: async (id, patch) => {
    const dbPatch: any = {};
    if (patch.nome !== undefined) dbPatch.nome = patch.nome;
    if (patch.cor !== undefined) dbPatch.cor = patch.cor;
    if (patch.permissao !== undefined) dbPatch.permissao = patch.permissao;
    if (patch.email !== undefined) dbPatch.email = patch.email;
    if (patch.avatar_url !== undefined) dbPatch.avatar_url = patch.avatar_url;
    await supabase.from("responsaveis").update(dbPatch).eq("id", id);
    get()._scheduleReload();
  },

  deleteResponsavel: async (id) => {
    await supabase.from("responsaveis").delete().eq("id", id);
    get()._scheduleReload();
  },

  // ============= Cards / Posts =============
  moveCard: async (cardId, novoStatus) => {
    const prev = get().cards.find(c => c.id === cardId);
    if (!prev) return;

    // Patch otimista local — UI responde imediatamente
    set({ cards: get().cards.map(c => c.id === cardId ? { ...c, status_card: novoStatus } : c) });

    await supabase.from("cards").update({ status: novoStatus as any }).eq("id", cardId);

    if (novoStatus !== prev.status_card) {
      void get().addAtividade({
        clienteId: prev.cliente_id,
        acao: "status",
        descricao: `Status alterado: ${prev.status_card} → ${novoStatus}`,
        refId: cardId,
        tipo: "post",
        area: "Posts",
        titulo_tarefa: prev.titulo_card,
        payload: { de: prev.status_card, para: novoStatus }
      });
    }

    get()._scheduleReload();
  },

  updateCard: async (id, patch) => {
    const prev = get().cards.find(c => c.id === id);
    if (!prev) return;

    const dbPatch: any = {};
    if (patch.titulo_card !== undefined) dbPatch.titulo = patch.titulo_card;
    if ((patch as any).descricao !== undefined) dbPatch.descricao = (patch as any).descricao;
    if (patch.status_card !== undefined) dbPatch.status = patch.status_card;
    if (patch.responsaveis !== undefined) dbPatch.responsaveis_ids = patch.responsaveis;
    if ((patch as any).responsaveis_postagem !== undefined) dbPatch.responsaveis_postagem_ids = (patch as any).responsaveis_postagem;
    if ((patch as any).data_agendada !== undefined) dbPatch.data_agendada = (patch as any).data_agendada;
    if (patch.data_inicio_tarefa !== undefined) dbPatch.data_inicio_tarefa = patch.data_inicio_tarefa || null;
    if (patch.data_limite_tarefa !== undefined) dbPatch.data_limite_tarefa = patch.data_limite_tarefa || null;
    if ((patch as any).is_urgent !== undefined) dbPatch.is_urgent = (patch as any).is_urgent;
    if ((patch as any).formato !== undefined) dbPatch.formato = (patch as any).formato;
    if ((patch as any).qtd_slides !== undefined) dbPatch.qtd_slides = (patch as any).qtd_slides;
    // Patch otimista local — UI responde imediatamente
    set({
      cards: get().cards.map(c => c.id === id ? {
        ...c,
        ...(patch.titulo_card !== undefined ? { titulo_card: patch.titulo_card } : {}),
        ...((patch as any).descricao !== undefined ? { descricao: (patch as any).descricao } : {}),
        ...(patch.status_card !== undefined ? { status_card: patch.status_card } : {}),
        ...(patch.responsaveis !== undefined ? { responsaveis: patch.responsaveis } : {}),
        ...((patch as any).responsaveis_postagem !== undefined ? { responsaveis_postagem: (patch as any).responsaveis_postagem } : {}),
        ...((patch as any).data_agendada !== undefined ? { data_agendada: (patch as any).data_agendada } : {}),
        ...(patch.data_inicio_tarefa !== undefined ? { data_inicio_tarefa: patch.data_inicio_tarefa || null } : {}),
        ...(patch.data_limite_tarefa !== undefined ? { data_limite_tarefa: patch.data_limite_tarefa || null } : {}),
        ...((patch as any).is_urgent !== undefined ? { is_urgent: (patch as any).is_urgent } : {}),
        ...((patch as any).formato !== undefined ? { formato: (patch as any).formato } : {}),
        ...((patch as any).qtd_slides !== undefined ? { qtd_slides: (patch as any).qtd_slides } : {}),
      } : c)
    });
    await supabase.from("cards").update(dbPatch).eq("id", id);

    // Atividades
    if (patch.responsaveis !== undefined && JSON.stringify(patch.responsaveis) !== JSON.stringify(prev.responsaveis)) {
      await get().addAtividade({
        clienteId: prev.cliente_id,
        acao: "responsavel",
        descricao: `Responsáveis alterados`,
        refId: id,
        tipo: "post",
        area: "Posts",
        titulo_tarefa: prev.titulo_card,
        payload: { de: prev.responsaveis, para: patch.responsaveis }
      });
    }

    if (patch.data_limite_tarefa !== undefined && patch.data_limite_tarefa !== prev.data_limite_tarefa) {
      await get().addAtividade({
        clienteId: prev.cliente_id,
        acao: "prazo",
        descricao: patch.data_limite_tarefa 
          ? `Prazo alterado para ${new Date(patch.data_limite_tarefa).toLocaleDateString("pt-BR")}`
          : "Prazo removido",
        refId: id,
        tipo: "post",
        area: "Posts",
        titulo_tarefa: prev.titulo_card,
        payload: { de: prev.data_limite_tarefa, para: patch.data_limite_tarefa }
      });
    }

    get()._scheduleReload();
  },

  updatePost: async (id, patch) => {
    const dbPatch: any = {};
    if (patch.titulo_post !== undefined) dbPatch.titulo = patch.titulo_post;
    if (patch.legenda !== undefined) dbPatch.legenda = patch.legenda;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.anexos !== undefined) dbPatch.anexos = patch.anexos;
    if (patch.data_agendamento !== undefined) dbPatch.data_agendamento = patch.data_agendamento || null;
    if (patch.data_postagem !== undefined) dbPatch.data_postagem = patch.data_postagem || null;
    if (patch.link_post !== undefined) dbPatch.link_post = patch.link_post || null;
    if (patch.link_meister !== undefined) dbPatch.link_meister = patch.link_meister || null;
    // Patch otimista local
    set({ posts: get().posts.map(p => p.id === id ? { ...p, ...patch } : p) });
    await supabase.from("posts").update(dbPatch).eq("id", id);
    get()._scheduleReload();
  },

  deleteCard: async (cardId) => {
    // Apaga comentários dos posts deste card
    const { data: postRows } = await supabase.from("posts").select("id").eq("card_id", cardId);
    const postIds = (postRows ?? []).map((p: any) => p.id);
    if (postIds.length > 0) {
      await supabase.from("comentarios").delete().in("post_id", postIds);
    }
    await supabase.from("posts").delete().eq("card_id", cardId);
    const { error } = await supabase.from("cards").delete().eq("id", cardId);
    if (error) {
      toast.error(`Falha ao excluir tarefa: ${error.message}`);
      return;
    }
    toast.success("Tarefa excluída");
    // Patch otimista local
    set({
      cards: get().cards.filter(c => c.id !== cardId),
      posts: get().posts.filter(p => !postIds.includes(p.id)),
      comentarios: get().comentarios.filter(co => !co.post_id || !postIds.includes(co.post_id)),
    });
    get()._scheduleReload();
  },

  iniciarTarefa: async (cardId, { responsaveis, data_agendada, titulo, descricao, formato, qtd_slides }) => {
    const card = get().cards.find((c) => c.id === cardId);
    if (!card) {
      toast.error("Card não encontrado");
      return;
    }
    const dbPatch: any = {
      status: "Criar",
      responsaveis_ids: responsaveis,
    };
    if (data_agendada !== undefined) dbPatch.data_agendada = data_agendada;
    if (titulo !== undefined && titulo.trim()) dbPatch.titulo = titulo.trim();
    if (descricao !== undefined) dbPatch.descricao = descricao;
    if (formato !== undefined) dbPatch.formato = formato;
    if (qtd_slides !== undefined) dbPatch.qtd_slides = qtd_slides;
    const { error } = await supabase.from("cards").update(dbPatch).eq("id", cardId);
    if (error) {
      toast.error(`Falha ao iniciar tarefa: ${error.message}`);
      return;
    }
    toast.success("Tarefa iniciada");
    get()._scheduleReload();
  },

  createCardRascunho: async ({ cliente_id, mes_referencia }) => {
    // Calcula próxima posição para o cliente (gera mes/semana derivados)
    const cardsCli = get().cards.filter((c) => c.cliente_id === cliente_id);
    const maxPos = cardsCli.reduce((acc, c) => {
      const pos = (c.mes_referencia - 1) * 4 + (c.numero_semana - 1);
      return pos > acc ? pos : acc;
    }, -1);
    let posicao = maxPos + 1;
    if (mes_referencia) {
      // tenta encaixar no mês solicitado
      const base = (mes_referencia - 1) * 4;
      const ocupadas = new Set(
        cardsCli
          .filter((c) => c.mes_referencia === mes_referencia)
          .map((c) => c.numero_semana),
      );
      let semana = 1;
      while (ocupadas.has(semana) && semana <= 4) semana++;
      if (semana <= 4) posicao = base + (semana - 1);
    }
    const mes = Math.floor(posicao / 4) + 1;
    const semana = (posicao % 4) + 1;
    const statusInicial =
      get().statusPostOptions.find((o) => o.label === "Planejamento")?.label ?? "Planejamento";

    const { data: cardRow, error: cardErr } = await supabase
      .from("cards")
      .insert({
        cliente_id,
        titulo: `Post Mês ${mes} - Semana ${semana}`,
        status: statusInicial,
        posicao,
        responsaveis_ids: [],
      })
      .select()
      .single();
    if (cardErr || !cardRow) {
      toast.error(`Falha ao criar tarefa: ${cardErr?.message ?? "desconhecido"}`);
      return null;
    }

    const { data: postRow, error: postErr } = await supabase
      .from("posts")
      .insert({
        card_id: cardRow.id,
        titulo: cardRow.titulo,
        status: cardRow.status,
      })
      .select()
      .single();
    if (postErr || !postRow) {
      toast.error(`Card criado, mas falhou ao gerar post: ${postErr?.message ?? "desconhecido"}`);
      return null;
    }

    get()._scheduleReload();
    return { cardId: cardRow.id, postId: postRow.id };
  },

  // ============= Comentários =============
  addComentario: async (c) => {
    const { data: userData } = await supabase.auth.getUser();
    const authUid = userData.user?.id;
    if (!authUid) {
      toast.error("Você precisa estar autenticado para comentar");
      return null;
    }
    const { data, error } = await supabase.from("comentarios").insert({
      post_id: c.post_id ?? null,
      cliente_id: c.cliente_id ?? null,
      usuario_id: authUid,
      comentario_texto: c.comentario_texto,
      imagem_url: c.imagem_url ?? null,
    }).select().single();

    if (error) {
      toast.error(`Falha ao salvar comentário: ${error.message}`);
      return null;
    }

    if (c.cliente_id) {
      const trecho = c.comentario_texto.replace(/<[^>]+>/g, "").slice(0, 100);
      let area = "Direto";
      let titulo_tarefa = undefined;
      let tipo: "Gerencial" | "post" = "Gerencial";

      if (c.post_id) {
        tipo = "post";
        area = "Posts";
        const post = get().posts.find(p => p.id === c.post_id);
        const card = post ? get().cards.find(cd => cd.id === post.card_id) : null;
        titulo_tarefa = card?.titulo_card;
      }

      await get().addAtividade({
        clienteId: c.cliente_id,
        acao: "comentario",
        descricao: trecho,
        refId: data.id,
        tipo,
        area,
        titulo_tarefa,
        payload: { comentario_id: data.id }
      });
    }

    get()._scheduleReload();
    return data.id;
  },

  updateComentario: async (id, patch) => {
    await supabase.from("comentarios").update(patch).eq("id", id);
    get()._scheduleReload();
  },

  deleteComentario: async (id) => {
    await supabase.from("comentarios").delete().eq("id", id);
    get()._scheduleReload();
  },

  // ============= Alertas =============
  resolverAlerta: async (id) => {
    await supabase.from("alertas").update({ status: "Resolvido" as any }).eq("id", id);
    get()._scheduleReload();
  },

  // ============= Colunas =============
  addColumn: async (col) => {
    const ordem = get().colunasCliente.length;
    await supabase.from("colunas_cliente").insert({
      key: col.key,
      label: col.label,
      tipo: col.tipo as any,
      ordem,
      oculta: col.oculta,
      fixada: col.fixada,
      largura: col.largura,
      cor: col.cor ?? null,
      fixa: col.fixa ?? false,
      opcoes: (col.opcoes ?? []) as any,
    });
    get()._scheduleReload();
  },

  updateColumn: async (key, patch) => {
    const dbPatch: any = {};
    if (patch.label !== undefined) dbPatch.label = patch.label;
    if (patch.tipo !== undefined) dbPatch.tipo = patch.tipo;
    if (patch.ordem !== undefined) dbPatch.ordem = patch.ordem;
    if (patch.oculta !== undefined) dbPatch.oculta = patch.oculta;
    if (patch.fixada !== undefined) dbPatch.fixada = patch.fixada;
    if (patch.largura !== undefined) dbPatch.largura = patch.largura;
    if (patch.cor !== undefined) dbPatch.cor = patch.cor;
    if (patch.opcoes !== undefined) dbPatch.opcoes = patch.opcoes;
    await supabase.from("colunas_cliente").update(dbPatch).eq("key", key);
    get()._scheduleReload();
  },

  deleteColumn: async (key) => {
    const c = get().colunasCliente.find((x) => x.key === key);
    if (c?.fixa) return;
    await supabase.from("colunas_cliente").delete().eq("key", key);
    get()._scheduleReload();
  },

  reorderColumns: async (keys) => {
    await Promise.all(
      keys.map((k, i) => supabase.from("colunas_cliente").update({ ordem: i }).eq("key", k)),
    );
    get()._scheduleReload();
  },

  saveModeloColunas: async (nome) => {
    await supabase.from("modelos_colunas").insert({
      nome,
      colunas: get().colunasCliente as any,
    });
    get()._scheduleReload();
  },

  applyModeloColunas: async (id) => {
    const m = get().modelosColunas.find((x) => x.id === id);
    if (!m) return;
    // limpa as não-fixas, recria a partir do modelo, preservando as fixas
    const fixas = get().colunasCliente.filter((c) => c.fixa);
    const fixasKeys = new Set(fixas.map((c) => c.key));
    const novas = m.colunas.filter((c) => !fixasKeys.has(c.key));

    await supabase.from("colunas_cliente").delete().eq("fixa", false);
    if (novas.length > 0) {
      await supabase.from("colunas_cliente").insert(
        novas.map((c, i) => ({
          key: c.key,
          label: c.label,
          tipo: c.tipo as any,
          ordem: fixas.length + i,
          oculta: c.oculta,
          fixada: c.fixada,
          largura: c.largura,
          cor: c.cor ?? null,
          fixa: false,
          opcoes: (c.opcoes ?? []) as any,
        })),
      );
    }
    get()._scheduleReload();
  },

  deleteModeloColunas: async (id) => {
    await supabase.from("modelos_colunas").delete().eq("id", id);
    get()._scheduleReload();
  },

  // ============= Custom Fields =============
  addCustomField: async (f) => {
    const ordem = get().customFields.length;
    await supabase.from("custom_fields").insert({
      escopo: f.escopo as any,
      nome: f.nome,
      tipo: f.tipo as any,
      opcoes: (f.opcoes ?? []) as any,
      ordem,
    });
    get()._scheduleReload();
  },

  deleteCustomField: async (id) => {
    await supabase.from("custom_fields").delete().eq("id", id);
    get()._scheduleReload();
  },

  // ============= Nichos =============
  addNicho: async (n) => {
    const label = n.label.trim();
    if (!label) return false;
    if (get().nichos.some((x) => x.label.toLowerCase() === label.toLowerCase())) return false;
    const { error } = await supabase.from("nichos").insert({ label, cor: n.cor });
    if (error) return false;
    get()._scheduleReload();
    return true;
  },

  updateNicho: async (oldLabel, patch) => {
    const novoLabel = patch.label?.trim();
    if (novoLabel !== undefined && !novoLabel) return -1;
    if (
      novoLabel &&
      novoLabel.toLowerCase() !== oldLabel.toLowerCase() &&
      get().nichos.some((x) => x.label.toLowerCase() === novoLabel.toLowerCase())
    ) {
      return -1;
    }
    const afetados = novoLabel && novoLabel !== oldLabel
      ? get().clientes.filter((c) => c.nicho === oldLabel).length
      : 0;

    const dbPatch: any = {};
    if (novoLabel !== undefined) dbPatch.label = novoLabel;
    if (patch.cor !== undefined) dbPatch.cor = patch.cor;
    await supabase.from("nichos").update(dbPatch).eq("label", oldLabel);

    if (novoLabel && novoLabel !== oldLabel) {
      await supabase.from("clientes").update({ nicho: novoLabel }).eq("nicho", oldLabel);
    }
    get()._scheduleReload();
    return afetados;
  },

  deleteNicho: async (label) => {
    const afetados = get().clientes.filter((c) => c.nicho === label).length;
    await supabase.from("clientes").update({ nicho: null }).eq("nicho", label);
    await supabase.from("nichos").delete().eq("label", label);
    get()._scheduleReload();
    return afetados;
  },

  // ============= Status Options =============
  addStatusOption: async (opt) => {
    const label = opt.label.trim();
    if (!label) return false;
    if (get().statusOptions.some((x) => x.label.toLowerCase() === label.toLowerCase())) return false;
    const proximaOrdem = get().statusOptions.length;
    const { error } = await supabase.from("status_options").insert({ label, cor: opt.cor, ordem: proximaOrdem });
    if (error) return false;
    get()._scheduleReload();
    return true;
  },

  reorderStatusOptions: async (labels) => {
    // Atualiza a ordem de cada status conforme a nova sequência
    await Promise.all(
      labels.map((label, idx) =>
        supabase.from("status_options").update({ ordem: idx }).eq("label", label),
      ),
    );
    get()._scheduleReload();
  },

  updateStatusOption: async (oldLabel, patch) => {
    const novoLabel = patch.label?.trim();
    if (novoLabel !== undefined && !novoLabel) return -1;
    if (
      novoLabel &&
      novoLabel.toLowerCase() !== oldLabel.toLowerCase() &&
      get().statusOptions.some((x) => x.label.toLowerCase() === novoLabel.toLowerCase())
    ) {
      return -1;
    }
    const afetados = novoLabel && novoLabel !== oldLabel
      ? get().clientes.filter((c) => c.status_cliente === oldLabel).length
      : 0;

    const dbPatch: any = {};
    if (novoLabel !== undefined) dbPatch.label = novoLabel;
    if (patch.cor !== undefined) dbPatch.cor = patch.cor;
    await supabase.from("status_options").update(dbPatch).eq("label", oldLabel);

    if (novoLabel && novoLabel !== oldLabel) {
      await supabase.from("clientes").update({ status: novoLabel as any }).eq("status", oldLabel as any);
    }
    get()._scheduleReload();
    return afetados;
  },

  deleteStatusOption: async (label) => {
    const afetados = get().clientes.filter((c) => c.status_cliente === label).length;
    const fallback = get().statusOptions.find((s) => s.label !== label)?.label;
    if (fallback) {
      await supabase.from("clientes").update({ status: fallback as any }).eq("status", label as any);
    }
    await supabase.from("status_options").delete().eq("label", label);
    get()._scheduleReload();
    return afetados;
  },

  // ============= Status Posts =============
  addStatusPostOption: async (opt) => {
    const label = opt.label.trim();
    if (!label) return false;
    if (get().statusPostOptions.some((x) => x.label.toLowerCase() === label.toLowerCase())) return false;
    const proximaOrdem = get().statusPostOptions.length;
    const { error } = await supabase.from("status_post_options").insert({ label, cor: opt.cor, ordem: proximaOrdem });
    if (error) return false;
    get()._scheduleReload();
    return true;
  },

  reorderStatusPostOptions: async (labels) => {
    await Promise.all(
      labels.map((label, idx) =>
        supabase.from("status_post_options").update({ ordem: idx }).eq("label", label),
      ),
    );
    get()._scheduleReload();
  },

  updateStatusPostOption: async (oldLabel, patch) => {
    const novoLabel = patch.label?.trim();
    if (novoLabel !== undefined && !novoLabel) return -1;
    if (
      novoLabel &&
      novoLabel.toLowerCase() !== oldLabel.toLowerCase() &&
      get().statusPostOptions.some((x) => x.label.toLowerCase() === novoLabel.toLowerCase())
    ) {
      return -1;
    }
    const afetados = novoLabel && novoLabel !== oldLabel
      ? get().cards.filter((c) => c.status_card === oldLabel).length
      : 0;

    const dbPatch: any = {};
    if (novoLabel !== undefined) dbPatch.label = novoLabel;
    if (patch.cor !== undefined) dbPatch.cor = patch.cor;
    await supabase.from("status_post_options").update(dbPatch).eq("label", oldLabel);

    if (novoLabel && novoLabel !== oldLabel) {
      await supabase.from("cards").update({ status: novoLabel as any }).eq("status", oldLabel as any);
      await supabase.from("posts").update({ status: novoLabel as any }).eq("status", oldLabel as any);
    }
    get()._scheduleReload();
    return afetados;
  },

  deleteStatusPostOption: async (label) => {
    const afetados = get().cards.filter((c) => c.status_card === label).length;
    const fallback = get().statusPostOptions.find((s) => s.label !== label)?.label;
    if (fallback) {
      await supabase.from("cards").update({ status: fallback as any }).eq("status", label as any);
      await supabase.from("posts").update({ status: fallback as any }).eq("status", label as any);
    }
    await supabase.from("status_post_options").delete().eq("label", label);
    get()._scheduleReload();
    return afetados;
  },
  addAtividade: async ({ clienteId, acao, descricao, refId, tipo, area, titulo_tarefa, payload }) => {
    const { data: userData } = await supabase.auth.getUser();
    await (supabase as any).from("atividade_cliente").insert({
      cliente_id: clienteId,
      tipo: tipo ?? "Gerencial",
      acao,
      descricao,
      referencia_id: refId ?? null,
      usuario_id: userData.user?.id ?? null,
      area: area ?? null,
      titulo_tarefa: titulo_tarefa ?? null,
      payload: payload ?? {},
    });
  },

  createCicloPosts: async ({ cliente_id, tipo, observacao, criar_alerta }) => {
    const cardsCli = get().cards.filter((c) => c.cliente_id === cliente_id);
    const maxMes = cardsCli.reduce((acc, c) => Math.max(acc, c.mes_referencia), 0);
    const proximoMes = maxMes + 1;
    
    const qtdPosts = tipo === "mensal" ? 4 : tipo === "trimestral" ? 12 : 24;
    const numMeses = tipo === "mensal" ? 1 : tipo === "trimestral" ? 3 : 6;
    
    const statusInicial = get().statusPostOptions.find((o) => o.label === "Planejamento")?.label ?? "Planejamento";
    const cardsPayload = [];
    
    let currentPos = cardsCli.reduce((acc, c) => {
      const pos = (c.mes_referencia - 1) * 4 + (c.numero_semana - 1);
      return pos > acc ? pos : acc;
    }, -1) + 1;

    for (let m = 0; m < numMeses; m++) {
      const mesRef = proximoMes + m;
      for (let s = 1; s <= 4; s++) {
        cardsPayload.push({
          cliente_id,
          titulo: `Post Mês ${mesRef} - Semana ${s}`,
          status: statusInicial,
          posicao: currentPos++,
          responsaveis_ids: [],
        });
      }
    }

    const { data: cardsInseridos, error: cardsErr } = await supabase
      .from("cards")
      .insert(cardsPayload)
      .select();

    if (cardsErr) {
      toast.error(`Falha ao criar ciclo: ${cardsErr.message}`);
      return;
    }

    if (cardsInseridos && cardsInseridos.length > 0) {
      const postsPayload = cardsInseridos.map((c: any) => ({
        card_id: c.id,
        titulo: c.titulo,
        status: c.status,
      }));
      const { error: postsErr } = await supabase.from("posts").insert(postsPayload);
      if (postsErr) toast.error(`Cards criados, mas os posts falharam: ${postsErr.message}`);
    }

    // Histórico
    const labelTipo = tipo.charAt(0).toUpperCase() + tipo.slice(1);
    await get().addAtividade({
      clienteId: cliente_id,
      acao: "Criação de Ciclo",
      descricao: `Ciclo ${tipo} criado: ${qtdPosts} posts adicionados em Planejamento.`
    });

    // Alerta de renovação
    if (criar_alerta) {
      const cliente = get().clientes.find(c => c.id === cliente_id);
      const hoje = new Date();
      const prazoRecomendado = new Date();
      prazoRecomendado.setDate(hoje.getDate() + 7);
      
      const respsAlerta = get().responsaveis.filter(r => ["Robson", "Cristiano"].includes(r.nome));
      const respsIds = respsAlerta.map(r => r.id);

      const mensagem = `Cliente renovou o ciclo ${tipo}. Criar novo ciclo de ${qtdPosts} posts e organizar responsável, datas e status. Primeiro post deve entrar em produção em até 7 dias.\n\n` +
                       `Cliente: ${cliente?.nome_cliente}\n` +
                       `Tipo de renovação: ${labelTipo}\n` +
                       `Quantidade de posts: ${qtdPosts}\n` +
                       `Data da renovação: ${format(hoje, "dd/MM/yyyy")}\n` +
                       `Prazo recomendado: ${format(prazoRecomendado, "dd/MM/yyyy")}\n` +
                       `Observações: ${observacao || "Nenhuma"}`;

      await supabase.from("alertas").insert({
        cliente_id,
        tipo_alerta: "Renovacao",
        data_alerta: hoje.toISOString(),
        status: "Pendente",
        mensagem,
      });

      await get().addAtividade({
        clienteId: cliente_id,
        acao: "Alerta de Renovação",
        descricao: `Alerta de renovação criado para acompanhamento do novo ciclo.`
      });
    }

    toast.success(`Ciclo ${tipo} criado com sucesso!`);
    get()._scheduleReload();
  },
}));

// ===================== Bootstrap (uma vez por app) =====================
function startRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  // Realtime usa o mesmo agendador debounced — múltiplos eventos colapsam em 1 reload.
  const reload = () => useCRM.getState()._scheduleReload();
  const tables = [
    "clientes",
    "contratos",
    "cards",
    "posts",
    "comentarios",
    "alertas",
    "colunas_cliente",
    "status_options",
    "status_post_options",
    "nichos",
    "responsaveis",
    "custom_fields",
    "modelos_colunas",
  ];
  // Remove canal anterior (HMR) para evitar erro "callbacks after subscribe()"
  try {
    supabase.getChannels()
      .filter((c: any) => c.topic === "realtime:crm-realtime")
      .forEach((c: any) => supabase.removeChannel(c));
  } catch {
    /* noop */
  }
  const channel = supabase.channel("crm-realtime");
  tables.forEach((t) => {
    channel.on("postgres_changes" as any, { event: "*", schema: "public", table: t }, () => {
      reload();
    });
  });
  channel.subscribe();
}

/**
 * Hook a ser usado uma vez no app raiz para carregar dados e iniciar Realtime.
 * Idempotente — chamar em qualquer lugar é seguro.
 */
export function useCRMBootstrap() {
  useEffect(() => {
    let cancelled = false;

    const tryStart = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!data.session?.user) return; // sem sessão → não dispara queries que ficariam penduradas
        const s = useCRM.getState();
        if (!s.loaded && !s.loading) s._loadAll();
        startRealtime();
      } catch (err) {
        console.warn("[crm] bootstrap abortado:", err);
      }
    };

    tryStart();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" && session?.user) {
        const s = useCRM.getState();
        if (!s.loaded && !s.loading) s._loadAll();
        startRealtime();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
}

// limpa lixo do localStorage de versões anteriores
if (typeof window !== "undefined") {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("crm-juridico"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
}
