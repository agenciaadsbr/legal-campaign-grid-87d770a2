import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type CadenciaTipo = "aprovacao" | "recarga";
// Apenas 3 status válidos. Mantemos os legados no tipo apenas para tolerância de leitura.
export type CadenciaStatus =
  | "aguardando_resposta"
  | "sem_retorno"
  | "resolvida"
  // legados (migrados, ainda podem aparecer em caches)
  | "em_andamento"
  | "finalizada";

export interface Cadencia {
  id: string;
  cliente_id: string;
  task_id: string | null;
  tipo: CadenciaTipo;
  /** Etapa executada mais recente (1..4). 0 = nenhuma executada. */
  etapa_atual: number;
  status: CadenciaStatus;
  responsavel_id: string | null;
  ultima_acao_em: string | null;
  proxima_acao_em: string | null;
  observacao: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface CadenciaExecucao {
  id: string;
  cadencia_id: string;
  etapa: number;
  acao: string;
  executado_por: string | null;
  executado_em: string;
  observacao: string | null;
}

export type CadenciaSetor = "videos" | "imagens_anuncios" | "landing_page" | "trafego_pago";

export interface CadenciaMensagem {
  id: string;
  tipo: CadenciaTipo;
  setor: CadenciaSetor | null;
  etapa: number;
  titulo: string;
  mensagem: string;
  ativo: boolean;
  ordem: number;
}

export const SETOR_LABEL: Record<CadenciaSetor, string> = {
  videos: "Vídeos",
  imagens_anuncios: "Imagens / Anúncios",
  landing_page: "Landing Page",
  trafego_pago: "Tráfego Pago",
};

export const SETOR_RESPONSAVEL: Record<CadenciaSetor, string> = {
  videos: "Bianca",
  imagens_anuncios: "Lorenzo",
  landing_page: "Bruno",
  trafego_pago: "Grace/Gleice",
};

export const SETORES_APROVACAO: CadenciaSetor[] = [
  "videos", "imagens_anuncios", "landing_page", "trafego_pago",
];

export const ETAPAS_LABEL: Record<number, string> = {
  1: "Dia 1 — Enviou mensagem no grupo",
  2: "Dia 2 — Enviou mensagem no privado",
  3: "Dia 3 — Enviou áudio",
  4: "Dia 4 — Fez ligação",
};

export const STATUS_LABEL: Record<CadenciaStatus, string> = {
  aguardando_resposta: "Aguardando resposta",
  sem_retorno: "Sem retorno",
  resolvida: "Resolvida",
  // labels para legados não devem aparecer, mas evita "undefined"
  em_andamento: "Aguardando resposta",
  finalizada: "Resolvida",
};

export const STATUS_OPTIONS: CadenciaStatus[] = [
  "aguardando_resposta",
  "sem_retorno",
  "resolvida",
];

export const TIPO_LABEL: Record<CadenciaTipo, string> = {
  aprovacao: "Aprovação",
  recarga: "Recarga",
};

/** Normaliza status legados para a nova escala. */
function normalizeStatus(s: string | null | undefined): CadenciaStatus {
  if (s === "em_andamento") return "aguardando_resposta";
  if (s === "finalizada") return "resolvida";
  if (s === "aguardando_resposta" || s === "sem_retorno" || s === "resolvida") return s;
  return "aguardando_resposta";
}

function normalizeCadencia(c: any): Cadencia {
  return { ...c, status: normalizeStatus(c?.status) } as Cadencia;
}

interface State {
  cadencias: Cadencia[];
  execucoes: CadenciaExecucao[];
  mensagens: CadenciaMensagem[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  create: (input: { cliente_id: string; tipo: CadenciaTipo; responsavel_id?: string | null; observacao?: string | null; task_id?: string | null }) => Promise<void>;
  update: (id: string, patch: Partial<Cadencia>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  executarEtapa: (cadenciaId: string, observacao?: string) => Promise<void>;
  /**
   * Registra uma etapa executada pela coluna "Cadência" da Central de Tarefas.
   * Cria a cadência se não existir para a task; caso contrário, atualiza.
   */
  registrarEtapa: (input: {
    task_id: string;
    cliente_id: string;
    tipo: CadenciaTipo;
    etapa: number;
    status: CadenciaStatus;
    responsavel_id?: string | null;
    observacao?: string | null;
  }) => Promise<Cadencia>;
  upsertMensagem: (m: Partial<CadenciaMensagem> & { tipo: CadenciaTipo; etapa: number; titulo: string; mensagem: string }) => Promise<void>;
  removeMensagem: (id: string) => Promise<void>;
  getByTaskId: (taskId: string) => Cadencia | undefined;
}

export const useCadenciasStore = create<State>((set, get) => ({
  cadencias: [],
  execucoes: [],
  mensagens: [],
  loaded: false,
  loading: false,

  async load() {
    if (get().loading) return;
    set({ loading: true });
    const [{ data: c }, { data: e }, { data: m }] = await Promise.all([
      supabase.from("cadencias_operacionais" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("cadencia_execucoes" as any).select("*").order("executado_em", { ascending: true }),
      supabase.from("cadencia_mensagens" as any).select("*").order("tipo").order("etapa"),
    ]);
    set({
      cadencias: ((c as any[]) ?? []).map(normalizeCadencia),
      execucoes: (e as any) ?? [],
      mensagens: (m as any) ?? [],
      loaded: true,
      loading: false,
    });
  },

  async create(input) {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("cadencias_operacionais" as any)
      .insert({
        cliente_id: input.cliente_id,
        tipo: input.tipo,
        task_id: input.task_id ?? null,
        responsavel_id: input.responsavel_id ?? null,
        observacao: input.observacao ?? null,
        criado_por: userData.user?.id ?? null,
        status: "aguardando_resposta",
      })
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ cadencias: [normalizeCadencia(data), ...s.cadencias] }));
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from("cadencias_operacionais" as any)
      .update(patch as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ cadencias: s.cadencias.map((c) => (c.id === id ? normalizeCadencia(data) : c)) }));
  },

