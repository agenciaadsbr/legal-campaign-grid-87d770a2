import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ModeloDisponivel {
  id: string;
  label: string;
  descricao?: string;
  pricing?: { input: number; output: number };
}

export interface IAConfig {
  id: string;
  provider: string;
  model: string | null;
  ativo: boolean;
  modelos_disponiveis: ModeloDisponivel[] | null;
  ultima_verificacao: string | null;
  latency_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface IAPrompt {
  id: string;
  tipo: string; // resumo_cliente | resumo_operacional | tarefas_sugeridas
  conteudo: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface IALog {
  id: string;
  tipo: string;
  modelo: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  custo: number | null;
  input_resumo: string | null;
  criado_por: string | null;
  created_at: string;
}

interface State {
  configs: IAConfig[];
  prompts: IAPrompt[];
  logs: IALog[];
  loaded: boolean;
  load: () => Promise<void>;
  upsertConfig: (data: Partial<IAConfig> & { provider: string }) => Promise<void>;
  upsertPrompt: (data: Partial<IAPrompt> & { tipo: string; conteudo: string }) => Promise<void>;
}

export const useIAConfig = create<State>((set, get) => ({
  configs: [],
  prompts: [],
  logs: [],
  loaded: false,
  load: async () => {
    const [c, p, l] = await Promise.all([
      (supabase as any).from("ia_config").select("*"),
      (supabase as any).from("ia_prompts").select("*"),
      (supabase as any).from("ia_logs").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    set({
      configs: (c.data ?? []) as IAConfig[],
      prompts: (p.data ?? []) as IAPrompt[],
      logs: (l.data ?? []) as IALog[],
      loaded: true,
    });
  },
  upsertConfig: async (data) => {
    const existing = get().configs.find((c) => c.provider === data.provider);
    if (existing) {
      const { error } = await (supabase as any).from("ia_config").update(data).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
      set({ configs: get().configs.map((c) => (c.id === existing.id ? { ...c, ...data } as IAConfig : c)) });
    } else {
      const { data: row, error } = await (supabase as any).from("ia_config").insert(data).select().single();
      if (error) { toast.error(error.message); return; }
      set({ configs: [...get().configs, row as IAConfig] });
    }
    toast.success("Configuração de IA salva");
  },
  upsertPrompt: async (data) => {
    const existing = get().prompts.find((p) => p.tipo === data.tipo);
    if (existing) {
      const { error } = await (supabase as any).from("ia_prompts").update(data).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
      set({ prompts: get().prompts.map((p) => (p.id === existing.id ? { ...p, ...data } as IAPrompt : p)) });
    } else {
      const { data: row, error } = await (supabase as any).from("ia_prompts").insert(data).select().single();
      if (error) { toast.error(error.message); return; }
      set({ prompts: [...get().prompts, row as IAPrompt] });
    }
    toast.success("Prompt salvo");
  },
}));

export function useIAConfigBootstrap() {
  const loaded = useIAConfig((s) => s.loaded);
  const load = useIAConfig((s) => s.load);
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
}
