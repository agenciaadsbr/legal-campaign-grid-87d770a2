import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  DemandaStatus,
  DemandaPrioridade,
  DemandaCategoria,
} from "@/lib/demandas-categorias";
import type { TaskDependency, ModoLiberacao } from "@/lib/workflow";

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
  origem?: "manual" | "automatica" | "template_operacional";
  template_id?: string | null;
  marcado_ja_possui?: boolean;
  created_at: string;
  updated_at: string;
  approval_waiting_since?: string | null;
  approval_waiting_by?: string | null;
  approval_previous_status?: string | null;
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
  dependencies: TaskDependency[];
  loaded: boolean;
  loading: boolean;

  load: (silent?: boolean) => Promise<void>;
  createDemanda: (
    d: Partial<Omit<Demanda, "responsaveis_ids">> & {
      cliente_id: string;
      titulo: string;
      responsaveis_ids?: string[];
    }
  ) => Promise<string | null>;
  /**
   * Cria um rascunho silencioso (sem toast) e retorna o objeto Demanda já normalizado.
   */
  createRascunho: (args: {
    cliente_id: string;
    categoria?: DemandaCategoria;
    subtipo?: string | null;
  }) => Promise<Demanda | null>;
  /**
   * Cria um rascunho APENAS em memória (sem chamar Supabase). Usado pelo módulo
   * "Criar Tarefa" para exibir o formulário completo sem persistir nada antes
   * do usuário clicar em "Salvar tarefa".
   */
  createLocalRascunho: (args: {
    cliente_id?: string;
    categoria?: DemandaCategoria;
  }) => Demanda;
  /**
   * Persiste um rascunho local no Supabase e remove a versão em memória.
   * Retorna a Demanda real (com id do banco) ou null em caso de erro.
   */
  commitLocalRascunho: (
    localId: string,
    overrides?: Partial<Demanda>,
  ) => Promise<Demanda | null>;
  updateDemanda: (id: string, patch: Partial<Demanda>) => Promise<void>;
  deleteDemanda: (id: string) => Promise<void>;
  moveStatus: (id: string, status: DemandaStatus) => Promise<void>;
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
  /**
   * Cria uma próxima etapa vinculada a uma tarefa pai.
   * Opcionalmente herda anexos da pai (cópia das linhas em anexos_demandas).
   */
  createProximaEtapa: (
    paiId: string,
    proxima: Partial<Omit<Demanda, "responsaveis_ids">> & {
      titulo: string;
      cliente_id: string;
      responsaveis_ids?: string[];
    },
    options?: {
      modo_liberacao?: ModoLiberacao;
      bloquear?: boolean;
      herdar_anexos?: boolean;
    }
  ) => Promise<string | null>;
  /** Marca manualmente uma dependência como liberada. */
  liberarDependencia: (dependencyId: string) => Promise<void>;
  /**
   * Duplica uma demanda existente. Cria nova linha em `demandas` com os
   * mesmos campos editáveis (status reset para Planejamento) e, opcionalmente,
   * replica anexos e dependências pai (workflow).
   */
  duplicarDemanda: (
    id: string,
    options?: { copiar_anexos?: boolean; copiar_workflow?: boolean }
  ) => Promise<string | null>;
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

const LOCAL_DRAFT_PREFIX = "local-draft-";
export const isLocalDraftId = (id: string | null | undefined) =>
  typeof id === "string" && id.startsWith(LOCAL_DRAFT_PREFIX);

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
    origem: row.origem ?? "manual",
    template_id: row.template_id ?? null,
    marcado_ja_possui: !!row.marcado_ja_possui,
  } as Demanda;
}

