import { create } from "zustand";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DemandaPrioridade, DemandaStatus } from "@/lib/demandas-categorias";

export interface OperationalTemplate {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  categoria: string;
  prioridade: DemandaPrioridade;
  status_inicial: DemandaStatus;
  ativo: boolean;
  responsavel_padrao_id: string | null;
  permite_dependencia: boolean;
  depends_on_template_id: string | null;
  created_at: string;
  updated_at: string;
}

interface State {
  templates: OperationalTemplate[];
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;
  create: (t: Partial<OperationalTemplate> & { nome: string }) => Promise<void>;
  update: (id: string, patch: Partial<OperationalTemplate>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggleAtivo: (id: string, ativo: boolean) => Promise<void>;
}

export const useOperationalTemplates = create<State>((set, get) => ({
  templates: [],
  loaded: false,
  loading: false,

  async load() {
    if (get().loading) return;
    set({ loading: true });
    const { data, error } = await (supabase as any)
      .from("operational_templates")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar templates operacionais", { description: error.message });
      set({ loading: false });
      return;
    }
    set({ templates: (data ?? []) as OperationalTemplate[], loaded: true, loading: false });
  },

  async create(t) {
    const { data, error } = await (supabase as any)
      .from("operational_templates")
      .insert({
        nome: t.nome,
        descricao: t.descricao ?? null,
        ordem: t.ordem ?? (get().templates.at(-1)?.ordem ?? 0) + 10,
        prioridade: t.prioridade ?? "Media",
        status_inicial: t.status_inicial ?? "Criar",
        ativo: t.ativo ?? true,
        responsavel_padrao_id: t.responsavel_padrao_id ?? null,
        permite_dependencia: t.permite_dependencia ?? true,
        depends_on_template_id: t.depends_on_template_id ?? null,
      })
      .select()
      .single();
    if (error) {
      toast.error("Erro ao criar template", { description: error.message });
      return;
    }
    set({ templates: [...get().templates, data as OperationalTemplate].sort((a, b) => a.ordem - b.ordem) });
    toast.success("Template criado");
  },

  async update(id, patch) {
    const clean: any = { ...patch };
    delete clean.id;
    delete clean.created_at;
    delete clean.updated_at;
    const { data, error } = await (supabase as any)
      .from("operational_templates")
      .update(clean)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast.error("Erro ao atualizar template", { description: error.message });
      return;
    }
    set({
      templates: get().templates
        .map((t) => (t.id === id ? (data as OperationalTemplate) : t))
        .sort((a, b) => a.ordem - b.ordem),
    });
  },

  async remove(id) {
    const { error } = await (supabase as any)
      .from("operational_templates")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao remover template", { description: error.message });
      return;
    }
    set({ templates: get().templates.filter((t) => t.id !== id) });
    toast.success("Template removido");
  },

  async toggleAtivo(id, ativo) {
    await get().update(id, { ativo });
  },
}));

export function useOperationalTemplatesBootstrap() {
  const load = useOperationalTemplates((s) => s.load);
  useEffect(() => {
    load();
  }, [load]);
}

/**
 * Gera as demandas operacionais a partir dos templates ativos para um cliente.
 * Idempotente: não recria templates que já tenham demanda associada (template_id).
 * Retorna a quantidade de cards criados.
 */
