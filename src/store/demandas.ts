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
  responsavel_id: string | null;
  criado_por: string | null;
  data_limite: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
  precisa_aprovacao: boolean;
  aprovado_por: string | null;
  created_at: string;
  updated_at: string;
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
    d: Partial<Demanda> & { cliente_id: string; titulo: string }
  ) => Promise<string | null>;
  updateDemanda: (id: string, patch: Partial<Demanda>) => Promise<void>;
  deleteDemanda: (id: string) => Promise<void>;
  moveStatus: (id: string, status: DemandaStatus) => Promise<void>;
  assign: (id: string, responsavel_id: string | null) => Promise<void>;
  addComentario: (
    demanda_id: string,
    usuario_id: string,
    texto: string,
    imagem_url?: string | null
  ) => Promise<void>;
  addAnexo: (a: Omit<AnexoDemanda, "id" | "created_at">) => Promise<void>;
  approveDemanda: (id: string, aprovado_por: string) => Promise<void>;
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
      demandas: (d.data ?? []) as Demanda[],
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
    const payload: any = {
      cliente_id: d.cliente_id,
      titulo: d.titulo,
      categoria: d.categoria ?? "Personalizado",
      subtipo: d.subtipo ?? null,
      descricao: d.descricao ?? null,
      status: d.status ?? "Planejamento",
      prioridade: d.prioridade ?? "Media",
      responsavel_id: d.responsavel_id ?? null,
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
    set({ demandas: [data as Demanda, ...get().demandas] });
    toast.success("Demanda criada");

    // Alerta para demanda urgente
    if ((data as Demanda).prioridade === "Urgente") {
      supabase.from("alertas").insert({
        cliente_id: (data as Demanda).cliente_id,
        mensagem: `[DEMANDA] Nova demanda urgente: "${(data as Demanda).titulo}"`,
        tipo_alerta: "Posts_Pendentes" as any,
      }).then(() => {});
    }
    return data!.id;
  },

  async updateDemanda(id, patch) {
    const clean: any = { ...patch };
    delete clean.id;
    delete clean.created_at;
    delete clean.updated_at;
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
    set({
      demandas: get().demandas.map((d) => (d.id === id ? (data as Demanda) : d)),
    });

    // Alerta quando transita para Atrasado
    const next = data as Demanda;
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

  async assign(id, responsavel_id) {
    await get().updateDemanda(id, { responsavel_id });
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
      .channel("demandas-realtime")
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
