import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SetorPrompt {
  id: string;
  setor: string;
  prompt: string;
  created_at: string;
  updated_at: string;
}

export interface TarefaConsulta {
  id: string;
  demanda_id: string;
  usuario_id: string | null;
  pergunta: string;
  resposta: string;
  fontes: string[] | null;
  nivel_confianca: string | null;
  created_at: string;
}

interface State {
  setorPrompts: SetorPrompt[];
  tarefaConsultas: TarefaConsulta[];
  loaded: boolean;
  loading: boolean;
  loadSetorPrompts: () => Promise<void>;
  loadConsultasByDemanda: (demandaId: string) => Promise<void>;
  upsertSetorPrompt: (setor: string, prompt: string) => Promise<void>;
  consultarIA: (params: {
    demanda_id: string;
    pergunta: string;
    cliente_nome: string;
    tarefa_titulo: string;
    tarefa_categoria: string;
    tarefa_subtipo?: string | null;
    tarefa_prioridade: string;
    tarefa_descricao?: string | null;
    tarefa_comentarios?: string | null;
    reunioes: any[];
    setor_prompt?: string;
  }) => Promise<any>;
}

export const useIAConsultas = create<State>((set, get) => ({
  setorPrompts: [],
  tarefaConsultas: [],
  loaded: false,
  loading: false,

  loadSetorPrompts: async () => {
    const { data, error } = await supabase.from("ia_setor_prompts").select("*");
    if (error) {
      console.error("Erro ao carregar prompts por setor:", error);
      return;
    }
    set({ setorPrompts: data as SetorPrompt[], loaded: true });
  },

  loadConsultasByDemanda: async (demandaId) => {
    const { data, error } = await supabase
      .from("ia_tarefa_consultas")
      .select("*")
      .eq("demanda_id", demandaId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Erro ao carregar consultas da tarefa:", error);
      return;
    }
    set({ tarefaConsultas: data as TarefaConsulta[] });
  },

  upsertSetorPrompt: async (setor, prompt) => {
    const existing = get().setorPrompts.find((p) => p.setor === setor);
    if (existing) {
      const { error } = await supabase
        .from("ia_setor_prompts")
        .update({ prompt, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) {
        toast.error("Erro ao atualizar prompt: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("ia_setor_prompts")
        .insert({ setor, prompt });
      if (error) {
        toast.error("Erro ao criar prompt: " + error.message);
        return;
      }
    }
    await get().loadSetorPrompts();
    toast.success("Prompt atualizado");
  },

  consultarIA: async (params) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.functions.invoke("ia-consultar-tarefa", {
        body: params,
      });

      if (error) {
        toast.error("Erro na consulta de IA: " + error.message);
        return null;
      }

      // Atualiza o histórico local se a consulta for para a demanda atual
      await get().loadConsultasByDemanda(params.demanda_id);
      
      return data;
    } catch (err: any) {
      toast.error("Falha ao consultar IA: " + err.message);
      return null;
    } finally {
      set({ loading: false });
    }
  },
}));
