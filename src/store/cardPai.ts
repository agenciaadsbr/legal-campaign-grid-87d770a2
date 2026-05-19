import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDemandas } from "@/store/demandas";

export type EtapaTipo = "tarefa_real" | "status_interno";

export interface CardPai {
  id: string;
  cliente_id: string;
  titulo: string;
  descricao: string | null;
  status_geral: string;
  responsaveis_ids: string[];
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardPaiEtapa {
  id: string;
  card_pai_id: string;
  ordem: number;
  tipo: EtapaTipo;
  titulo: string;
  categoria_alvo: string | null;
  responsavel_id: string | null;
  status_interno_valor: string | null;
  demanda_id: string | null;
  depends_on_etapa_id: string | null;
  liberado: boolean;
  concluido: boolean;
  concluido_em: string | null;
  created_at: string;
  updated_at: string;
}

interface State {
  cards: CardPai[];
  etapas: CardPaiEtapa[];
  loadingByCliente: Record<string, boolean>;
  loadedByCliente: Record<string, boolean>;

  loadByCliente: (clienteId: string, silent?: boolean) => Promise<void>;
  criarCardPai: (input: {
    cliente_id: string;
    titulo: string;
    descricao?: string;
    responsaveis_ids?: string[];
  }) => Promise<CardPai | null>;
  atualizarCardPai: (id: string, patch: Partial<Omit<CardPai, "id" | "created_at">>) => Promise<void>;
  removerCardPai: (id: string) => Promise<void>;

  adicionarEtapa: (input: Partial<CardPaiEtapa> & { card_pai_id: string; titulo: string; tipo: EtapaTipo }) => Promise<CardPaiEtapa | null>;
  atualizarEtapa: (id: string, patch: Partial<CardPaiEtapa>) => Promise<void>;
  removerEtapa: (id: string) => Promise<void>;
  concluirEtapaInterna: (id: string) => Promise<void>;
  liberarEtapa: (id: string) => Promise<void>;

