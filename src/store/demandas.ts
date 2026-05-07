import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  DemandaStatus,
  DemandaPrioridade,
  DemandaCategoria,
} from "@/lib/demandas-categorias";

export interface Demanda {
  id: string;
  cliente_id: string;
  titulo: string;
  categoria: DemandaCategoria;
  subtipo: string | null;
  descricao: string | null;
  status: DemandaStatus;
  prioridade: DemandaPrioridade;
  /** Lista canônica de responsáveis (multi). */
  responsaveis_ids: string[];
  /** Legado — não usar na UI. Mantido só para compat de leitura durante a transição. */
  responsavel_id: string | null;
  criado_por: string | null;
  data_limite: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  precisa_aprovacao: boolean;
  aprovado_por: string | null;
  link_meister: string | null;
  link_drive: string | null;
  created_at: string;
  updated_at: string;
}

/** Helper: extrai a lista de responsáveis de uma demanda (com fallback ao legado). */
export function getResponsaveisIds(d: Pick<Demanda, "responsaveis_ids" | "responsavel_id">): string[] {
  if (Array.isArray(d.responsaveis_ids) && d.responsaveis_ids.length > 0) return d.responsaveis_ids;
  if (d.responsavel_id) return [d.responsavel_id];
  return [];
}

export interface ComentarioDemanda {
  id: string;
  demanda_id: string;
  usuario_id: string;
  texto: string;
  imagem_url: string | null;
  created_at: string;
}

export interface AnexoDemanda {
  id: string;
  demanda_id: string;
  nome: string;
  url: string;
  mime: string | null;
  size: number | null;
  created_at: string;
}

export interface HistoricoDemanda {
  id: string;
  demanda_id: string;
  usuario_id: string | null;
  acao: string;
  de_status: DemandaStatus | null;
  para_status: DemandaStatus | null;
  payload: any;
  created_at: string;
}

interface State {
  demandas: Demanda[];
  comentarios: ComentarioDemanda[];
  anexos: AnexoDemanda[];
  historico: HistoricoDemanda[];
  loaded: boolean;
  loading: boolean;

  load: () => Promise<void>;
  createDemanda: (
    d: Partial<Omit<Demanda, "responsaveis_ids">> & {
      cliente_id: string;
      titulo: string;
      responsaveis_ids?: string[];
    }
  ) => Promise<string | null>;
  /**
   * Cria um rascunho silencioso (sem toast) e retorna o objeto Demanda já normalizado.
   * Usado pelo fluxo de "formulário único": a tarefa nasce no banco e o usuário
   * preenche tudo direto no DemandaDetalheDialog.
   */
  createRascunho: (args: {
    cliente_id: string;
    categoria?: DemandaCategoria;
    subtipo?: string | null;
  }) => Promise<Demanda | null>;
  updateDemanda: (id: string, patch: Partial<Demanda>) => Promise<void>;
  deleteDemanda: (id: string) => Promise<void>;
  moveStatus: (id: string, status: DemandaStatus) => Promise<void>;
  /** Atribui múltiplos responsáveis a uma demanda. */
  assign: (id: string, responsaveis_ids: string[]) => Promise<void>;
  addComentario: (
    demanda_id: string,
    usuario_id: string,
    texto: string,
    imagem_url?: string | null
  ) => Promise<void>;
  addAnexo: (a: Omit<AnexoDemanda, "id" | "created_at">) => Promise<void>;
  removeAnexo: (id: string) => Promise<void>;
  approveDemanda: (id: string, aprovado_por: string) => Promise<void>;
}

/**
 * Mapeia categorias descontinuadas para as categorias atuais (apenas em runtime,
 * sem alterar o banco). Conforme reunião de ajustes:
 * - Designer    → Personalizado (Urgência/Outro)
 * - Tecnologia  → IAAtendimento
 */
function migrarCategoria(cat: any): any {
  if (cat === "Designer") return "Personalizado";
  if (cat === "Tecnologia") return "IAAtendimento";
  return cat;
}

function normalizeDemanda(row: any): Demanda {
  const responsaveis_ids: string[] = Array.isArray(row.responsaveis_ids)
    ? row.responsaveis_ids
    : row.responsavel_id
      ? [row.responsavel_id]
      : [];
  return {
    ...row,
    categoria: migrarCategoria(row.categoria),
    responsaveis_ids,
    responsavel_id: row.responsavel_id ?? null,
    link_meister: row.link_meister ?? null,
    link_drive: row.link_drive ?? null,
  } as Demanda;
}

