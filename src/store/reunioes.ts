import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ReuniaoStatus = "agendada" | "realizada" | "nao_realizada";
export type ReuniaoPostStatus = "nao_analisada" | "em_analise" | "delegada" | "sem_acao" | null;

export interface Reuniao {
  id: string;
  cliente_id: string;
  titulo: string;
  data: string;
  tipo: string | null;
  link_tldv: string | null;
  transcricao: string | null;
  observacoes: string | null;
  responsavel_id: string | null;
  resumo_cliente: string | null;
  resumo_tarefas: string | null;
  criado_por: string | null;
  gerar_alerta_delegacao?: boolean;
  responsavel_delegacao_id?: string | null;
  prazo_delegacao?: string | null;
  observacoes_delegacao?: string | null;
  created_at: string;
  updated_at: string;
  status?: ReuniaoStatus;
  post_status?: ReuniaoPostStatus;
  project_id?: string | null;
  motivo_nao_realizada?: string | null;
  analise_iniciada_em?: string | null;
  analise_iniciada_por?: string | null;
}

const nullIfEmpty = (v?: string | null) => (v && v.trim() ? v : null);

interface State {
  reunioes: Reuniao[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  create: (data: Partial<Reuniao> & { cliente_id: string; titulo: string; data: string }) => Promise<Reuniao | null>;
  update: (id: string, patch: Partial<Reuniao>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  marcarRealizada: (id: string) => Promise<boolean>;
  marcarNaoRealizada: (id: string, motivo?: string) => Promise<void>;
  iniciarAnalise: (id: string) => Promise<void>;
  marcarSemAcao: (id: string) => Promise<void>;
  setPostStatus: (id: string, post_status: ReuniaoPostStatus) => Promise<void>;
}

export const useReunioes = create<State>((set, get) => ({
  reunioes: [],
  loaded: false,
  loading: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const result = await Promise.race([
        (supabase as any).from("reunioes").select("*").order("data", { ascending: false }),
        new Promise<any>((_, rej) => setTimeout(() => rej(new Error("Tempo esgotado ao carregar reuniões")), 15000)),
      ]);
      const { data, error } = result;
      if (error) throw error;
      set({ reunioes: (data ?? []) as Reuniao[], loaded: true });
    } catch (e: any) {
      toast.error("Erro ao carregar reuniões: " + (e?.message ?? "desconhecido"));
    } finally {
      set({ loading: false });
    }
  },
  create: async (data) => {
    const { data: user } = await supabase.auth.getUser();
    const payload: any = {
      ...data,
      cliente_id: data.cliente_id,
      responsavel_id: nullIfEmpty(data.responsavel_id ?? null),
      project_id: nullIfEmpty((data as any).project_id ?? null),
      responsavel_delegacao_id: nullIfEmpty(data.responsavel_delegacao_id ?? null),
      criado_por: user.user?.id ?? null,
      status: data.status ?? "agendada",
    };
    const { data: row, error } = await (supabase as any).from("reunioes").insert(payload).select().single();
    if (error) {
      toast.error("Erro ao criar reunião: " + error.message);
      return null;
    }
    set({ reunioes: [row as Reuniao, ...get().reunioes] });
    toast.success("Reunião criada");
    return row as Reuniao;
  },
  update: async (id, patch) => {
    const normalized: any = { ...patch };
    if ("responsavel_id" in normalized) normalized.responsavel_id = nullIfEmpty(normalized.responsavel_id);
    if ("project_id" in normalized) normalized.project_id = nullIfEmpty(normalized.project_id);
    if ("responsavel_delegacao_id" in normalized) normalized.responsavel_delegacao_id = nullIfEmpty(normalized.responsavel_delegacao_id);
    const { error } = await (supabase as any).from("reunioes").update(normalized).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    set({
      reunioes: get().reunioes.map((r) => (r.id === id ? { ...r, ...normalized } as Reuniao : r)),
    });
  },
  remove: async (id) => {
    const { error } = await (supabase as any).from("reunioes").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    set({ reunioes: get().reunioes.filter((r) => r.id !== id) });
    toast.success("Reunião removida");
  },
  marcarRealizada: async (id) => {
    const r = get().reunioes.find((x) => x.id === id);
    if (!r) return false;
    const tem = !!(r.link_tldv || r.transcricao || r.resumo_cliente || r.resumo_tarefas);
    if (!tem) {
      toast.error("Para marcar como realizada, adicione o link da gravação, transcrição ou resumo da reunião.");
      return false;
    }
    await get().update(id, { status: "realizada", post_status: "nao_analisada" });
    toast.success("Reunião marcada como realizada");
    return true;
  },
  marcarNaoRealizada: async (id, motivo) => {
    await get().update(id, { status: "nao_realizada", post_status: null, motivo_nao_realizada: motivo ?? null });
    toast.success("Reunião marcada como não realizada");
  },
  iniciarAnalise: async (id) => {
    const { data: user } = await supabase.auth.getUser();
    await get().update(id, {
      post_status: "em_analise",
      analise_iniciada_em: new Date().toISOString(),
      analise_iniciada_por: user.user?.id ?? null,
    });
    toast.success("Reunião em análise");
  },
  marcarSemAcao: async (id) => {
    await get().update(id, { post_status: "sem_acao" });
    toast.success("Reunião finalizada sem ação necessária");
  },
  setPostStatus: async (id, post_status) => {
    await get().update(id, { post_status });
  },
}));

export function useReunioesBootstrap() {
  const loaded = useReunioes((s) => s.loaded);
  const load = useReunioes((s) => s.load);
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
}