export async function gerarEstruturaOperacional(clienteId: string): Promise<number> {
  const { data: tpls, error: tErr } = await (supabase as any)
    .from("operational_templates")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  if (tErr || !tpls) {
    toast.error("Erro ao ler templates", { description: tErr?.message });
    return 0;
  }
  if (tpls.length === 0) return 0;

  // Carrega demandas já existentes para evitar duplicação
  const { data: existentes } = await (supabase as any)
    .from("demandas")
    .select("id, template_id, titulo, categoria")
    .eq("cliente_id", clienteId);

  const existentesArray = (existentes as any[]) ?? [];
  const jaUsados = new Set<string>(
    existentesArray.map((d) => d.template_id).filter(Boolean),
  );

  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;

  const aCriar = (tpls as OperationalTemplate[]).filter((t) => !jaUsados.has(t.id));
  
  const jaTemPlanejamento = existentesArray.some(
    (d) => d.titulo === "Checklist de Onboarding"
  );
  
  const payload: any[] = aCriar.map((t) => ({
    cliente_id: clienteId,
    titulo: t.nome,
    descricao: t.descricao,
    categoria: "Operacional",
    subtipo: "Onboarding",
    status: t.status_inicial,
    prioridade: t.prioridade,
    responsaveis_ids: t.responsavel_padrao_id ? [t.responsavel_padrao_id] : [],
    responsavel_id: t.responsavel_padrao_id,
    criado_por: uid,
    precisa_aprovacao: false,
    origem: "template_operacional",
    template_id: t.id,
  }));

  if (!jaTemPlanejamento) {
    const checklistText = `*Etapa 1: 

- Reunião de Start de Projeto  ✅ 
- Análise de Informações coletadas ✅ 
- Criação e Envio do Planejamento ✅
- Envio do Material de Boas Vindas ✅
- Envio do Vídeo de Treinamento Comercial ✅
- Envio do Script de Atendimento 
- Análise de mercado (estudo das palavras-chave e volume de pesquisas)
- Criação da Página do Facebook
- Criação do Instagram 
- Criação da BM (Gerenciador de anúncios)
- Criação e validação dos anúncios em imagem
- Criação e validação dos anúncios em vídeo com I.A.
- Roteiros para Vídeos de Anúncios  (Gravados)
- Configurações técnicas (WhatsApp, pixel, formas de pagamento das campanhas, …)
- Configuração da ferramenta de CRM/Agente de I.A.
- Ativação das Campanhas no Meta Ads 

*Etapa 2: 

- Construção dos Posts (Feed Instagram)
- Criação do GMAIL e Google Ads
- Criação Landing Page
- Configurações domínio e Hospedagem
- Definição da estrutura de campanhas (palavras-chave, títulos e descrições)
- Ativação das Campanhas no Google Ads
- Envio semanal de relatório de métricas
- Análise das campanhas e otimizações
- Gestão/Criação Google Meu Negócio`;

    payload.push({
      cliente_id: clienteId,
      titulo: "Checklist de Onboarding",
      descricao: checklistText,
      categoria: "Operacional",
      subtipo: "Onboarding",
      status: "Planejamento",
      prioridade: "Media",
      responsaveis_ids: [],
      responsavel_id: null,
      criado_por: uid,
      precisa_aprovacao: false,
      origem: "template_operacional",
    });
  }

  if (payload.length === 0) return 0;

  const { data: criados, error } = await (supabase as any)
    .from("demandas")
    .insert(payload)
    .select();

  if (error) {
    toast.error("Erro ao gerar estrutura operacional", { description: error.message });
    return 0;
  }

  // Vincula dependências (best-effort) — exige que o template-pai já tenha sido criado neste lote
  try {
    const tplIdToDemandaId = new Map<string, string>();
    (criados as any[]).forEach((d) => {
      if (d.template_id) tplIdToDemandaId.set(d.template_id, d.id);
    });
    const deps: any[] = [];
    for (const t of aCriar) {
      if (t.depends_on_template_id && tplIdToDemandaId.has(t.depends_on_template_id)) {
        deps.push({
          task_id: tplIdToDemandaId.get(t.id),
          depends_on_task_id: tplIdToDemandaId.get(t.depends_on_template_id),
          modo_liberacao: "automatico",
          liberado: false,
        });
      }
    }
    if (deps.length > 0) {
      await (supabase as any).from("task_dependencies").insert(deps);
    }
  } catch (e) {
    console.warn("Falha ao vincular dependências de templates:", e);
  }

  return (criados as any[]).length;
}
