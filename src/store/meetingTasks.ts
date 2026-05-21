import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MeetingTask {
  id: string;
  meeting_id: string;
  client_id: string;
  project_id: string | null;
  task_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: "pendente" | "em_andamento" | "concluida" | string;
  created_at: string;
  created_by: string | null;
}

export interface DelegarTarefaInput {
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  categoria?: string | null;
  prioridade?: string | null;
  criar_demanda_real?: boolean;
}

const nullIfEmpty = (v?: string | null) => (v && String(v).trim() ? v : null);

interface State {
  tasks: MeetingTask[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  loadForMeeting: (meetingId: string) => Promise<MeetingTask[]>;
  delegar: (args: {
    meeting_id: string;
    client_id: string;
    project_id?: string | null;
    tarefas: DelegarTarefaInput[];
  }) => Promise<number>;
}

export const useMeetingTasks = create<State>((set, get) => ({
  tasks: [],
  loaded: false,
  loading: false,
  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const { data, error } = await (supabase as any)
        .from("meeting_tasks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      set({ tasks: (data ?? []) as MeetingTask[], loaded: true });
    } catch (e: any) {
      toast.error("Erro ao carregar tarefas de reunião: " + (e?.message ?? "?"));
    } finally {
      set({ loading: false });
    }
  },
  loadForMeeting: async (meetingId) => {
    const { data, error } = await (supabase as any)
      .from("meeting_tasks")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar tarefas da reunião");
      return [];
    }
    return (data ?? []) as MeetingTask[];
  },
  delegar: async ({ meeting_id, client_id, project_id, tarefas }) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;
    let criadas = 0;

    for (const t of tarefas) {
      if (!t.title?.trim()) continue;

      let task_id: string | null = null;

      if (t.criar_demanda_real) {
        const demandaPayload: any = {
          cliente_id: client_id,
          titulo: t.title.trim(),
          descricao: t.description || null,
          responsavel_id: nullIfEmpty(t.assigned_to),
          responsaveis_ids: t.assigned_to ? [t.assigned_to] : [],
          data_limite: t.due_date ? new Date(t.due_date).toISOString() : null,
          categoria: t.categoria || "Personalizado",
          prioridade: t.prioridade || "Media",
          status: "Planejamento",
          origem: "reuniao",
          origem_reuniao_id: meeting_id,
          criado_por: userId,
        };
        const { data: demanda, error: dErr } = await (supabase as any)
          .from("demandas")
          .insert(demandaPayload)
          .select("id")
          .single();
        if (dErr) {
          toast.error(`Erro ao criar tarefa "${t.title}": ${dErr.message}`);
          continue;
        }
        task_id = demanda?.id ?? null;
      }

      const mtPayload: any = {
        meeting_id,
        client_id,
        project_id: nullIfEmpty(project_id ?? null),
        task_id,
        title: t.title.trim(),
        description: t.description || null,
        assigned_to: nullIfEmpty(t.assigned_to),
        due_date: t.due_date || null,
        status: "pendente",
        created_by: userId,
      };
      const { data: mt, error: mErr } = await (supabase as any)
        .from("meeting_tasks")
        .insert(mtPayload)
        .select()
        .single();
      if (mErr) {
        toast.error(`Erro ao registrar tarefa "${t.title}": ${mErr.message}`);
        continue;
      }
      criadas++;
      set({ tasks: [mt as MeetingTask, ...get().tasks] });
    }

    return criadas;
  },
}));

export function useMeetingTasksBootstrap() {
  const loaded = useMeetingTasks((s) => s.loaded);
  const load = useMeetingTasks((s) => s.load);
  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);
}
