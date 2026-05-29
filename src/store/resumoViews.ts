import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export interface ResumoView {
  id: string;
  demanda_id: string;
  meeting_id: string | null;
  user_id: string;
  first_viewed_at: string;
  last_viewed_at: string;
  view_count: number;
}

interface State {
  views: Record<string, ResumoView[]>;
  loadingIds: Set<string>;
  load: (demandaIds: string[]) => Promise<void>;
  registrar: (
    demandaIds: string[],
    meetingId: string | null,
    userId: string,
  ) => Promise<ResumoView[]>;
  getMinha: (demandaId: string, userId: string) => ResumoView | undefined;
}

export const useResumoViews = create<State>((set, get) => ({
  views: {},
  loadingIds: new Set(),

  async load(demandaIds) {
    const ids = Array.from(new Set(demandaIds.filter(Boolean)));
    if (!ids.length) return;
    const { data, error } = await (supabase as any)
      .from("task_meeting_summary_views")
      .select("*")
      .in("demanda_id", ids);
    if (error) {
      console.error("[resumoViews] load erro", error);
      return;
    }
    const map: Record<string, ResumoView[]> = { ...get().views };
    ids.forEach((id) => {
      map[id] = (data || []).filter((v: ResumoView) => v.demanda_id === id);
    });
    set({ views: map });
  },

  async registrar(demandaIds, meetingId, userId) {
    const ids = Array.from(new Set(demandaIds.filter(Boolean)));
    if (!ids.length || !userId) return [];

    // Para upsert simples: tentar update; se 0 linhas, insert.
    const results: ResumoView[] = [];
    const now = new Date().toISOString();

    for (const demandaId of ids) {
      // Busca existente
      const { data: existing } = await (supabase as any)
        .from("task_meeting_summary_views")
        .select("*")
        .eq("demanda_id", demandaId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await (supabase as any)
          .from("task_meeting_summary_views")
          .update({
            last_viewed_at: now,
            view_count: (existing.view_count || 1) + 1,
            ...(meetingId ? { meeting_id: meetingId } : {}),
          })
          .eq("id", existing.id)
          .select()
          .maybeSingle();
        if (!error && data) results.push(data);
      } else {
        const { data, error } = await (supabase as any)
          .from("task_meeting_summary_views")
          .insert({
            demanda_id: demandaId,
            user_id: userId,
            meeting_id: meetingId,
            first_viewed_at: now,
            last_viewed_at: now,
            view_count: 1,
          })
          .select()
          .maybeSingle();
        if (!error && data) results.push(data);
      }
    }

    // Atualiza store local
    const map = { ...get().views };
    results.forEach((v) => {
      const arr = (map[v.demanda_id] || []).filter(
        (x) => x.user_id !== v.user_id,
      );
      arr.push(v);
      map[v.demanda_id] = arr;
    });
    set({ views: map });

    return results;
  },

  getMinha(demandaId, userId) {
    return (get().views[demandaId] || []).find((v) => v.user_id === userId);
  },
}));
