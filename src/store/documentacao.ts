import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DocBloco = "acessos" | "links" | "reunioes" | "materiais" | "documentos";

export const DOC_BLOCO_LABEL: Record<DocBloco, string> = {
  acessos: "Acessos",
  links: "Links importantes",
  reunioes: "Reuniões",
  materiais: "Materiais enviados ao cliente",
  documentos: "Documentos",
};

export const DOC_BLOCOS: DocBloco[] = [
  "acessos",
  "links",
  "reunioes",
  "materiais",
  "documentos",
];

// Tipos por bloco
export const TIPOS_POR_BLOCO: Record<DocBloco, Array<{ value: string; label: string }>> = {
  acessos: [
    { value: "mensagem", label: "Mensagem completa" },
    { value: "gmail", label: "Gmail" },
    { value: "google_ads", label: "Google Ads" },
    { value: "meta_business", label: "Meta Business" },
    { value: "facebook", label: "Facebook" },
    { value: "instagram", label: "Instagram" },
    { value: "google_meu_negocio", label: "Google Meu Negócio" },
    { value: "whatsapp", label: "WhatsApp Business" },
    { value: "crm", label: "CRM / Agente de IA" },
    { value: "hospedagem", label: "Hospedagem" },
    { value: "dominio", label: "Domínio" },
    { value: "wix", label: "Wix" },
    { value: "wordpress", label: "WordPress" },
    { value: "lovable", label: "Lovable" },
    { value: "outro", label: "Outro" },
  ],
  links: [
    { value: "mensagem", label: "Mensagem completa" },
    { value: "drive", label: "Drive do cliente" },
    { value: "pasta", label: "Pasta de materiais" },
    { value: "site", label: "Site" },
    { value: "lp", label: "Landing Page" },
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "whatsapp", label: "WhatsApp Business" },
    { value: "meta_business", label: "Meta Business" },
    { value: "google_ads", label: "Google Ads" },
    { value: "google_meu_negocio", label: "Google Meu Negócio" },
    { value: "planilha", label: "Planilha de acompanhamento" },
    { value: "outro", label: "Outros links" },
  ],
  reunioes: [
    { value: "mensagem", label: "Mensagem completa" },
    { value: "reuniao_fechamento", label: "Reunião de fechamento" },
    { value: "reuniao_start", label: "Reunião de start" },
    { value: "reuniao_briefing", label: "Reunião de briefing" },
    { value: "reuniao_alinhamento", label: "Reunião de alinhamento" },
    { value: "reuniao_performance", label: "Reunião de performance" },
    { value: "reuniao", label: "Outras reuniões" },
  ],
  materiais: [
    { value: "mensagem", label: "Mensagem completa" },
    { value: "boas_vindas", label: "Material de Boas-Vindas ADS BR" },
    { value: "treinamento", label: "Treinamento Comercial (Loom)" },
    { value: "script", label: "Script de Atendimento" },
    { value: "planilha", label: "Planilha de leads" },
    { value: "material", label: "Outro material" },
  ],
  documentos: [
    { value: "mensagem", label: "Mensagem completa" },
    { value: "briefing", label: "Briefing" },
    { value: "planejamento", label: "Planejamento" },
    { value: "contrato", label: "Contrato" },
    { value: "material_cliente", label: "Materiais enviados pelo cliente" },
    { value: "material_agencia", label: "Materiais da agência" },
    { value: "complementar", label: "Arquivos complementares" },
    { value: "outro", label: "Outros documentos" },
  ],
};

export const DOC_TIPO_LABEL: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  Object.values(TIPOS_POR_BLOCO).forEach((arr) => {
    arr.forEach((t) => {
      out[t.value] = t.label;
    });
  });
  // Compatibilidade com tipos antigos
  out.acesso = "Acesso / Login";
  return out;
})();

export interface DocumentacaoItem {
  id: string;
  cliente_id: string;
  bloco: DocBloco;
  tipo: string;
  titulo: string;
  url: string | null;
  login: string | null;
  senha: string | null;
  observacao: string | null;
  data_evento: string | null;
  enviado_por: string | null;
  formato: string | null;
  ordem: number;
  origem_global_id: string | null;
  enviado: boolean;
  data_envio: string | null;
  created_at: string;
  updated_at: string;
}

