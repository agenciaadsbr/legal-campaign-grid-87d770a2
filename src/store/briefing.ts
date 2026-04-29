import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BriefingDoc {
  id: string;
  cliente_id: string;
  blocos: Record<string, string>;
  atualizado_por: string | null;
  created_at: string;
  updated_at: string;
}

export const BRIEFING_BLOCOS: Array<{ key: string; label: string; hint?: string }> = [
  { key: "resumo", label: "Resumo geral do cliente" },
  { key: "nicho", label: "Nicho / área de atuação" },
  { key: "servicos", label: "Serviços prioritários" },
  { key: "publico", label: "Público-alvo" },
  { key: "regiao", label: "Região de atuação" },
  { key: "diferenciais", label: "Diferenciais do cliente" },
  { key: "tom", label: "Tom de comunicação" },
  { key: "dores", label: "Principais dores do público" },
  { key: "estrategia", label: "Estratégia inicial" },
  { key: "anuncios", label: "Informações sobre anúncios" },
  { key: "posts", label: "Informações sobre posts" },
  { key: "videos", label: "Informações sobre vídeos" },
  { key: "lp", label: "Informações sobre landing page" },
  { key: "ia", label: "Informações sobre CRM / IA / atendimento" },
  { key: "observacoes", label: "Observações importantes" },
  { key: "links_reuniao", label: "Links da reunião" },
  { key: "materiais", label: "Arquivos ou materiais complementares" },
];

interface State {
  docs: Record<string, BriefingDoc>;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  getOrInit: (clienteId: string) => Promise<BriefingDoc | null>;
  saveBlocos: (clienteId: string, blocos: Record<string, string>) => Promise<void>;
}

export const useBriefing = create<State>((set, get) => ({
  docs: {},
  loaded: false,
  loading: false,

  async load() {
    if (get().loading) return;
    set({ loading: true });
    const { data, error } = await supabase.from("cliente_briefing").select("*");
    if (error) {
      toast.error("Erro ao carregar briefings", { description: error.message });
      set({ loading: false });
      return;
    }
    const map: Record<string, BriefingDoc> = {};
    (data ?? []).forEach((d: any) => {
      map[d.cliente_id] = { ...d, blocos: d.blocos ?? {} };
    });
    set({ docs: map, loaded: true, loading: false });
  },

  async getOrInit(clienteId) {
    const existing = get().docs[clienteId];
    if (existing) return existing;
    const { data: row } = await supabase
      .from("cliente_briefing")
      .select("*")
      .eq("cliente_id", clienteId)
      .maybeSingle();
    if (row) {
      const doc = { ...(row as any), blocos: (row as any).blocos ?? {} } as BriefingDoc;
      set({ docs: { ...get().docs, [clienteId]: doc } });
      return doc;
    }
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data: created, error } = await supabase
      .from("cliente_briefing")
      .insert({ cliente_id: clienteId, blocos: {}, atualizado_por: userId })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar briefing", { description: error.message });
      return null;
    }
    const doc = { ...(created as any), blocos: {} } as BriefingDoc;
    set({ docs: { ...get().docs, [clienteId]: doc } });
    return doc;
  },

  async saveBlocos(clienteId, blocos) {
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    const existing = get().docs[clienteId];
    if (!existing) {
      const created = await get().getOrInit(clienteId);
      if (!created) return;
    }
    const { data, error } = await supabase
      .from("cliente_briefing")
      .update({ blocos, atualizado_por: userId })
      .eq("cliente_id", clienteId)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao salvar briefing", { description: error.message });
      return;
    }
    set({
      docs: {
        ...get().docs,
        [clienteId]: { ...(data as any), blocos: (data as any).blocos ?? {} },
      },
    });
    toast.success("Briefing salvo");
  },
}));

export function useBriefingBootstrap() {
  const load = useBriefing((s) => s.load);
  useEffect(() => {
    load();
    const channel = supabase
      .channel(`briefing-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cliente_briefing" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