  async remove(id) {
    const { error } = await supabase.from("cadencias_operacionais" as any).delete().eq("id", id);
    if (error) throw error;
    set((s) => ({ cadencias: s.cadencias.filter((c) => c.id !== id) }));
  },

  async executarEtapa(cadenciaId, observacao) {
    const cad = get().cadencias.find((c) => c.id === cadenciaId);
    if (!cad) return;
    const proxEtapa = Math.min(4, Math.max(1, (cad.etapa_atual || 0) + 1));
    await get().registrarEtapa({
      task_id: cad.task_id ?? `cadencia:${cad.id}`,
      cliente_id: cad.cliente_id,
      tipo: cad.tipo,
      etapa: proxEtapa,
      status: "aguardando_resposta",
      responsavel_id: cad.responsavel_id,
      observacao: observacao ?? null,
    });
  },

  async registrarEtapa(input) {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    const now = new Date().toISOString();

    // Busca cadência existente pela task
    let cad = get().cadencias.find((c) => c.task_id === input.task_id);

    if (!cad) {
      const { data, error } = await supabase
        .from("cadencias_operacionais" as any)
        .insert({
          cliente_id: input.cliente_id,
          tipo: input.tipo,
          task_id: input.task_id,
          responsavel_id: input.responsavel_id ?? null,
          criado_por: uid,
          etapa_atual: input.etapa,
          status: input.status,
          ultima_acao_em: now,
          observacao: input.observacao ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      cad = normalizeCadencia(data);
      set((s) => ({ cadencias: [cad as Cadencia, ...s.cadencias] }));
    } else {
      const patch: Partial<Cadencia> = {
        tipo: input.tipo,
        etapa_atual: input.etapa,
        status: input.status,
        ultima_acao_em: now,
      };
      if (input.responsavel_id && !cad.responsavel_id) patch.responsavel_id = input.responsavel_id;
      const { data, error } = await supabase
        .from("cadencias_operacionais" as any)
        .update(patch as any)
        .eq("id", cad.id)
        .select()
        .single();
      if (error) throw error;
      cad = normalizeCadencia(data);
      set((s) => ({ cadencias: s.cadencias.map((c) => (c.id === cad!.id ? (cad as Cadencia) : c)) }));
    }

    const acao = ETAPAS_LABEL[input.etapa] ?? `Etapa ${input.etapa}`;
    const { data: ex, error: exErr } = await supabase
      .from("cadencia_execucoes" as any)
      .insert({
        cadencia_id: cad.id,
        etapa: input.etapa,
        acao,
        executado_por: uid,
        executado_em: now,
        observacao: input.observacao ?? null,
      })
      .select()
      .single();
    if (exErr) throw exErr;
    set((s) => ({ execucoes: [...s.execucoes, ex as any] }));
    return cad;
  },

  async upsertMensagem(m) {
    if (m.id) {
      const { data, error } = await supabase
        .from("cadencia_mensagens" as any)
        .update({ titulo: m.titulo, mensagem: m.mensagem, tipo: m.tipo, etapa: m.etapa, ativo: m.ativo ?? true })
        .eq("id", m.id)
        .select()
        .single();
      if (error) throw error;
      set((s) => ({ mensagens: s.mensagens.map((x) => (x.id === m.id ? (data as any) : x)) }));
    } else {
      const { data, error } = await supabase
        .from("cadencia_mensagens" as any)
        .insert({ tipo: m.tipo, etapa: m.etapa, titulo: m.titulo, mensagem: m.mensagem, ativo: m.ativo ?? true })
        .select()
        .single();
      if (error) throw error;
      set((s) => ({ mensagens: [...s.mensagens, data as any] }));
    }
  },

  async removeMensagem(id) {
    const { error } = await supabase.from("cadencia_mensagens" as any).delete().eq("id", id);
    if (error) throw error;
    set((s) => ({ mensagens: s.mensagens.filter((m) => m.id !== id) }));
  },

  getByTaskId(taskId) {
    return get().cadencias.find((c) => c.task_id === taskId);
  },
}));

export function diasSemResposta(c: Cadencia): number {
  const ref = c.ultima_acao_em ?? c.created_at;
  const diff = Date.now() - new Date(ref).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** Alias semântico: dias parados na etapa atual (desde a última ação registrada). */
export function diasNaEtapa(c: Cadencia): number {
  return diasSemResposta(c);
}

/** Label do contador: "—" se sem ação, "0 dias" (<24h), "1 dia", "X dias". */
export function diasNaEtapaLabel(c: Cadencia): string {
  if (!c.ultima_acao_em) return "—";
  const d = diasNaEtapa(c);
  if (d <= 0) return "0 dias";
  if (d === 1) return "1 dia";
  return `${d} dias`;
}

/** Tom de cor por faixa de dias na etapa (cinza/amarelo/vermelho). */
export function diasNaEtapaTone(c: Cadencia): "muted" | "warning" | "danger" {
  if (!c.ultima_acao_em) return "muted";
  const d = diasNaEtapa(c);
  if (d <= 1) return "muted";
  if (d === 2) return "warning";
  return "danger";
}

export function proximaAcao(c: Cadencia): string {
  if (c.status === "resolvida" || c.status === "sem_retorno") return "—";
  const prox = (c.etapa_atual || 0) + 1;
  if (prox > 4) return "—";
  return ETAPAS_LABEL[prox] ?? "—";
}

/** Heurística para inferir o tipo de cadência a partir do título/área da tarefa. */
export function inferirTipoCadencia(titulo: string, area?: string | null): CadenciaTipo {
  const txt = `${titulo} ${area ?? ""}`.toLowerCase();
  if (/(recarga|saldo|meta ads|google ads|tráfego|trafego)/.test(txt)) return "recarga";
  return "aprovacao";
}
