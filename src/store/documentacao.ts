import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DocTipo =
  | "drive"
  | "site"
  | "lp"
  | "instagram"
  | "facebook"
  | "google_ads"
  | "meta_business"
  | "whatsapp"
  | "acesso"
  | "outro";

export const DOC_TIPO_LABEL: Record<DocTipo, string> = {
  drive: "Drive / Pasta",
  site: "Site",
  lp: "Landing Page",
  instagram: "Instagram",
  facebook: "Facebook",
  google_ads: "Google Ads",
  meta_business: "Meta Business",
  whatsapp: "WhatsApp Business",
  acesso: "Acesso / Login",
  outro: "Outro",
};

export const DOC_TIPOS: DocTipo[] = [
  "drive",
  "site",
  "lp",
  "instagram",
  "facebook",
  "google_ads",
  "meta_business",
  "whatsapp",
  "acesso",
  "outro",
];

export interface DocumentacaoItem {
  id: string;
  cliente_id: string;
  tipo: DocTipo;
  titulo: string;
  url: string | null;
  login: string | null;
  senha: string | null;
  observacao: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

interface State {
  itens: DocumentacaoItem[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  create: (
    item: Omit<DocumentacaoItem, "id" | "created_at" | "updated_at" | "ordem"> & { ordem?: number }
  ) => Promise<string | null>;
  update: (id: string, patch: Partial<DocumentacaoItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useDocumentacao = create<State>((set, get) => ({
  itens: [],
  loaded: false,
  loading: false,

  async load() {
    if (get().loading) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("cliente_documentacao")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar documentação", { description: error.message });
      set({ loading: false });
      return;
    }
    set({ itens: (data ?? []) as DocumentacaoItem[], loaded: true, loading: false });
  },

  async create(item) {
    const payload = {
      cliente_id: item.cliente_id,
      tipo: item.tipo,
      titulo: item.titulo,
      url: item.url,
      login: item.login,
      senha: item.senha,
      observacao: item.observacao,
      ordem: item.ordem ?? 0,
    };
    const { data, error } = await supabase
      .from("cliente_documentacao")
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return null;
    }
    set({ itens: [...get().itens, data as DocumentacaoItem] });
    toast.success("Item adicionado");
    return data.id;
  },

  async update(id, patch) {
    const clean: any = { ...patch };
    delete clean.id;
    delete clean.created_at;
    delete clean.updated_at;
    const { data, error } = await supabase
      .from("cliente_documentacao")
      .update(clean)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao atualizar", { description: error.message });
      return;
    }
    set({
      itens: get().itens.map((i) => (i.id === id ? (data as DocumentacaoItem) : i)),
    });
  },

  async remove(id) {
    const { error } = await supabase
      .from("cliente_documentacao")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    set({ itens: get().itens.filter((i) => i.id !== id) });
    toast.success("Item removido");
  },
}));

export function useDocumentacaoBootstrap() {
  const load = useDocumentacao((s) => s.load);
  useEffect(() => {
    load();
    const channel = supabase
      .channel(`doc-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cliente_documentacao" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