export const useDemandasStore = create<State>((set, get) => ({
  demandas: [],
  comentarios: [],
  anexos: [],
  historico: [],
  loaded: false,
  loading: false,

  async load() {
    if (get().loading) return;
    set({ loading: true });
    const [d, c, a, h] = await Promise.all([
      supabase.from("demandas").select("*").order("created_at", { ascending: false }),
      supabase.from("comentarios_demandas").select("*").order("created_at"),
      supabase.from("anexos_demandas").select("*").order("created_at"),
      supabase.from("historico_demandas").select("*").order("created_at", { ascending: false }),
    ]);
    set({
      demandas: (d.data ?? []).map(normalizeDemanda),
      comentarios: (c.data ?? []) as ComentarioDemanda[],
      anexos: (a.data ?? []) as AnexoDemanda[],
      historico: (h.data ?? []) as HistoricoDemanda[],
      loaded: true,
      loading: false,
    });
    // marca atrasos no servidor
    supabase.rpc("marcar_demandas_atrasadas").then(() => {});
  },

  async createDemanda(d) {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id ?? null;
    const responsaveis_ids = d.responsaveis_ids ?? [];
    const payload: any = {
      cliente_id: d.cliente_id,
      titulo: d.titulo,
      categoria: d.categoria ?? "Personalizado",
      subtipo: d.subtipo ?? null,
      descricao: d.descricao ?? null,
      status: d.status ?? "Planejamento",
      prioridade: d.prioridade ?? "Media",
      responsaveis_ids,
      // mantém legacy preenchido com o primeiro, p/ compat de leituras antigas
      responsavel_id: responsaveis_ids[0] ?? null,
      criado_por: uid,
      data_limite: d.data_limite ?? null,
      data_inicio: d.data_inicio ?? null,
      data_conclusao: d.data_conclusao ?? null,
      precisa_aprovacao: d.precisa_aprovacao ?? false,
    };
    const { data, error } = await supabase
      .from("demandas")
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar demanda", { description: error.message });
      return null;
    }
    const novo = normalizeDemanda(data);
    set({ demandas: [novo, ...get().demandas] });
    toast.success("Demanda criada");

    if (novo.prioridade === "Urgente") {
      supabase.from("alertas").insert({
        cliente_id: novo.cliente_id,
        mensagem: `[DEMANDA] Nova demanda urgente: "${novo.titulo}"`,
        tipo_alerta: "Posts_Pendentes" as any,
      }).then(() => {});
    }
    return novo.id;
  },

  async createRascunho({ cliente_id, categoria, subtipo }) {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id ?? null;
    const payload: any = {
      cliente_id,
      titulo: "Sem título",
      categoria: categoria ?? "Personalizado",
      subtipo: subtipo ?? null,
      status: "Criar",
      prioridade: "Media",
      responsaveis_ids: [],
      responsavel_id: null,
      criado_por: uid,
      precisa_aprovacao: false,
    };
    const { data, error } = await supabase
      .from("demandas")
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar tarefa", { description: error.message });
      return null;
    }
    const novo = normalizeDemanda(data);
    set({ demandas: [novo, ...get().demandas] });
    return novo;
  },

  async updateDemanda(id, patch) {
    const clean: any = { ...patch };
    delete clean.id;
    delete clean.created_at;
    delete clean.updated_at;
    // Se o caller mexeu na lista canônica, sincroniza o legado também
    if (Array.isArray(patch.responsaveis_ids)) {
      clean.responsaveis_ids = patch.responsaveis_ids;
      clean.responsavel_id = patch.responsaveis_ids[0] ?? null;
    }
    const prev = get().demandas.find((x) => x.id === id);
    const { data, error } = await supabase
      .from("demandas")
      .update(clean)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao atualizar", { description: error.message });
      return;
    }
    const next = normalizeDemanda(data);
    set({
      demandas: get().demandas.map((d) => (d.id === id ? next : d)),
    });

    if (prev && prev.status !== "Atrasado" && next.status === "Atrasado") {
      supabase.from("alertas").insert({
        cliente_id: next.cliente_id,
        mensagem: `[DEMANDA] "${next.titulo}" está atrasada`,
        tipo_alerta: "Posts_Pendentes" as any,
      }).then(() => {});
    }
  },

  async deleteDemanda(id) {
    const { error } = await supabase.from("demandas").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    set({ demandas: get().demandas.filter((d) => d.id !== id) });
    toast.success("Demanda excluída");
  },

  async moveStatus(id, status) {
    const patch: Partial<Demanda> = { status };
    if (status === "Concluido") patch.data_conclusao = new Date().toISOString();
    await get().updateDemanda(id, patch);
  },

  async assign(id, responsaveis_ids) {
    await get().updateDemanda(id, { responsaveis_ids });
  },

  async addComentario(demanda_id, usuario_id, texto, imagem_url) {
    const { data, error } = await supabase
      .from("comentarios_demandas")
      .insert({ demanda_id, usuario_id, texto, imagem_url: imagem_url ?? null })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao comentar", { description: error.message });
      return;
    }
    set({ comentarios: [...get().comentarios, data as ComentarioDemanda] });
  },

  async addAnexo(a) {
    const { data, error } = await supabase
      .from("anexos_demandas")
      .insert(a)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao anexar", { description: error.message });
      return;
    }
    set({ anexos: [...get().anexos, data as AnexoDemanda] });
  },

  async removeAnexo(id) {
    const anexo = get().anexos.find((a) => a.id === id);
    const { error } = await supabase
      .from("anexos_demandas")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao remover anexo", { description: error.message });
      return;
    }
    // Best-effort: remove o arquivo do Storage se a URL apontar para o bucket "anexos".
    if (anexo?.url) {
      const marker = "/storage/v1/object/public/anexos/";
      const idx = anexo.url.indexOf(marker);
      if (idx !== -1) {
        let path = anexo.url.slice(idx + marker.length).split("?")[0];
        try {
          path = decodeURIComponent(path);
        } catch {
          // ignore
        }
        supabase.storage.from("anexos").remove([path]).catch(() => {
          /* ignore erros de cleanup */
        });
      }
    }
    set({ anexos: get().anexos.filter((a) => a.id !== id) });
    toast.success("Anexo removido");
  },

  async approveDemanda(id, aprovado_por) {
    await get().updateDemanda(id, {
      aprovado_por,
      status: "Concluido",
      data_conclusao: new Date().toISOString(),
    });
  },
}));

export function useDemandasBootstrap() {
  const load = useDemandasStore((s) => s.load);
  useEffect(() => {
    load();
    const channel = supabase
      .channel(`demandas-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demandas" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comentarios_demandas" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "anexos_demandas" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "historico_demandas" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export const useDemandas = useDemandasStore;
