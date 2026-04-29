import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PlanStatus = "pendente" | "em_andamento" | "concluido" | "atrasado";
export type PlanSituacao = "precisa_criar" | "ja_possui" | "nao_aplicavel";
export type PlanPrioridade = "baixa" | "media" | "alta" | "urgente";

export interface PlanItem {
  id: string;
  cliente_id: string;
  bloco: string;
  secao: string;
  titulo: string;
  descricao: string | null;
  status: PlanStatus;
  situacao: PlanSituacao;
  responsavel_id: string | null;
  prazo: string | null;
  prioridade: PlanPrioridade;
  observacao: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export const PLAN_BLOCOS: Array<{ key: string; label: string; secoes: Array<{ key: string; label: string; icone: string }> }> = [
  {
    key: "onboarding",
    label: "Etapa 1 — Onboarding e Configuração",
    secoes: [
      { key: "inicio_projeto", label: "Início do Projeto", icone: "🧩" },
      { key: "estrategia", label: "Estratégia", icone: "📊" },
      { key: "presenca", label: "Estrutura de Presença", icone: "📱" },
    ],
  },
  {
    key: "campanhas",
    label: "Campanhas — Meta Ads + Google Ads",
    secoes: [
      { key: "meta", label: "Estrutura Meta Ads", icone: "📢" },
      { key: "google_estrutura", label: "Estrutura Google", icone: "🌐" },
      { key: "web", label: "Estrutura Web", icone: "🧱" },
      { key: "tecnico", label: "Configurações Técnicas", icone: "⚙️" },
      { key: "google_ads", label: "Campanhas Google Ads", icone: "🔍" },
      { key: "gestao", label: "Gestão e Otimização", icone: "📈" },
    ],
  },
  {
    key: "conteudo",
    label: "Conteúdo",
    secoes: [{ key: "social", label: "Social Media", icone: "📲" }],
  },
];

const SEED_ITENS: Array<Omit<PlanItem, "id" | "cliente_id" | "created_at" | "updated_at">> = [
  // Onboarding > Início do Projeto
  { bloco: "onboarding", secao: "inicio_projeto", titulo: "Reunião de Start do Projeto", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 0 },
  { bloco: "onboarding", secao: "inicio_projeto", titulo: "Análise das informações coletadas", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 1 },
  { bloco: "onboarding", secao: "inicio_projeto", titulo: "Criação e envio do planejamento", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 2 },
  { bloco: "onboarding", secao: "inicio_projeto", titulo: "Envio do material de boas-vindas", descricao: "Conectado à aba Documentação e Acessos > Materiais enviados.", status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 3 },
  { bloco: "onboarding", secao: "inicio_projeto", titulo: "Envio do vídeo de treinamento comercial", descricao: "Conectado à aba Documentação e Acessos > Materiais enviados.", status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 4 },
  { bloco: "onboarding", secao: "inicio_projeto", titulo: "Envio do script de atendimento", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 5 },
  // Onboarding > Estratégia
  { bloco: "onboarding", secao: "estrategia", titulo: "Análise de mercado (palavras-chave e volume de pesquisas)", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 0 },
  // Onboarding > Presença
  { bloco: "onboarding", secao: "presenca", titulo: "Página do Facebook", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 0 },
  { bloco: "onboarding", secao: "presenca", titulo: "Instagram", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 1 },

  // Campanhas > Meta
  { bloco: "campanhas", secao: "meta", titulo: "Criação da BM (Gerenciador de Anúncios)", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 0 },
  { bloco: "campanhas", secao: "meta", titulo: "Criação e validação dos anúncios em imagem", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 1 },
  { bloco: "campanhas", secao: "meta", titulo: "Criação e validação dos anúncios em vídeo com IA", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 2 },
  { bloco: "campanhas", secao: "meta", titulo: "Roteiros para vídeos de anúncios (gravados)", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 3 },
  { bloco: "campanhas", secao: "meta", titulo: "Ativação das campanhas no Meta Ads", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "alta", observacao: null, ordem: 4 },
  // Campanhas > Google Estrutura
  { bloco: "campanhas", secao: "google_estrutura", titulo: "Criação do Gmail", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 0 },
  { bloco: "campanhas", secao: "google_estrutura", titulo: "Criação do Google Ads", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 1 },
  { bloco: "campanhas", secao: "google_estrutura", titulo: "Gestão / Criação do Google Meu Negócio", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 2 },
  // Campanhas > Web
  { bloco: "campanhas", secao: "web", titulo: "Criação da Landing Page", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 0 },
  { bloco: "campanhas", secao: "web", titulo: "Configuração de domínio e hospedagem", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 1 },
  // Campanhas > Técnico
  { bloco: "campanhas", secao: "tecnico", titulo: "Configurações técnicas (WhatsApp, pixel, formas de pagamento)", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 0 },
  { bloco: "campanhas", secao: "tecnico", titulo: "Configuração da ferramenta de CRM / Agente de IA", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 1 },
  // Campanhas > Google Ads
  { bloco: "campanhas", secao: "google_ads", titulo: "Definição da estrutura de campanhas (palavras-chave, títulos, descrições)", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 0 },
  { bloco: "campanhas", secao: "google_ads", titulo: "Ativação das campanhas no Google Ads", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "alta", observacao: null, ordem: 1 },
  // Campanhas > Gestão
  { bloco: "campanhas", secao: "gestao", titulo: "Envio semanal de relatório de métricas", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 0 },
  { bloco: "campanhas", secao: "gestao", titulo: "Análise das campanhas e otimizações", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 1 },

  // Conteúdo > Social
  { bloco: "conteudo", secao: "social", titulo: "Construção dos Posts (Feed Instagram)", descricao: null, status: "pendente", situacao: "precisa_criar", responsavel_id: null, prazo: null, prioridade: "media", observacao: null, ordem: 0 },
];

interface State {
  itens: PlanItem[];
  loaded: boolean;
  loading: boolean;
  seedingClientes: Set<string>;
  load: () => Promise<void>;
  ensureSeed: (clienteId: string) => Promise<void>;
  create: (item: Partial<PlanItem> & { cliente_id: string; bloco: string; titulo: string }) => Promise<void>;
  update: (id: string, patch: Partial<PlanItem>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicar: (id: string) => Promise<void>;
  reorder: (clienteId: string, bloco: string, secao: string, idsInOrder: string[]) => Promise<void>;
}

export const usePlanejamento = create<State>((set, get) => ({
  itens: [],
  loaded: false,
  loading: false,
  seedingClientes: new Set(),

  async load() {
    if (get().loading) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("cliente_planejamento_itens")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar planejamento", { description: error.message });
      set({ loading: false });
      return;
    }
    set({ itens: (data ?? []) as PlanItem[], loaded: true, loading: false });
  },

  async ensureSeed(clienteId) {
    if (get().seedingClientes.has(clienteId)) return;
    const has = get().itens.some((i) => i.cliente_id === clienteId);
    if (has) return;

    // double-check no banco
    const { count } = await supabase
      .from("cliente_planejamento_itens")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", clienteId);
    if ((count ?? 0) > 0) {
      await get().load();
      return;
    }

    const next = new Set(get().seedingClientes);
    next.add(clienteId);
    set({ seedingClientes: next });

    const payload = SEED_ITENS.map((s) => ({ ...s, cliente_id: clienteId }));
    const { error } = await supabase.from("cliente_planejamento_itens").insert(payload);
    if (error) {
      toast.error("Erro ao inicializar planejamento", { description: error.message });
    } else {
      await get().load();
    }
    const after = new Set(get().seedingClientes);
    after.delete(clienteId);
    set({ seedingClientes: after });
  },

  async create(item) {
    const payload: any = {
      cliente_id: item.cliente_id,
      bloco: item.bloco,
      secao: item.secao ?? "",
      titulo: item.titulo,
      descricao: item.descricao ?? null,
      status: item.status ?? "pendente",
      situacao: item.situacao ?? "precisa_criar",
      responsavel_id: item.responsavel_id ?? null,
      prazo: item.prazo ?? null,
      prioridade: item.prioridade ?? "media",
      observacao: item.observacao ?? null,
      ordem: item.ordem ?? 999,
    };
    const { data, error } = await supabase
      .from("cliente_planejamento_itens")
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao adicionar item", { description: error.message });
      return;
    }
    set({ itens: [...get().itens, data as PlanItem] });
  },

  async update(id, patch) {
    const clean: any = { ...patch };
    delete clean.id;
    delete clean.created_at;
    delete clean.updated_at;
    delete clean.cliente_id;
    const { data, error } = await supabase
      .from("cliente_planejamento_itens")
      .update(clean)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    set({ itens: get().itens.map((i) => (i.id === id ? (data as PlanItem) : i)) });
  },

  async remove(id) {
    const { error } = await supabase.from("cliente_planejamento_itens").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover", { description: error.message });
      return;
    }
    set({ itens: get().itens.filter((i) => i.id !== id) });
  },