  /** Cria uma demanda real vinculada ao Card Pai (categoria definida em categoria_alvo). */
  criarTarefaRealParaEtapa: (etapaId: string) => Promise<string | null>;
}

const VALID_CATEGORIAS = new Set([
  "Posts",
  "Videos",
  "TrafegoPago",
  "LpSite",
  "IAAtendimento",
  "Operacional",
  "Personalizado",
  "Urgencia",
]);

export const useCardPai = create<State>((set, get) => ({
  cards: [],
  etapas: [],
  loadingByCliente: {},
  loadedByCliente: {},

  async loadByCliente(clienteId, silent) {
    if (get().loadingByCliente[clienteId]) return;
    set((s) => ({ loadingByCliente: { ...s.loadingByCliente, [clienteId]: true } }));
    try {
      const [{ data: cards, error: e1 }, { data: etapas, error: e2 }] = await Promise.all([
        supabase.from("card_pai").select("*").eq("cliente_id", clienteId).order("created_at", { ascending: true }),
        supabase
          .from("card_pai_etapas")
          .select("*, card_pai!inner(cliente_id)")
          .eq("card_pai.cliente_id", clienteId)
          .order("ordem", { ascending: true }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const cardsByCliente = (cards ?? []) as CardPai[];
      const ids = new Set(cardsByCliente.map((c) => c.id));
      const etapasFiltradas = ((etapas ?? []) as any[]).map((e) => {
        const { card_pai: _omit, ...rest } = e;
        return rest as CardPaiEtapa;
      });
      set((s) => {
        // substitui cards e etapas DESTE cliente
        const cardsOutros = s.cards.filter((c) => c.cliente_id !== clienteId);
        const etapasOutros = s.etapas.filter((e) => !ids.has(e.card_pai_id) && !cardsByCliente.some((c) => c.id === e.card_pai_id));
        return {
          cards: [...cardsOutros, ...cardsByCliente],
          etapas: [...etapasOutros, ...etapasFiltradas],
          loadedByCliente: { ...s.loadedByCliente, [clienteId]: true },
        };
      });
    } catch (err) {
      if (!silent) toast.error("Erro ao carregar Cards Pai");
    } finally {
      set((s) => ({ loadingByCliente: { ...s.loadingByCliente, [clienteId]: false } }));
    }
  },

  async criarCardPai(input) {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("card_pai")
      .insert({
        cliente_id: input.cliente_id,
        titulo: input.titulo,
        descricao: input.descricao ?? null,
        responsaveis_ids: input.responsaveis_ids ?? [],
        criado_por: u.user?.id ?? null,
      })
      .select("*")
      .single();
    if (error) {
      toast.error("Erro ao criar Card Pai");
      return null;
    }
    set((s) => ({ cards: [...s.cards, data as CardPai] }));
    return data as CardPai;
  },

  async atualizarCardPai(id, patch) {
    const { error } = await supabase.from("card_pai").update(patch as any).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar Card Pai");
      return;
    }
    set((s) => ({
      cards: s.cards.map((c) => (c.id === id ? ({ ...c, ...patch } as CardPai) : c)),
    }));
  },

  async removerCardPai(id) {
    const { error } = await supabase.from("card_pai").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir Card Pai");
      return;
    }
    set((s) => ({
      cards: s.cards.filter((c) => c.id !== id),
      etapas: s.etapas.filter((e) => e.card_pai_id !== id),
    }));
  },

  async adicionarEtapa(input) {
    const ordemAtual = get().etapas.filter((e) => e.card_pai_id === input.card_pai_id).length;
    const liberado = input.depends_on_etapa_id ? false : true;
    const { data, error } = await supabase
      .from("card_pai_etapas")
      .insert({
        card_pai_id: input.card_pai_id,
        ordem: input.ordem ?? ordemAtual,
        tipo: input.tipo,
        titulo: input.titulo,
        categoria_alvo: input.categoria_alvo ?? null,
        responsavel_id: input.responsavel_id ?? null,
        status_interno_valor: input.status_interno_valor ?? null,
        demanda_id: input.demanda_id ?? null,
        depends_on_etapa_id: input.depends_on_etapa_id ?? null,
        liberado,
        concluido: false,
      })
      .select("*")
      .single();
    if (error) {
      toast.error("Erro ao adicionar etapa");
      return null;
    }
    set((s) => ({ etapas: [...s.etapas, data as CardPaiEtapa] }));
    return data as CardPaiEtapa;
  },

  async atualizarEtapa(id, patch) {
    const { error } = await supabase.from("card_pai_etapas").update(patch as any).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar etapa");
      return;
    }
    set((s) => ({
      etapas: s.etapas.map((e) => (e.id === id ? ({ ...e, ...patch } as CardPaiEtapa) : e)),
    }));
  },

  async removerEtapa(id) {
    const { error } = await supabase.from("card_pai_etapas").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover etapa");
      return;
    }
    set((s) => ({ etapas: s.etapas.filter((e) => e.id !== id) }));
  },

  async concluirEtapaInterna(id) {
    await get().atualizarEtapa(id, { concluido: true, concluido_em: new Date().toISOString() });
    // liberar próximas que dependem desta
    const dependentes = get().etapas.filter((e) => e.depends_on_etapa_id === id && !e.liberado);
    for (const dep of dependentes) {
      await get().atualizarEtapa(dep.id, { liberado: true });
    }
  },

  async liberarEtapa(id) {
    await get().atualizarEtapa(id, { liberado: true });
  },

  async criarTarefaRealParaEtapa(etapaId) {
    const etapa = get().etapas.find((e) => e.id === etapaId);
    if (!etapa) return null;
    const card = get().cards.find((c) => c.id === etapa.card_pai_id);
    if (!card) return null;

    const categoria = (etapa.categoria_alvo && VALID_CATEGORIAS.has(etapa.categoria_alvo)
      ? etapa.categoria_alvo
      : "Operacional") as any;

    // Não duplicar: procurar demanda existente com mesmo título+cliente+categoria
    const { data: existentes } = await supabase
      .from("demandas")
      .select("id, titulo, categoria")
      .eq("cliente_id", card.cliente_id)
      .eq("categoria", categoria)
      .ilike("titulo", etapa.titulo);

    let demandaId: string | null = existentes && existentes.length > 0 ? (existentes[0] as any).id : null;

    if (!demandaId) {
      const novoId = await useDemandas.getState().createDemanda({
        cliente_id: card.cliente_id,
        titulo: etapa.titulo,
        categoria,
        responsaveis_ids: etapa.responsavel_id ? [etapa.responsavel_id] : [],
      });
      demandaId = novoId;
    }

    if (!demandaId) return null;

    // vincular ao card pai
    await supabase.from("demandas").update({ card_pai_id: card.id } as any).eq("id", demandaId);
    await get().atualizarEtapa(etapaId, { demanda_id: demandaId });
    await useDemandas.getState().load(true);
    return demandaId;
  },
}));

export function useCardPaiBootstrap(clienteId?: string) {
  const load = useCardPai((s) => s.loadByCliente);
  useEffect(() => {
    if (!clienteId) return;
    load(clienteId, true);
  }, [clienteId, load]);
}

export interface CardPaiProgresso {
  total: number;
  concluidas: number;
  pendentes: number;
  bloqueadas: number;
  aguardandoCliente: number;
  proximaEtapa: CardPaiEtapa | null;
}

export function calcularProgresso(etapas: CardPaiEtapa[]): CardPaiProgresso {
  const total = etapas.length;
  const concluidas = etapas.filter((e) => e.concluido).length;
  const bloqueadas = etapas.filter((e) => !e.liberado && !e.concluido).length;
  const pendentes = etapas.filter((e) => e.liberado && !e.concluido).length;
  const aguardandoCliente = etapas.filter((e) => {
    if (e.concluido) return false;
    const t = (e.titulo || "").toLowerCase();
    const v = (e.status_interno_valor || "").toLowerCase();
    return e.tipo === "status_interno" && (t.includes("aguardando") || v.includes("aguardando"));
  }).length;
  const proximaEtapa =
    etapas.find((e) => !e.concluido && e.liberado) ?? null;
  return { total, concluidas, pendentes, bloqueadas, aguardandoCliente, proximaEtapa };
}
