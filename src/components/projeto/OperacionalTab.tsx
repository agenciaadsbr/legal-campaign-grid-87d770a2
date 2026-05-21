import { useState, useMemo, useEffect, useRef } from "react";
import { Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCRM } from "@/store/crm";
import { useDemandas, type Demanda } from "@/store/demandas";
import { gerarEstruturaOperacional, useOperationalTemplates, useOperationalTemplatesBootstrap } from "@/store/operationalTemplates";
import { AreaTab } from "@/components/projeto/AreaTab";
import { EscolherModeloCardPaiDialog } from "@/components/projeto/cardPai/EscolherModeloCardPaiDialog";
import {
  CARD_PAI_TEMPLATES,
  findResponsavelIdByNome,
  findResponsavelIdByNomes,
  type CardPaiTemplateId,
} from "@/lib/cardPaiTemplates";
import { toast } from "sonner";

interface Props {
  clienteId: string;
  demandas: Demanda[];
  demandaInicial?: Demanda | null;
}

export function OperacionalTab({ clienteId, demandas, demandaInicial }: Props) {
  const { isAdmin } = useAuth();
  const { responsaveis } = useCRM();
  const reload = useDemandas((s) => s.load);
  const createDemanda = useDemandas((s) => s.createDemanda);
  const updateDemanda = useDemandas((s) => s.updateDemanda);
  const [generating, setGenerating] = useState(false);
  const [novoCardPaiId, setNovoCardPaiId] = useState<string | null>(null);
  const [modeloDialogOpen, setModeloDialogOpen] = useState(false);

  useOperationalTemplatesBootstrap();
  const templates = useOperationalTemplates((s) => s.templates);

  const demandasOrdenadas = useMemo(() => {
    const ordemMap = new Map(templates.map((t) => [t.id, t.ordem]));
    return [...demandas]
      .filter((d) => d.process_step_type !== "status")
      .sort((a, b) => {
        const oa = a.template_id ? (ordemMap.get(a.template_id) ?? 9999) : 9999;
        const ob = b.template_id ? (ordemMap.get(b.template_id) ?? 9999) : 9999;
        if (oa !== ob) return oa - ob;
        return 0;
      });
  }, [demandas, templates]);

  const handleGerar = async () => {
    setGenerating(true);
    try {
      const n = await gerarEstruturaOperacional(clienteId);
      if (n > 0) {
        toast.success(`${n} ${n === 1 ? "card de estrutura criado" : "cards de estrutura criados"}`);
        await reload();
      } else {
        toast.info("Estrutura operacional já está completa para este cliente.");
      }
    } finally {
      setGenerating(false);
    }
  };

  /** Cria Card Pai vazio. */
  async function criarCardPaiEmBranco(): Promise<string | null> {
    return await createDemanda({
      cliente_id: clienteId,
      titulo: "Novo processo (Card Pai)",
      categoria: "Operacional" as any,
      status: "Planejamento" as any,
      ...({ is_card_pai: true } as any),
    } as any);
  }

  /** Cria Card Pai com etapas pré-preenchidas pelo modelo. */
  async function criarCardPaiDeModelo(templateId: CardPaiTemplateId): Promise<string | null> {
    const tpl = CARD_PAI_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return null;

    // 1. Cria o card pai
    const cardPaiId = await createDemanda({
      cliente_id: clienteId,
      titulo: tpl.cardPai.titulo,
      categoria: tpl.cardPai.categoria as any,
      subtipo: tpl.cardPai.subtipo,
      descricao: tpl.cardPai.descricao,
      prioridade: "Media" as any,
      status: "Planejamento" as any,
      ...({ is_card_pai: true } as any),
    } as any);
    if (!cardPaiId) return null;

    // 2. Cria as etapas em sequência
    const idsCriados: string[] = [];
    let faltouResp = false;
    for (let i = 0; i < tpl.steps.length; i++) {
      const step = tpl.steps[i];
      const respId =
        tpl.id === "meta_ads" && step.titulo === "Ativar campanha Meta Ads"
          ? findResponsavelIdByNomes(responsaveis, ["Gleice", "Grace", "Greice", "GLEICE", "GREICE"])
          : findResponsavelIdByNome(responsaveis, step.responsavelNome);
      if (step.responsavelNome && !respId) faltouResp = true;

      const dependsOnIdx =
        typeof step.dependsOnStepIndex === "number"
          ? step.dependsOnStepIndex
          : i > 0
            ? i - 1
            : -1;
      const dependsOnRaw = dependsOnIdx >= 0 ? idsCriados[dependsOnIdx] : null;
      const dependsOn = dependsOnRaw && dependsOnRaw.length > 0 ? dependsOnRaw : null;
      const bloqueada = !!step.bloqueada && !!dependsOn;

      const STATUS_VALIDOS = ["Planejamento","Criar","Revisar","Entregue","Concluido","Atrasado"];
      const statusBruto = step.tipo === "status" ? "Planejamento" : (step.statusInicial ?? "Planejamento");
      const statusFinal: any = STATUS_VALIDOS.includes(statusBruto) ? statusBruto : "Planejamento";


      const novoId = await createDemanda({
        cliente_id: clienteId,
        titulo: step.titulo,
        categoria: (step.tipo === "tarefa" ? step.categoria : "Operacional") as any,
        subtipo: step.tipo === "tarefa" ? step.subtipo ?? null : null,
        descricao: step.observacao ?? null,
        prioridade: "Media" as any,
        status: statusFinal,
        responsaveis_ids: respId ? [respId] : [],
        ...({
          parent_process_id: cardPaiId,
          process_step_order: i,
          process_step_type: step.tipo,
          process_step_status: bloqueada ? "bloqueada" : "pendente",
          process_depends_on: dependsOn,
          process_step_config: {
            bloquear_ate_concluir: !!step.bloqueada,
            status_interno_label: step.tipo === "status" ? step.titulo : undefined,
            modelo_origem: tpl.id,
          },
        } as any),
      } as any);
      idsCriados.push(novoId ?? "");
    }


    if (faltouResp) {
      toast.warning(
        "Algum responsável padrão não foi encontrado. Atribua manualmente nas etapas.",
      );
    }
    return cardPaiId;
  }

  const handleNovoCardPai = async () => {
    setModeloDialogOpen(true);
  };

  const handleEscolherModelo = async (templateId: CardPaiTemplateId | null) => {
    const id = templateId
      ? await criarCardPaiDeModelo(templateId)
      : await criarCardPaiEmBranco();
    if (id) {
      setNovoCardPaiId(id);
      await reload(true);
    }
  };

  const cardPaiAberto = useMemo(
    () => demandas.find((d) => d.id === novoCardPaiId) ?? null,
    [demandas, novoCardPaiId],
  );

  // Backfill: garante que todo Card Pai "Ativar campanha Meta Ads" tenha a etapa final tarefa.
  const backfilledRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const tpl = CARD_PAI_TEMPLATES.find((t) => t.id === "meta_ads");
    if (!tpl) return;
    const tituloFinal = "Ativar campanha Meta Ads";
    const tituloAprov = "Aguardando aprovação do cliente";
    const cardsPai = demandas.filter(
      (d: any) => d.is_card_pai && (d.titulo ?? "").trim() === tituloFinal,
    );
    cardsPai.forEach(async (cp: any) => {
      if (backfilledRef.current.has(cp.id)) return;
      const filhos = demandas.filter((d: any) => d.parent_process_id === cp.id);
      const jaTemEtapaFinal = filhos.some(
        (d: any) =>
          d.process_step_type === "tarefa" &&
          (d.titulo ?? "").trim() === tituloFinal,
      );
      if (jaTemEtapaFinal) {
        backfilledRef.current.add(cp.id);
        return;
      }
      const etapaAprov = filhos.find(
        (d: any) =>
          d.process_step_type === "status" &&
          (d.titulo ?? "").trim() === tituloAprov,
      );
      const dependsOn = etapaAprov?.id ?? null;
      const maxOrder = filhos.reduce(
        (m: number, d: any) =>
          typeof d.process_step_order === "number" && d.process_step_order > m
            ? d.process_step_order
            : m,
        -1,
      );
      const stepFinal = tpl.steps[tpl.steps.length - 1];
      const respId = findResponsavelIdByNome(responsaveis, stepFinal.responsavelNome);
      backfilledRef.current.add(cp.id);
      await createDemanda({
        cliente_id: clienteId,
        titulo: stepFinal.titulo,
        categoria: stepFinal.categoria as any,
        subtipo: stepFinal.subtipo ?? null,
        descricao: stepFinal.observacao ?? null,
        prioridade: "Media" as any,
        status: "Planejamento" as any,
        responsaveis_ids: respId ? [respId] : [],
        ...({
          parent_process_id: cp.id,
          process_step_order: maxOrder + 1,
          process_step_type: "tarefa",
          process_step_status: dependsOn ? "bloqueada" : "pendente",
          process_depends_on: dependsOn,
          process_step_config: {
            bloquear_ate_concluir: true,
            modelo_origem: "meta_ads",
            backfill: true,
          },
        } as any),
      } as any);
      await reload(true);
    });
  }, [demandas, clienteId, responsaveis, createDemanda, reload]);



  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={handleGerar} disabled={generating}>
            <Sparkles className="h-4 w-4 mr-1" />
            {generating ? "Gerando…" : "Gerar estrutura operacional"}
          </Button>
        </div>
      )}
      <AreaTab
        titulo="Operacional"
        icone={Rocket}
        clienteId={clienteId}
        demandas={demandasOrdenadas}
        categoria={"Operacional" as any}
        emptyHint='Nenhuma tarefa operacional ainda. Use "Gerar estrutura operacional" para criar o pacote padrão, ou crie um Card Pai para iniciar um processo multi-etapas.'
        demandaInicial={cardPaiAberto ?? demandaInicial ?? null}
        allowBulkDelete={isAdmin}
        onNovoCardPai={handleNovoCardPai}
      />
      <EscolherModeloCardPaiDialog
        open={modeloDialogOpen}
        onOpenChange={setModeloDialogOpen}
        onSelect={handleEscolherModelo}
      />
    </div>
  );
}
