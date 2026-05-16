import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface Responsabilidade {
  id: string;
  profile_id: string;
  cargo: string | null;
  areas: string[];
  skills: string[];
  setores: string[];
  responsabilidades: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  status: string | null;
  funcao_principal: string | null;
  supervisor_padrao_id: string | null;
  setores_areas_texto: string | null;
  skills_competencias_texto: string | null;
  responsabilidades_fixas: string | null;
  tarefas_diarias: string | null;
  tarefas_semanais: string | null;
  demandas_ia: string | null;
  palavras_chave_ia: string | null;
  quando_acionar: string | null;
  quando_nao_acionar: string | null;
  observacoes_ia: string | null;
  prioridade_padrao: string | null;
  regras_prioridade: string | null;
  prazo_padrao_sugerido: string | null;
  ferramentas_utilizadas: string | null;
  entregaveis_esperados: string | null;
  checklist_padrao: string | null;
  tipos_participacao: string[] | null;
  setores_compativeis: string[] | null;
  regras_atribuicao: Json | null;
}

interface State {
  itens: Responsabilidade[];
  loaded: boolean;
  load: () => Promise<void>;
  upsert: (data: Partial<Responsabilidade> & { profile_id: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useResponsabilidades = create<State>((set, get) => ({
  itens: [],
  loaded: false,
  load: async () => {
    const { data, error } = await supabase.from("responsabilidades_equipe").select("*");
    if (error) {
      toast.error("Erro ao carregar: " + error.message);
      return;
    }
    set({ itens: (data ?? []) as Responsabilidade[], loaded: true });
  },
  upsert: async (data) => {
    const existing = get().itens.find((i) => i.profile_id === data.profile_id);
    if (existing) {
      const { error } = await supabase.from("responsabilidades_equipe").update(data).eq("id", existing.id);
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }
      set({ itens: get().itens.map((i) => (i.id === existing.id ? { ...i, ...data } as Responsabilidade : i)) });
    } else {
      const { data: row, error } = await supabase.from("responsabilidades_equipe").insert(data).select().single();
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }
      set({ itens: [...get().itens, row as Responsabilidade] });
    }
    toast.success("Responsabilidades salvas com sucesso");
  },
  remove: async (id) => {
    const { error } = await supabase.from("responsabilidades_equipe").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    set({ itens: get().itens.filter((i) => i.id !== id) });
  },
}));

export function useResponsabilidadesBootstrap() {
  const loaded = useResponsabilidades((s) => s.loaded);
  const load = useResponsabilidades((s) => s.load);
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
}
