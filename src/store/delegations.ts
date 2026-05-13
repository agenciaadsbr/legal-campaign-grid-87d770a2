import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DelegationConfig {
  id: string;
  usuarios_autorizados_ids: string[];
  prazo_padrao_dias: number;
  tipos_sugestao_automatica: string[];
  responsavel_padrao_id: string | null;
}

export interface MeetingDelegation {
  id: string;
  reuniao_id: string;
  cliente_id: string;
  responsavel_id: string;
  criado_por: string | null;
  status: string;
  prazo: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface State {
  config: DelegationConfig | null;
  delegations: MeetingDelegation[];
  loading: boolean;
  loaded: boolean;
  loadConfig: () => Promise<void>;
  updateConfig: (patch: Partial<DelegationConfig>) => Promise<void>;
  loadDelegations: () => Promise<void>;
  createDelegation: (data: any) => Promise<MeetingDelegation | null>;
  updateDelegation: (id: string, patch: Partial<MeetingDelegation>) => Promise<void>;
  removeDelegation: (id: string) => Promise<void>;
}

export const useDelegations = create<State>((set, get) => ({
  config: null,
  delegations: [],
  loading: false,
  loaded: false,
  loadConfig: async () => {
    const { data, error } = await supabase.from("configuracoes_delegacao").select("*").limit(1).maybeSingle();
    if (error) {
      console.error("Erro ao carregar config de delegação:", error);
      return;
    }
    set({ config: data });
  },
  updateConfig: async (patch) => {
    const config = get().config;
    if (!config) return;
    const { error } = await supabase.from("configuracoes_delegacao").update(patch).eq("id", config.id);
    if (error) {
      toast.error("Erro ao atualizar configurações: " + error.message);
      return;
    }
    set({ config: { ...config, ...patch } });
    toast.success("Configurações atualizadas");
  },
  loadDelegations: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from("delegacoes_reuniao").select("*").order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar delegações: " + error.message);
      set({ loading: false });
      return;
    }
    set({ delegations: (data ?? []) as MeetingDelegation[], loaded: true, loading: false });
  },
  createDelegation: async (data) => {
    const { data: user } = await supabase.auth.getUser();
    const payload = { ...data, criado_por: user.user?.id ?? null };
    const { data: row, error } = await supabase.from("delegacoes_reuniao").insert([payload]).select().single();
    if (error) {
      if (error.code === "23505") {
        toast.error("Esta reunião já possui um alerta de delegação.");
      } else {
        toast.error("Erro ao criar delegação: " + error.message);
      }
      return null;
    }
    set({ delegations: [row as MeetingDelegation, ...get().delegations] });
    return row as MeetingDelegation;
  },
  updateDelegation: async (id, patch) => {
    const { error } = await supabase.from("delegacoes_reuniao").update(patch).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar delegação: " + error.message);
      return;
    }
    set({
      delegations: get().delegations.map((d) => (d.id === id ? { ...d, ...patch } as MeetingDelegation : d)),
    });
  },
  removeDelegation: async (id) => {
    const { error } = await supabase.from("delegacoes_reuniao").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir delegação: " + error.message);
      return;
    }
    set({ delegations: get().delegations.filter((d) => d.id !== id) });
  },
}));

export function useDelegationsBootstrap() {
  const loaded = useDelegations((s) => s.loaded);
  const loadDelegations = useDelegations((s) => s.loadDelegations);
  const loadConfig = useDelegations((s) => s.loadConfig);
  useEffect(() => {
    if (!loaded) {
      loadDelegations();
      loadConfig();
    }
  }, [loaded]);
}
