import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AgenteTipo = "resumo_cliente" | "operacional";

export interface IAAgente {
  id: string;
  tipo: AgenteTipo;
  nome: string;
  provider: string;
  model: string | null;
  prompt: string;
  temperatura: number;
  contexto_adicional: string | null;
  regras_categorizacao: string | null;
  regras_responsaveis: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface State {
  agentes: IAAgente[];
  loaded: boolean;
  load: () => Promise<void>;
  upsert: (data: Partial<IAAgente> & { tipo: AgenteTipo }) => Promise<void>;
}

export const useIAAgentes = create<State>((set, get) => ({
  agentes: [],
  loaded: false,
  load: async () => {
    const { data, error } = await (supabase as any).from("ia_agentes").select("*").order("tipo");
    if (error) { toast.error(error.message); return; }
    set({ agentes: (data ?? []) as IAAgente[], loaded: true });
  },
  upsert: async (data) => {
    const existing = get().agentes.find((a) => a.tipo === data.tipo);
    if (existing) {
      const { error } = await (supabase as any).from("ia_agentes").update(data).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
      set({ agentes: get().agentes.map((a) => (a.id === existing.id ? { ...a, ...data } as IAAgente : a)) });
    } else {
      const { data: row, error } = await (supabase as any).from("ia_agentes").insert(data).select().single();
      if (error) { toast.error(error.message); return; }
      set({ agentes: [...get().agentes, row as IAAgente] });
    }
    toast.success("Agente salvo");
  },
}));

export function useIAAgentesBootstrap() {
  const loaded = useIAAgentes((s) => s.loaded);
  const load = useIAAgentes((s) => s.load);
  useEffect(() => { if (!loaded) load(); }, [loaded, load]);
}