  async duplicar(id) {
    const orig = get().itens.find((i) => i.id === id);
    if (!orig) return;
    await get().create({
      ...orig,
      titulo: `${orig.titulo} (cópia)`,
      ordem: orig.ordem + 1,
    });
  },

  async reorder(clienteId, bloco, secao, idsInOrder) {
    const updates = idsInOrder.map((id, idx) =>
      supabase.from("cliente_planejamento_itens").update({ ordem: idx }).eq("id", id),
    );
    await Promise.all(updates);
    set({
      itens: get().itens.map((i) => {
        if (i.cliente_id !== clienteId || i.bloco !== bloco || i.secao !== secao) return i;
        const idx = idsInOrder.indexOf(i.id);
        return idx >= 0 ? { ...i, ordem: idx } : i;
      }),
    });
  },
}));

export function usePlanejamentoBootstrap() {
  const load = usePlanejamento((s) => s.load);
  useEffect(() => {
    load();
    const channel = supabase
      .channel(`plan-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cliente_planejamento_itens" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Helpers
export function isItemAtrasado(it: PlanItem): boolean {
  if (it.situacao === "ja_possui" || it.situacao === "nao_aplicavel") return false;
  if (it.status === "concluido") return false;
  if (!it.prazo) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return new Date(it.prazo) < hoje;
}

export function calcularProgresso(itens: PlanItem[]) {
  const total = itens.length;
  const naoAplicavel = itens.filter((i) => i.situacao === "nao_aplicavel").length;
  const jaPossui = itens.filter((i) => i.situacao === "ja_possui").length;
  const concluidos = itens.filter((i) => i.status === "concluido").length;
  const atrasados = itens.filter((i) => isItemAtrasado(i)).length;
  const considerados = total - naoAplicavel;
  const pendentes = considerados - concluidos;
  const pct = considerados > 0 ? Math.round((concluidos / considerados) * 100) : 0;
  return { total, naoAplicavel, jaPossui, concluidos, atrasados, pendentes, pct };
}