interface State {
  itens: DocumentacaoItem[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  create: (
    item: Omit<DocumentacaoItem, "id" | "created_at" | "updated_at" | "ordem" | "origem_global_id" | "enviado" | "data_envio"> & { ordem?: number; origem_global_id?: string | null; enviado?: boolean; data_envio?: string | null },
  ) => Promise<string | null>;
  createBatch: (
    items: Array<Omit<DocumentacaoItem, "id" | "created_at" | "updated_at" | "ordem" | "origem_global_id" | "enviado" | "data_envio"> & { ordem?: number; origem_global_id?: string | null }>,
  ) => Promise<void>;
  update: (id: string, patch: Partial<DocumentacaoItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  applyGlobalDefaults: (clienteId: string) => Promise<{ inseridos: number; jaExistiam: number }>;
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
      bloco: item.bloco ?? "documentos",
      tipo: item.tipo,
      titulo: item.titulo,
      url: item.url,
      login: item.login,
      senha: item.senha,
      observacao: item.observacao,
      data_evento: item.data_evento ?? null,
      enviado_por: item.enviado_por ?? null,
      formato: item.formato ?? null,
      ordem: item.ordem ?? 0,
      origem_global_id: (item as any).origem_global_id ?? null,
      enviado: (item as any).enviado ?? false,
      data_envio: (item as any).data_envio ?? null,
    };
    const { data, error } = await supabase
      .from("cliente_documentacao")
      .insert(payload as any)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return null;
    }
    set({ itens: [...get().itens, data as unknown as DocumentacaoItem] });
    toast.success("Item adicionado");
    return (data as any).id;
  },

  async createBatch(items) {
    if (items.length === 0) return;
    const payload = items.map((item) => ({
      cliente_id: item.cliente_id,
      bloco: item.bloco ?? "documentos",
      tipo: item.tipo,
      titulo: item.titulo,
      url: item.url,
      login: item.login,
      senha: item.senha,
      observacao: item.observacao,
      data_evento: item.data_evento ?? null,
      enviado_por: item.enviado_por ?? null,
      formato: item.formato ?? null,
      ordem: item.ordem ?? 0,
      origem_global_id: (item as any).origem_global_id ?? null,
    }));
    const { data, error } = await supabase
      .from("cliente_documentacao")
      .insert(payload as any)
      .select();
    if (error) {
      toast.error("Erro ao salvar em lote", { description: error.message });
      return;
    }
    set({ itens: [...get().itens, ...((data ?? []) as unknown as DocumentacaoItem[])] });
    toast.success(`${data?.length ?? 0} itens adicionados`);
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
      itens: get().itens.map((i) => (i.id === id ? (data as unknown as DocumentacaoItem) : i)),
    });
  },

  async remove(id) {
    const { error } = await supabase.from("cliente_documentacao").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    set({ itens: get().itens.filter((i) => i.id !== id) });
    toast.success("Item removido");
  },

  async applyGlobalDefaults(clienteId) {
    const { data: globais, error } = await supabase
      .from("documentos_globais" as any)
      .select("*")
      .eq("escopo", "cliente")
      .eq("ativo", true)
      .eq("aplicar_automatico", true)
      .order("ordem", { ascending: true });
    if (error) {
      toast.error("Erro ao buscar documentos padrão", { description: error.message });
      return { inseridos: 0, jaExistiam: 0 };
    }
    const lista = (globais ?? []) as any[];
    if (lista.length === 0) {
      toast.message("Nenhum documento padrão ativo para aplicar.");
      return { inseridos: 0, jaExistiam: 0 };
    }
    const itensCliente = get().itens.filter((i) => i.cliente_id === clienteId);
    const jaTemSet = new Set(itensCliente.map((i) => i.origem_global_id).filter(Boolean));
    const novos = lista.filter((g) => !jaTemSet.has(g.id));
    if (novos.length === 0) {
      toast.success("Cliente já possui todos os documentos padrão.");
      return { inseridos: 0, jaExistiam: lista.length };
    }
    const baseOrdem = (itensCliente.at(-1)?.ordem ?? 0) + 1;
    const payload = novos.map((g, i) => ({
      cliente_id: clienteId,
      bloco: g.bloco ?? "materiais",
      tipo: g.tipo ?? "material",
      titulo: g.titulo,
      url: g.url ?? null,
      login: g.login ?? null,
      senha: g.senha ?? null,
      observacao: g.descricao ?? null,
      data_evento: null,
      enviado_por: null,
      formato: null,
      ordem: baseOrdem + i,
      origem_global_id: g.id,
      enviado: false,
      data_envio: null,
    }));
    const { data, error: insErr } = await supabase
      .from("cliente_documentacao")
      .insert(payload as any)
      .select();
    if (insErr) {
      toast.error("Erro ao aplicar documentos padrão", { description: insErr.message });
      return { inseridos: 0, jaExistiam: lista.length - novos.length };
    }
    set({ itens: [...get().itens, ...((data ?? []) as unknown as DocumentacaoItem[])] });
    toast.success(
      `${data?.length ?? 0} documento(s) padrão aplicado(s)` +
        (lista.length - novos.length > 0 ? ` (${lista.length - novos.length} já existiam)` : ""),
    );
    return { inseridos: data?.length ?? 0, jaExistiam: lista.length - novos.length };
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
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Mantido para compat com componentes antigos
export type DocTipo = string;
export const DOC_TIPOS: string[] = Array.from(
  new Set(Object.values(TIPOS_POR_BLOCO).flatMap((arr) => arr.map((t) => t.value))),
);
