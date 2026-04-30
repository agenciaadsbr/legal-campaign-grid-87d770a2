import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ===================== Tipos =====================
export type StatusCliente = string; // dinâmico via tabela status_options
export type StatusCard = "ideias" | "Criar" | "Revisar" | "Agendar" | "Postado" | "Renovação" | string;
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
  data_agendada?: string | null;
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
  iniciarTarefa: (
    cardId: string,
    payload: { responsaveis: string[]; data_agendada?: string | null; titulo?: string; descricao?: string | null; formato?: string | null; qtd_slides?: number | null },
  ) => Promise<void>;

  addComentario: (c: Omit<Comentario, "id" | "created_at">) => Promise<void>;
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

  // internas
  _loadAll: () => Promise<void>;
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
    data_agendada: row.data_agendada ?? null,
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

  _loadAll: async () => {
    set({ loading: true });
    const [
      responsaveisRes,
      clientesRes,
      contratosRes,
      colunasRes,
      modelosRes,
      statusRes,
      nichosRes,
      cardsRes,
      postsRes,
      comentariosRes,
      alertasRes,
      customFieldsRes,
      statusPostRes,
      profilesRes,
    ] = await Promise.all([
      supabase.from("responsaveis").select("*").order("nome"),
      supabase.from("clientes").select("*").order("created_at", { ascending: false }),
      supabase.from("contratos").select("*"),
      supabase.from("colunas_cliente").select("*").order("ordem"),
      supabase.from("modelos_colunas").select("*").order("created_at"),
      supabase.from("status_options").select("*").order("ordem", { ascending: true }),
      supabase.from("nichos").select("*").order("label"),
      supabase.from("cards").select("*").order("posicao"),
      supabase.from("posts").select("*"),
      supabase.from("comentarios").select("*").order("created_at"),
      supabase.from("alertas").select("*").order("created_at", { ascending: false }),
      supabase.from("custom_fields").select("*").order("ordem"),
      supabase.from("status_post_options").select("*").order("ordem", { ascending: true }),
      supabase.from("profiles").select("id,nome,email,avatar_url,responsavel_id"),
    ]);

    const responsaveis = (responsaveisRes.data ?? []).map(mapResponsavel);
    const contratos = (contratosRes.data ?? []).map(mapContrato);
    const comentarios = (comentariosRes.data ?? []).map(mapComentario);

    // Mapa auth.uid → autor exibível (resolvido via profiles → responsaveis)
    const authoresPorAuthId: Record<string, { nome: string; cor: string; avatar_url?: string }> = {};
    for (const p of profilesRes.data ?? []) {
      const resp = p.responsavel_id ? responsaveis.find((r) => r.id === p.responsavel_id) : undefined;
      authoresPorAuthId[p.id] = {
        nome: resp?.nome ?? p.nome ?? p.email ?? "Usuário",
        cor: resp?.cor ?? "#6366f1",
        avatar_url: resp?.avatar_url ?? p.avatar_url ?? undefined,
      };
    }

    const clientes = (clientesRes.data ?? []).map((r) =>
      mapCliente(r, contratosRes.data ?? [], comentarios, responsaveis, authoresPorAuthId),
    );

    set({
      responsaveis,
      clientes,
      contratos,
      colunasCliente: (colunasRes.data ?? []).map(mapColuna),
      modelosColunas: (modelosRes.data ?? []).map(mapModelo),
      statusOptions: (statusRes.data ?? []).map(mapStatusOpt),
      nichos: (nichosRes.data ?? []).map(mapNicho),
      cards: (cardsRes.data ?? []).map(mapCard),
      posts: (postsRes.data ?? []).map(mapPost),
      comentarios,
      alertas: (alertasRes.data ?? []).map(mapAlerta),
      customFields: (customFieldsRes.data ?? []).map(mapCustomField),
      statusPostOptions: (statusPostRes.data ?? []).map(mapStatusOpt),
      authoresPorAuthId,
      loading: false,
      loaded: true,
    });
  },

  // ============= Clientes =============
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

    await get()._loadAll();
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
    await get()._loadAll();
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
    await get()._loadAll();
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
    await get()._loadAll();
  },

  deleteResponsavel: async (id) => {
    await supabase.from("responsaveis").delete().eq("id", id);
    await get()._loadAll();
  },

  // ============= Cards / Posts =============
  moveCard: async (cardId, novoStatus) => {
    await supabase.from("cards").update({ status: novoStatus as any }).eq("id", cardId);
    await get()._loadAll();
  },

  updateCard: async (id, patch) => {
    const dbPatch: any = {};
    if (patch.titulo_card !== undefined) dbPatch.titulo = patch.titulo_card;
    if ((patch as any).descricao !== undefined) dbPatch.descricao = (patch as any).descricao;
    if (patch.status_card !== undefined) dbPatch.status = patch.status_card;
    if (patch.responsaveis !== undefined) dbPatch.responsaveis_ids = patch.responsaveis;
    if ((patch as any).data_agendada !== undefined) dbPatch.data_agendada = (patch as any).data_agendada;
    if ((patch as any).is_urgent !== undefined) dbPatch.is_urgent = (patch as any).is_urgent;
    if ((patch as any).formato !== undefined) dbPatch.formato = (patch as any).formato;
    if ((patch as any).qtd_slides !== undefined) dbPatch.qtd_slides = (patch as any).qtd_slides;
    await supabase.from("cards").update(dbPatch).eq("id", id);
    await get()._loadAll();
  },

  updatePost: async (id, patch) => {
    const dbPatch: any = {};
    if (patch.titulo_post !== undefined) dbPatch.titulo = patch.titulo_post;
    if (patch.legenda !== undefined) dbPatch.legenda = patch.legenda;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.anexos !== undefined) dbPatch.anexos = patch.anexos;
    await supabase.from("posts").update(dbPatch).eq("id", id);
    await get()._loadAll();
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
    await get()._loadAll();
  },

  // ============= Comentários =============
  addComentario: async (c) => {
    // RLS exige auth.uid() = usuario_id, então usamos sempre o usuário autenticado
    const { data: userData } = await supabase.auth.getUser();
    const authUid = userData.user?.id;
    if (!authUid) {
      toast.error("Você precisa estar autenticado para comentar");
      return;
    }
    const { error } = await supabase.from("comentarios").insert({
      post_id: c.post_id ?? null,
      cliente_id: c.cliente_id ?? null,
      usuario_id: authUid,
      comentario_texto: c.comentario_texto,
      imagem_url: c.imagem_url ?? null,
    });
    if (error) {
      toast.error(`Falha ao salvar comentário: ${error.message}`);
      return;
    }
    await get()._loadAll();
  },

  updateComentario: async (id, patch) => {
    await supabase.from("comentarios").update(patch).eq("id", id);
    await get()._loadAll();
  },

  deleteComentario: async (id) => {
    await supabase.from("comentarios").delete().eq("id", id);
    await get()._loadAll();
  },

  // ============= Alertas =============
  resolverAlerta: async (id) => {
    await supabase.from("alertas").update({ status: "Resolvido" as any }).eq("id", id);
    await get()._loadAll();
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
    await get()._loadAll();
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
    await get()._loadAll();
  },

  deleteColumn: async (key) => {
    const c = get().colunasCliente.find((x) => x.key === key);
    if (c?.fixa) return;
    await supabase.from("colunas_cliente").delete().eq("key", key);
    await get()._loadAll();
  },

  reorderColumns: async (keys) => {
    await Promise.all(
      keys.map((k, i) => supabase.from("colunas_cliente").update({ ordem: i }).eq("key", k)),
    );
    await get()._loadAll();
  },

  saveModeloColunas: async (nome) => {
    await supabase.from("modelos_colunas").insert({
      nome,
      colunas: get().colunasCliente as any,
    });
    await get()._loadAll();
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
    await get()._loadAll();
  },

  deleteModeloColunas: async (id) => {
    await supabase.from("modelos_colunas").delete().eq("id", id);
    await get()._loadAll();
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
    await get()._loadAll();
  },

  deleteCustomField: async (id) => {
    await supabase.from("custom_fields").delete().eq("id", id);
    await get()._loadAll();
  },

  // ============= Nichos =============
  addNicho: async (n) => {
    const label = n.label.trim();
    if (!label) return false;
    if (get().nichos.some((x) => x.label.toLowerCase() === label.toLowerCase())) return false;
    const { error } = await supabase.from("nichos").insert({ label, cor: n.cor });
    if (error) return false;
    await get()._loadAll();
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
    await get()._loadAll();
    return afetados;
  },

  deleteNicho: async (label) => {
    const afetados = get().clientes.filter((c) => c.nicho === label).length;
    await supabase.from("clientes").update({ nicho: null }).eq("nicho", label);
    await supabase.from("nichos").delete().eq("label", label);
    await get()._loadAll();
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
    await get()._loadAll();
    return true;
  },

  reorderStatusOptions: async (labels) => {
    // Atualiza a ordem de cada status conforme a nova sequência
    await Promise.all(
      labels.map((label, idx) =>
        supabase.from("status_options").update({ ordem: idx }).eq("label", label),
      ),
    );
    await get()._loadAll();
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
    await get()._loadAll();
    return afetados;
  },

  deleteStatusOption: async (label) => {
    const afetados = get().clientes.filter((c) => c.status_cliente === label).length;
    const fallback = get().statusOptions.find((s) => s.label !== label)?.label;
    if (fallback) {
      await supabase.from("clientes").update({ status: fallback as any }).eq("status", label as any);
    }
    await supabase.from("status_options").delete().eq("label", label);
    await get()._loadAll();
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
    await get()._loadAll();
    return true;
  },

  reorderStatusPostOptions: async (labels) => {
    await Promise.all(
      labels.map((label, idx) =>
        supabase.from("status_post_options").update({ ordem: idx }).eq("label", label),
      ),
    );
    await get()._loadAll();
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
    await get()._loadAll();
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
    await get()._loadAll();
    return afetados;
  },
}));

// ===================== Bootstrap (uma vez por app) =====================
function startRealtime() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  const reload = () => useCRM.getState()._loadAll();
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
    const s = useCRM.getState();
    if (!s.loaded && !s.loading) {
      s._loadAll();
    }
    startRealtime();
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
