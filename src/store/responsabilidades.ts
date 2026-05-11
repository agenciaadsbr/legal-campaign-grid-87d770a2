import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    const { data, error } = await (supabase as any).from("responsabilidades_equipe").select("*");
    if (error) {
      toast.error("Erro: " + error.message);
      return;
    }
    set({ itens: (data ?? []) as Responsabilidade[], loaded: true });
  },
  upsert: async (data) => {
    const existing = get().itens.find((i) => i.profile_id === data.profile_id);
    if (existing) {
      const { error } = await (supabase as any).from("responsabilidades_equipe").update(data).eq("id", existing.id);
      if (error) {
        toast.error("Erro: " + error.message);
        return;
      }
      set({ itens: get().itens.map((i) => (i.id === existing.id ? { ...i, ...data } as Responsabilidade : i)) });
    } else {
      const { data: row, error } = await (supabase as any).from("responsabilidades_equipe").insert(data).select().single();
      if (error) {
        toast.error("Erro: " + error.message);
        return;
      }
      set({ itens: [...get().itens, row as Responsabilidade] });
    }
    toast.success("Responsabilidades salvas");
  },
  remove: async (id) => {
    const { error } = await (supabase as any).from("responsabilidades_equipe").delete().eq("id", id);
    if (error) {
      toast.error("Erro: " + error.message);
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
