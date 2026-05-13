import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Atividade {
  id: string;
  cliente_id: string;
  tipo: "post" | "demanda" | "Observação" | string;
  acao: string;
  referencia_id: string | null;
  usuario_id: string | null;
  descricao: string | null;
  payload: any;
  /** Categoria da tarefa ou origem (posts, demandas, etc) */
  area?: string | null;
  /** Título do card ou tarefa associado */
  titulo_tarefa?: string | null;
  created_at: string;
}

interface State {
  porCliente: Record<string, Atividade[]>;
  loading: Record<string, boolean>;
  hasMore: Record<string, boolean>;
  loadByCliente: (clienteId: string, opts?: { reset?: boolean; limit?: number }) => Promise<void>;
  ultimasGlobais: (clienteId: string, limit?: number) => Atividade[];
}

const PAGE_SIZE = 20;

export const useAtividades = create<State>((set, get) => ({
  porCliente: {},
  loading: {},
  hasMore: {},

  loadByCliente: async (clienteId, opts = {}) => {
    const { reset = false, limit = PAGE_SIZE } = opts;
    if (get().loading[clienteId]) return;
    set((s) => ({ loading: { ...s.loading, [clienteId]: true } }));

    const offset = reset ? 0 : (get().porCliente[clienteId]?.length ?? 0);

    const { data, error } = await supabase
      .from("atividade_cliente" as any)
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      set((s) => ({ loading: { ...s.loading, [clienteId]: false } }));
      return;
    }

    const novos = (data ?? []) as unknown as Atividade[];
    set((s) => {
      const atual = reset ? [] : (s.porCliente[clienteId] ?? []);
      const ids = new Set(atual.map((a) => a.id));
      const merged = [...atual, ...novos.filter((n) => !ids.has(n.id))];
      return {
        porCliente: { ...s.porCliente, [clienteId]: merged },
        loading: { ...s.loading, [clienteId]: false },
        hasMore: { ...s.hasMore, [clienteId]: novos.length === limit },
      };
    });
  },

  ultimasGlobais: (clienteId, limit = 5) => {
    return (get().porCliente[clienteId] ?? []).slice(0, limit);
  },
}));

export function useAtividadesBootstrap(clienteId?: string) {
  const load = useAtividades((s) => s.loadByCliente);
  useEffect(() => {
    if (!clienteId) return;
    load(clienteId, { reset: true });
  }, [clienteId, load]);
}
