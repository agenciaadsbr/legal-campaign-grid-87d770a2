import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface State {
  reunioes: Reuniao[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  create: (data: Partial<Reuniao> & { cliente_id: string; titulo: string; data: string }) => Promise<Reuniao | null>;
  update: (id: string, patch: Partial<Reuniao>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useReunioes = create<State>((set, get) => ({
  reunioes: [],
  loaded: false,
  loading: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    const { data, error } = await (supabase as any)
      .from("reunioes")
      .select("*")
      .order("data", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar reuniões: " + error.message);
      set({ loading: false });
      return;
    }
    set({ reunioes: (data ?? []) as Reuniao[], loaded: true, loading: false });
  },
  create: async (data) => {
    const { data: user } = await supabase.auth.getUser();
    const payload: any = { ...data, criado_por: user.user?.id ?? null };
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
    const { error } = await (supabase as any).from("reunioes").update(patch).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    set({
      reunioes: get().reunioes.map((r) => (r.id === id ? { ...r, ...patch } as Reuniao : r)),
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
}));

export function useReunioesBootstrap() {
  const loaded = useReunioes((s) => s.loaded);
  const load = useReunioes((s) => s.load);
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
}
