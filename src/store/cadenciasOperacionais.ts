import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type CadenciaTipo = "aprovacao" | "recarga";
export type CadenciaStatus =
  | "em_andamento"
  | "aguardando_resposta"
  | "finalizada"
  | "sem_retorno"
  | "resolvida";

export interface Cadencia {
  id: string;
  cliente_id: string;
  tipo: CadenciaTipo;
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

export interface CadenciaMensagem {
  id: string;
  tipo: CadenciaTipo;
  etapa: number;
  titulo: string;
  mensagem: string;
  ativo: boolean;
  ordem: number;
}

export const ETAPAS_LABEL: Record<number, string> = {
  1: "Dia 1 — Grupo",
  2: "Dia 2 — Privado",
  3: "Dia 3 — Áudio",
  4: "Dia 4 — Ligação",
};

export const STATUS_LABEL: Record<CadenciaStatus, string> = {
  em_andamento: "Em andamento",
  aguardando_resposta: "Aguardando resposta",
  finalizada: "Finalizada",
  sem_retorno: "Sem retorno",
  resolvida: "Resolvida",
};

export const TIPO_LABEL: Record<CadenciaTipo, string> = {
  aprovacao: "Aprovação",
  recarga: "Recarga",
};

interface State {
  cadencias: Cadencia[];
  execucoes: CadenciaExecucao[];
  mensagens: CadenciaMensagem[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  create: (input: { cliente_id: string; tipo: CadenciaTipo; responsavel_id?: string | null; observacao?: string | null }) => Promise<void>;
  update: (id: string, patch: Partial<Cadencia>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  executarEtapa: (cadenciaId: string, observacao?: string) => Promise<void>;
  upsertMensagem: (m: Partial<CadenciaMensagem> & { tipo: CadenciaTipo; etapa: number; titulo: string; mensagem: string }) => Promise<void>;
  removeMensagem: (id: string) => Promise<void>;
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
      cadencias: (c as any) ?? [],
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
        responsavel_id: input.responsavel_id ?? null,
        observacao: input.observacao ?? null,
        criado_por: userData.user?.id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ cadencias: [data as any, ...s.cadencias] }));
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from("cadencias_operacionais" as any)
      .update(patch as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ cadencias: s.cadencias.map((c) => (c.id === id ? (data as any) : c)) }));
  },

  async remove(id) {
    const { error } = await supabase.from("cadencias_operacionais" as any).delete().eq("id", id);
    if (error) throw error;
    set((s) => ({ cadencias: s.cadencias.filter((c) => c.id !== id) }));
  },

  async executarEtapa(cadenciaId, observacao) {
    const cad = get().cadencias.find((c) => c.id === cadenciaId);
    if (!cad) return;
    const { data: userData } = await supabase.auth.getUser();
    const acao = ETAPAS_LABEL[cad.etapa_atual] ?? `Etapa ${cad.etapa_atual}`;
    const now = new Date().toISOString();

    const { data: ex, error: exErr } = await supabase
      .from("cadencia_execucoes" as any)
      .insert({
        cadencia_id: cadenciaId,
        etapa: cad.etapa_atual,
        acao,
        executado_por: userData.user?.id ?? null,
        executado_em: now,
        observacao: observacao ?? null,
      })
      .select()
      .single();
    if (exErr) throw exErr;

    const proxima = cad.etapa_atual >= 4 ? 4 : cad.etapa_atual + 1;
    const finalizou = cad.etapa_atual >= 4;

    const patch: Partial<Cadencia> = {
      etapa_atual: proxima,
      ultima_acao_em: now,
      status: finalizou ? "aguardando_resposta" : "em_andamento",
    };
    const { data: upd, error: updErr } = await supabase
      .from("cadencias_operacionais" as any)
      .update(patch as any)
      .eq("id", cadenciaId)
      .select()
      .single();
    if (updErr) throw updErr;

    set((s) => ({
      execucoes: [...s.execucoes, ex as any],
      cadencias: s.cadencias.map((c) => (c.id === cadenciaId ? (upd as any) : c)),
    }));
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
}));

export function diasSemResposta(c: Cadencia): number {
  const ref = c.ultima_acao_em ?? c.created_at;
  const diff = Date.now() - new Date(ref).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function proximaAcao(c: Cadencia): string {
  if (c.status === "finalizada" || c.status === "resolvida" || c.status === "sem_retorno") return "—";
  return ETAPAS_LABEL[c.etapa_atual] ?? "—";
}
