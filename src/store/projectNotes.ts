import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProjectNote {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  pinned: boolean;
  author_id: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectNotesStore {
  notes: ProjectNote[];
  loading: boolean;
  fetchNotes: (clientId: string) => Promise<void>;
  addNote: (note: Partial<ProjectNote>) => Promise<void>;
  updateNote: (id: string, updates: Partial<ProjectNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useProjectNotes = create<ProjectNotesStore>((set, get) => ({
  notes: [],
  loading: false,
  fetchNotes: async (clientId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("project_notes")
        .select("*")
        .eq("client_id", clientId)
        .eq("archived", false)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      set({ notes: data || [] });
    } catch (error: any) {
      console.error("Erro ao buscar observações:", error);
      toast.error("Não foi possível carregar as observações.");
    } finally {
      set({ loading: false });
    }
  },
  addNote: async (note: Partial<ProjectNote>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const insertData = { ...note, author_id: userData.user?.id } as any;
      const { data, error } = await supabase
        .from("project_notes")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      
      const updatedNotes = [data, ...get().notes].sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      set({ notes: updatedNotes });
      toast.success("Observação adicionada com sucesso.");
    } catch (error: any) {
      console.error("Erro ao adicionar observação:", error);
      toast.error("Não foi possível adicionar a observação.");
    }
  },
  updateNote: async (id: string, updates: Partial<ProjectNote>) => {
    try {
      const { error } = await supabase
        .from("project_notes")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      
      if (updates.archived) {
          set({ notes: get().notes.filter(n => n.id !== id) });
      } else {
          const updatedNotes = get().notes.map(n => n.id === id ? { ...n, ...updates } : n)
              .sort((a, b) => {
                  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });
          set({ notes: updatedNotes });
      }
      toast.success("Observação atualizada.");
    } catch (error: any) {
      console.error("Erro ao atualizar observação:", error);
      toast.error("Não foi possível atualizar a observação.");
    }
  },
  deleteNote: async (id: string) => {
    try {
      const { error } = await supabase
        .from("project_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      set({ notes: get().notes.filter(n => n.id !== id) });
      toast.success("Observação excluída.");
    } catch (error: any) {
      console.error("Erro ao excluir observação:", error);
      toast.error("Não foi possível excluir a observação.");
    }
  }
}));
