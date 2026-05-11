import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TarefaSugeridaStatus = "aguardando_aprovacao" | "aprovada" | "rejeitada" | "convertida";

export interface TarefaSugerida {
  id: string;
  cliente_id: string;
  reuniao_id: string | null;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  responsavel_sugerido_id: string | null;
  prioridade: string | null;
  prazo_sugerido: string | null;
  origem: string;
  status: TarefaSugeridaStatus;
  demanda_id: string | null;
  criado_por: string | null;
  aprovado_por: string | null;
  created_at: string;
  updated_at: string;
}

interface State {
  itens: TarefaSugerida[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  create: (data: Partial<TarefaSugerida> & { cliente_id: string; titulo: string }) => Promise<TarefaSugerida | null>;
  update: (id: string, patch: Partial<TarefaSugerida>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  aprovar: (id: string) => Promise<void>;
  rejeitar: (id: string) => Promise<void>;
}

export const useTarefasSugeridas = create<State>((set, get) => ({
  itens: [],
  loaded: false,
  loading: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    const { data, error } = await (supabase as any)
      .from("tarefas_sugeridas")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar sugestões: " + error.message);
      set({ loading: false });
      return;
    }
    set({ itens: (data ?? []) as TarefaSugerida[], loaded: true, loading: false });
  },
  create: async (data) => {
    const { data: user } = await supabase.auth.getUser();
    const payload: any = { ...data, criado_por: user.user?.id ?? null };
    const { data: row, error } = await (supabase as any).from("tarefas_sugeridas").insert(payload).select().single();
    if (error) {
      toast.error("Erro ao criar sugestão: " + error.message);
      return null;
    }
    set({ itens: [row as TarefaSugerida, ...get().itens] });
    toast.success("Tarefa sugerida criada");
    return row as TarefaSugerida;
  },
  update: async (id, patch) => {
    const { error } = await (supabase as any).from("tarefas_sugeridas").update(patch).eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    set({ itens: get().itens.map((t) => (t.id === id ? { ...t, ...patch } as TarefaSugerida : t)) });
  },
  remove: async (id) => {
    const { error } = await (supabase as any).from("tarefas_sugeridas").delete().eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    set({ itens: get().itens.filter((t) => t.id !== id) });
  },
  aprovar: async (id) => {
    const item = get().itens.find((t) => t.id === id);
    if (!item) return;
    const { data: user } = await supabase.auth.getUser();
    // Cria a demanda real
    const demandaPayload: any = {
      cliente_id: item.cliente_id,
      titulo: item.titulo,
      descricao: item.descricao,
      categoria: item.categoria || "Personalizado",
      prioridade: item.prioridade || "Media",
      data_limite: item.prazo_sugerido,
      responsaveis_ids: item.responsavel_sugerido_id ? [item.responsavel_sugerido_id] : [],
      status: "Planejamento",
      criado_por: user.user?.id ?? null,
      origem_reuniao_id: item.reuniao_id,
      origem_sugestao_id: item.id,
    };
    const { data: dem, error: errDem } = await (supabase as any).from("demandas").insert(demandaPayload).select().single();
    if (errDem) {
      toast.error("Erro ao criar tarefa: " + errDem.message);
      return;
    }
    await get().update(id, { status: "convertida", demanda_id: dem.id, aprovado_por: user.user?.id ?? null });
    toast.success("Sugestão aprovada e convertida em tarefa");
  },
  rejeitar: async (id) => {
    const { data: user } = await supabase.auth.getUser();
    await get().update(id, { status: "rejeitada", aprovado_por: user.user?.id ?? null });
    toast.success("Sugestão rejeitada");
  },
}));

export function useTarefasSugeridasBootstrap() {
  const loaded = useTarefasSugeridas((s) => s.loaded);
  const load = useTarefasSugeridas((s) => s.load);
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
}
