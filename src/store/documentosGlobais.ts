import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DocGlobalEscopo = "cliente" | "interno";
export type DocGlobalBloco = "acessos" | "links" | "reunioes" | "materiais" | "documentos";

export const DOC_GLOBAL_CATEGORIAS = [
  "Boas-vindas",
  "Treinamento",
  "Comercial",
  "CRM / Automação",
  "Atendimento",
  "Tráfego Pago",
  "Documentos gerais",
  "Outros",
] as const;

export type DocGlobalCategoria = typeof DOC_GLOBAL_CATEGORIAS[number];

export interface DocumentoGlobal {
  id: string;
  escopo: DocGlobalEscopo;
  titulo: string;
  tipo: string;
  bloco: DocGlobalBloco;
  categoria: string;
  descricao: string | null;
  url: string | null;
  arquivo_url: string | null;
  login: string | null;
  senha: string | null;
  observacao_interna: string | null;
  aplicar_automatico: boolean;
  permissao_acesso: "todos" | "admin";
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export type DocumentoGlobalInput = Omit<
  DocumentoGlobal,
  "id" | "created_at" | "updated_at"
>;

interface State {
  itens: DocumentoGlobal[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  create: (data: Partial<DocumentoGlobalInput>) => Promise<string | null>;
  update: (id: string, patch: Partial<DocumentoGlobal>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  toggleAtivo: (id: string) => Promise<void>;
  reorder: (id: string, direction: "up" | "down") => Promise<void>;
}

export const useDocumentosGlobais = create<State>((set, get) => ({
  itens: [],
  loaded: false,
  loading: false,

  async load() {
    if (get().loading) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("documentos_globais" as any)
      .select("*")
      .order("escopo", { ascending: true })
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar documentos globais", { description: error.message });
      set({ loading: false });
      return;
    }
    set({ itens: (data ?? []) as unknown as DocumentoGlobal[], loaded: true, loading: false });
  },

  async create(data) {
    const escopo: DocGlobalEscopo = (data.escopo as DocGlobalEscopo) ?? "cliente";
    const ordem =
      data.ordem ??
      (get().itens.filter((i) => i.escopo === escopo).at(-1)?.ordem ?? 0) + 1;
    const payload = {
      escopo,
      titulo: data.titulo ?? "Sem título",
      tipo: data.tipo ?? "material",
      bloco: data.bloco ?? "materiais",
      categoria: data.categoria ?? "Outros",
      descricao: data.descricao ?? null,
      url: data.url ?? null,
      arquivo_url: data.arquivo_url ?? null,
      login: data.login ?? null,
      senha: data.senha ?? null,
      observacao_interna: data.observacao_interna ?? null,
      aplicar_automatico: data.aplicar_automatico ?? (escopo === "cliente"),
      permissao_acesso: data.permissao_acesso ?? "todos",
      ativo: data.ativo ?? true,
      ordem,
    };
    const { data: inserted, error } = await supabase
      .from("documentos_globais" as any)
      .insert(payload as any)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return null;
    }
    set({ itens: [...get().itens, inserted as unknown as DocumentoGlobal] });
    toast.success("Documento criado");
    return (inserted as any).id;
  },

  async update(id, patch) {
    const clean: any = { ...patch };
    delete clean.id;
    delete clean.created_at;
    delete clean.updated_at;
    const { data, error } = await supabase
      .from("documentos_globais" as any)
      .update(clean)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao atualizar", { description: error.message });
      return;
    }
    set({
      itens: get().itens.map((i) => (i.id === id ? (data as unknown as DocumentoGlobal) : i)),
    });
  },

  async remove(id) {
    const { error } = await supabase.from("documentos_globais" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    set({ itens: get().itens.filter((i) => i.id !== id) });
    toast.success("Documento excluído");
  },

  async duplicate(id) {
    const orig = get().itens.find((i) => i.id === id);
    if (!orig) return;
    await get().create({
      escopo: orig.escopo,
      titulo: `${orig.titulo} (cópia)`,
      tipo: orig.tipo,
      bloco: orig.bloco,
      categoria: orig.categoria,
      descricao: orig.descricao,
      url: orig.url,
      arquivo_url: orig.arquivo_url,
      login: orig.login,
      senha: orig.senha,
      observacao_interna: orig.observacao_interna,
      aplicar_automatico: orig.aplicar_automatico,
      permissao_acesso: orig.permissao_acesso,
      ativo: orig.ativo,
    });
  },

  async toggleAtivo(id) {
    const item = get().itens.find((i) => i.id === id);
    if (!item) return;
    await get().update(id, { ativo: !item.ativo });
  },

  async reorder(id, direction) {
    const item = get().itens.find((i) => i.id === id);
    if (!item) return;
    const lista = get()
      .itens.filter((i) => i.escopo === item.escopo)
      .sort((a, b) => a.ordem - b.ordem);
    const idx = lista.findIndex((i) => i.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= lista.length) return;
    const other = lista[swapIdx];
    await Promise.all([
      get().update(item.id, { ordem: other.ordem }),
      get().update(other.id, { ordem: item.ordem }),
    ]);
  },
}));

export function useDocumentosGlobaisBootstrap() {
  const load = useDocumentosGlobais((s) => s.load);
  useEffect(() => {
    load();
    const channel = supabase
      .channel(`docs-globais-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documentos_globais" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
