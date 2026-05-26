import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type MotivoTipo = "cliente" | "interno";

export interface MotivoItem {
  id: string;
  label: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

interface State {
  cliente: MotivoItem[];
  interno: MotivoItem[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  add: (tipo: MotivoTipo, label: string) => Promise<MotivoItem | null>;
}

function table(tipo: MotivoTipo) {
  return tipo === "cliente"
    ? "status_motivo_cliente_custom"
    : "status_motivo_interno_custom";
}

export const useStatusMotivosStore = create<State>((set, get) => ({
  cliente: [],
  interno: [],
  loaded: false,
  loading: false,

  async load() {
    if (get().loading) return;
    set({ loading: true });
    try {
      const [c, i] = await Promise.all([
        (supabase as any).from("status_motivo_cliente_custom").select("*").order("ordem"),
        (supabase as any).from("status_motivo_interno_custom").select("*").order("ordem"),
      ]);
      set({
        cliente: (c.data ?? []) as MotivoItem[],
        interno: (i.data ?? []) as MotivoItem[],
        loaded: true,
      });
    } catch (err) {
      console.error("Erro ao carregar motivos de status:", err);
    } finally {
      set({ loading: false });
    }
  },

  async add(tipo, label) {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const { data, error } = await (supabase as any)
      .from(table(tipo))
      .insert({ label: trimmed, ordem: 9999, ativo: true })
      .select()
      .single();
    if (error) {
      // Se já existir (unique), só recarrega
      if (error.code === "23505") {
        await get().load();
        const existing = (tipo === "cliente" ? get().cliente : get().interno).find(
          (m) => m.label.toLowerCase() === trimmed.toLowerCase(),
        );
        return existing ?? null;
      }
      toast.error("Erro ao criar motivo", { description: error.message });
      return null;
    }
    const novo = data as MotivoItem;
    if (tipo === "cliente") set({ cliente: [...get().cliente, novo] });
    else set({ interno: [...get().interno, novo] });
    return novo;
  },
}));