export const useDemandasStore = create<State>((set, get) => ({
  demandas: [],
  comentarios: [],
  anexos: [],
  historico: [],
  dependencies: [],
  loaded: false,
  loading: false,

  async load(silent = false) {
    if (!silent) set({ loading: true });
    try {
      const [d, c, a, h, deps] = await Promise.all([
        supabase.from("demandas").select("*").order("created_at", { ascending: false }),
        supabase.from("comentarios_demandas").select("*").order("created_at"),
        supabase.from("anexos_demandas").select("*").order("created_at"),
        supabase.from("historico_demandas").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("task_dependencies").select("*").order("created_at"),
      ]);

      if (d.error) console.error("Erro ao carregar demandas:", d.error);
      if (c.error) console.error("Erro ao carregar comentários:", c.error);
      if (a.error) console.error("Erro ao carregar anexos:", a.error);
      if (h.error) console.error("Erro ao carregar histórico:", h.error);
      if (deps.error) console.error("Erro ao carregar dependências:", deps.error);

      set({
        demandas: (d.data ?? []).map(normalizeDemanda),
        comentarios: (c.data ?? []) as ComentarioDemanda[],
        anexos: (a.data ?? []) as AnexoDemanda[],
        historico: (h.data ?? []) as HistoricoDemanda[],
        dependencies: ((deps as any)?.data ?? []) as TaskDependency[],
        loaded: true,
      });

      // Best-effort para marcar atrasos
      supabase.rpc("marcar_demandas_atrasadas").then(({ error }) => {
        if (error) console.warn("Aviso: RPC marcar_demandas_atrasadas falhou", error);
      });
    } catch (err) {
      console.error("Erro crítico em load():", err);
    } finally {
      set({ loading: false });
    }
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

  createLocalRascunho({ cliente_id, categoria }) {
    const id = `${LOCAL_DRAFT_PREFIX}${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : Math.random().toString(36).slice(2)
    }`;
    const now = new Date().toISOString();
    const novo: Demanda = {
      id,
      cliente_id: cliente_id ?? "",
      titulo: "",
      categoria: (categoria ?? "Personalizado") as DemandaCategoria,
      subtipo: null,
      descricao: null,
      status: "Criar" as DemandaStatus,
      prioridade: "Media" as DemandaPrioridade,
      responsaveis_ids: [],
      responsavel_id: null,
      criado_por: null,
      data_limite: null,
      data_inicio: null,
      data_conclusao: null,
      precisa_aprovacao: false,
      aprovado_por: null,
      link_meister: null,
      link_drive: null,
      origem: "manual",
      template_id: null,
      marcado_ja_possui: false,
      created_at: now,
      updated_at: now,
    };
    set({ demandas: [novo, ...get().demandas] });
    return novo;
  },

  async commitLocalRascunho(localId, overrides) {
    const local = get().demandas.find((d) => d.id === localId);
    if (!local || !isLocalDraftId(localId)) return null;
    const merged: Demanda = { ...local, ...(overrides ?? {}) };
    if (!merged.cliente_id) {
      toast.error("Selecione um cliente para criar a tarefa.");
      return null;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id ?? null;
    const responsaveis_ids = merged.responsaveis_ids ?? [];
    const payload: any = {
      cliente_id: merged.cliente_id,
      titulo: merged.titulo?.trim() || "Sem título",
      categoria: merged.categoria ?? "Personalizado",
      subtipo: merged.subtipo ?? null,
      descricao: merged.descricao ?? null,
      status: merged.status ?? "Criar",
      prioridade: merged.prioridade ?? "Media",
      responsaveis_ids,
      responsavel_id: responsaveis_ids[0] ?? null,
      criado_por: uid,
      data_limite: merged.data_limite ?? null,
      data_inicio: merged.data_inicio ?? null,
      data_conclusao: merged.data_conclusao ?? null,
      precisa_aprovacao: merged.precisa_aprovacao ?? false,
      link_meister: merged.link_meister ?? null,
      link_drive: merged.link_drive ?? null,
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
    const nova = normalizeDemanda(data);
    set({
      demandas: [nova, ...get().demandas.filter((d) => d.id !== localId)],
    });
    return nova;
  },

  async updateDemanda(id, patch) {
    const prev = get().demandas.find((x) => x.id === id);
    if (!prev) return;

    if (isLocalDraftId(id)) {
      const merged = normalizeDemanda({ ...prev, ...patch });
      if (Array.isArray(patch.responsaveis_ids)) {
        merged.responsavel_id = patch.responsaveis_ids[0] ?? null;
      }
      set({ demandas: get().demandas.map((d) => (d.id === id ? merged : d)) });
      return;
    }

    // Optimistic Update
    const optimistic = normalizeDemanda({ ...prev, ...patch });
    // Sincroniza campos que dependem de patch.responsaveis_ids se houver
    if (Array.isArray(patch.responsaveis_ids)) {
      optimistic.responsavel_id = patch.responsaveis_ids[0] ?? null;
    }
    
    set({
      demandas: get().demandas.map((d) => (d.id === id ? optimistic : d)),
    });

    const clean: any = { ...patch };
    delete clean.id;
    delete clean.created_at;
    delete clean.updated_at;

    // Se o caller mexeu na lista canônica, sincroniza o legado também
    if (Array.isArray(patch.responsaveis_ids)) {
      clean.responsaveis_ids = patch.responsaveis_ids;
      clean.responsavel_id = patch.responsaveis_ids[0] ?? null;
    }

    const { data, error } = await supabase
      .from("demandas")
      .update(clean)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao atualizar", { description: error.message });
      // Rollback no erro
      set({
        demandas: get().demandas.map((d) => (d.id === id ? prev : d)),
      });
      return;
    }

    const next = normalizeDemanda(data);
    set({
      demandas: get().demandas.map((d) => (d.id === id ? next : d)),
    });

    if (prev.status !== "Atrasado" && next.status === "Atrasado") {
      supabase.from("alertas").insert({
        cliente_id: next.cliente_id,
        mensagem: `[DEMANDA] "${next.titulo}" está atrasada`,
        tipo_alerta: "Posts_Pendentes" as any,
      }).then(() => {});
    }

    // Log de atividades para mudanças relevantes
    const { useCRM } = await import("@/store/crm");
    
    if (patch.status && patch.status !== prev.status) {
      await useCRM.getState().addAtividade({
        clienteId: next.cliente_id,
        acao: "status",
        descricao: `Status alterado: ${prev.status} → ${next.status}`,
        refId: id,
        tipo: "demanda",
        area: next.categoria,
        titulo_tarefa: next.titulo,
        payload: { de: prev.status, para: next.status }
      });
    }

    if (patch.responsaveis_ids && JSON.stringify(patch.responsaveis_ids) !== JSON.stringify(prev.responsaveis_ids)) {
      await useCRM.getState().addAtividade({
        clienteId: next.cliente_id,
        acao: "responsavel",
        descricao: `Responsáveis alterados`,
        refId: id,
        tipo: "demanda",
        area: next.categoria,
        titulo_tarefa: next.titulo,
        payload: { de: prev.responsaveis_ids, para: next.responsaveis_ids }
      });
    }

    if (patch.data_limite && patch.data_limite !== prev.data_limite) {
      await useCRM.getState().addAtividade({
        clienteId: next.cliente_id,
        acao: "prazo",
        descricao: `Prazo alterado para ${new Date(patch.data_limite).toLocaleDateString("pt-BR")}`,
        refId: id,
        tipo: "demanda",
        area: next.categoria,
        titulo_tarefa: next.titulo,
        payload: { de: prev.data_limite, para: patch.data_limite }
      });
    }
  },

  async deleteDemanda(id) {
    if (isLocalDraftId(id)) {
      set({
        demandas: get().demandas.filter((d) => d.id !== id),
        comentarios: get().comentarios.filter((c) => c.demanda_id !== id),
        anexos: get().anexos.filter((a) => a.demanda_id !== id),
      });
      return;
    }
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
    if (isLocalDraftId(demanda_id)) {
      toast.error("Salve a tarefa primeiro para comentar.");
      return;
    }
    const { data, error } = await supabase
      .from("comentarios_demandas")
      .insert({ demanda_id, usuario_id, texto, imagem_url: imagem_url ?? null })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao comentar", { description: error.message });
      return;
    }

    const dem = get().demandas.find(d => d.id === demanda_id);
    if (dem) {
      const trecho = texto.replace(/<[^>]+>/g, "").slice(0, 100);
      const { useCRM } = await import("@/store/crm");
      await useCRM.getState().addAtividade({
        clienteId: dem.cliente_id,
        acao: "comentario",
        descricao: trecho,
        refId: data.id,
        tipo: "demanda",
        area: dem.categoria,
        titulo_tarefa: dem.titulo,
        payload: { comentario_id: data.id }
      });
    }

    set({ comentarios: [...get().comentarios, data as ComentarioDemanda] });
  },

  async addAnexo(a) {
    if (isLocalDraftId(a.demanda_id)) {
      toast.error("Salve a tarefa primeiro para adicionar anexos.");
      return;
    }
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
    const anexoLocal = get().anexos.find((a) => a.id === id);
    if (anexoLocal && isLocalDraftId(anexoLocal.demanda_id)) {
      set({ anexos: get().anexos.filter((a) => a.id !== id) });
      return;
    }
    const anexo = get().anexos.find((a) => a.id === id);
    const { error, count } = await supabase
      .from("anexos_demandas")
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao remover anexo", { description: error.message });
      return;
    }
    if (count === 0) {
      toast.error("Você não tem permissão para remover este anexo");
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

  async createProximaEtapa(paiId, proxima, options) {
    const modo: ModoLiberacao = options?.modo_liberacao ?? "automatico";
    const bloquear = options?.bloquear !== false;
    const herdarAnexos = !!options?.herdar_anexos;

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id ?? null;
    const responsaveis_ids = proxima.responsaveis_ids ?? [];

    const payload: any = {
      cliente_id: proxima.cliente_id,
      titulo: proxima.titulo,
      categoria: proxima.categoria ?? "Personalizado",
      subtipo: proxima.subtipo ?? null,
      descricao: proxima.descricao ?? null,
      status: proxima.status ?? "Planejamento",
      prioridade: proxima.prioridade ?? "Media",
      responsaveis_ids,
      responsavel_id: responsaveis_ids[0] ?? null,
      criado_por: uid,
      data_limite: proxima.data_limite ?? null,
      data_inicio: proxima.data_inicio ?? null,
      data_conclusao: null,
      precisa_aprovacao: proxima.precisa_aprovacao ?? false,
      link_meister: proxima.link_meister ?? null,
      link_drive: proxima.link_drive ?? null,
    };
    const { data: novaRow, error } = await supabase
      .from("demandas")
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar próxima etapa", { description: error.message });
      return null;
    }
    const nova = normalizeDemanda(novaRow);
    set({ demandas: [nova, ...get().demandas] });

    if (bloquear) {
      const { data: depRow, error: depErr } = await (supabase as any)
        .from("task_dependencies")
        .insert({
          task_id: nova.id,
          depends_on_task_id: paiId,
          modo_liberacao: modo,
          liberado: false,
        })
        .select()
        .single();
      if (depErr) {
        toast.error("Erro ao vincular dependência", { description: depErr.message });
      } else if (depRow) {
        set({ dependencies: [...get().dependencies, depRow as TaskDependency] });
      }
    }

    if (herdarAnexos) {
      const anexosPai = get().anexos.filter((a) => a.demanda_id === paiId);
      for (const a of anexosPai) {
        const { data: aIns } = await supabase
          .from("anexos_demandas")
          .insert({
            demanda_id: nova.id,
            nome: a.nome,
            url: a.url,
            mime: a.mime,
            size: a.size,
          })
          .select()
          .single();
        if (aIns) set({ anexos: [...get().anexos, aIns as AnexoDemanda] });
      }
    }

    toast.success("Próxima etapa criada");
    return nova.id;
  },

  async liberarDependencia(dependencyId) {
    const dep = get().dependencies.find((x) => x.id === dependencyId);
    if (!dep) return;
    const { data, error } = await (supabase as any)
      .from("task_dependencies")
      .update({ liberado: true, liberado_em: new Date().toISOString() })
      .eq("id", dependencyId)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao liberar dependência", { description: error.message });
      return;
    }
    set({
      dependencies: get().dependencies.map((x) =>
        x.id === dependencyId ? (data as TaskDependency) : x
      ),
    });
    toast.success("Dependência liberada");
  },

  async duplicarDemanda(id, options) {
    const copiarAnexos = options?.copiar_anexos !== false;
    const copiarWorkflow = options?.copiar_workflow !== false;

    const original = get().demandas.find((d) => d.id === id);
    if (!original) {
      toast.error("Tarefa não encontrada");
      return null;
    }

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id ?? null;

    const responsaveis_ids = original.responsaveis_ids ?? [];
    const payload: any = {
      cliente_id: original.cliente_id,
      titulo: `${original.titulo} (cópia)`,
      categoria: original.categoria,
      subtipo: original.subtipo ?? null,
      descricao: original.descricao ?? null,
      status: "Planejamento",
      prioridade: original.prioridade,
      responsaveis_ids,
      responsavel_id: responsaveis_ids[0] ?? null,
      criado_por: uid,
      data_limite: original.data_limite ?? null,
      data_inicio: original.data_inicio ?? null,
      data_conclusao: null,
      precisa_aprovacao: original.precisa_aprovacao ?? false,
      link_meister: original.link_meister ?? null,
      link_drive: original.link_drive ?? null,
      origem: "manual",
      template_id: null,
      marcado_ja_possui: false,
    };

    const { data: novaRow, error } = await supabase
      .from("demandas")
      .insert(payload)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao duplicar tarefa", { description: error.message });
      return null;
    }
    const nova = normalizeDemanda(novaRow);
    set({ demandas: [nova, ...get().demandas] });

    if (copiarAnexos) {
      const anexosOrig = get().anexos.filter((a) => a.demanda_id === id);
      for (const a of anexosOrig) {
        const { data: aIns } = await supabase
          .from("anexos_demandas")
          .insert({
            demanda_id: nova.id,
            nome: a.nome,
            url: a.url,
            mime: a.mime,
            size: a.size,
          })
          .select()
          .single();
        if (aIns) set({ anexos: [...get().anexos, aIns as AnexoDemanda] });
      }
    }

    if (copiarWorkflow) {
      const deps = get().dependencies.filter((d) => d.task_id === id);
      for (const d of deps) {
        const { data: depRow, error: depErr } = await (supabase as any)
          .from("task_dependencies")
          .insert({
            task_id: nova.id,
            depends_on_task_id: d.depends_on_task_id,
            modo_liberacao: d.modo_liberacao,
            liberado: d.liberado,
          })
          .select()
          .single();
        if (!depErr && depRow) {
          set({ dependencies: [...get().dependencies, depRow as TaskDependency] });
        }
      }
    }

    toast.success("Tarefa duplicada");
    return nova.id;
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
        () => load(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comentarios_demandas" },
        () => load(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "anexos_demandas" },
        () => load(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "historico_demandas" },
        () => load(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_dependencies" },
        () => load(true)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export const useDemandas = useDemandasStore;
