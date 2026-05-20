import { useState, useMemo } from "react";
import { Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDemandas, type Demanda } from "@/store/demandas";
import { gerarEstruturaOperacional, useOperationalTemplates, useOperationalTemplatesBootstrap } from "@/store/operationalTemplates";
import { AreaTab } from "@/components/projeto/AreaTab";
import { toast } from "sonner";

interface Props {
  clienteId: string;
  demandas: Demanda[];
  demandaInicial?: Demanda | null;
}

export function OperacionalTab({ clienteId, demandas, demandaInicial }: Props) {
  const { isAdmin } = useAuth();
  const reload = useDemandas((s) => s.load);
  const createDemanda = useDemandas((s) => s.createDemanda);
  const setOpenDemanda = useDemandas as any; // not used here
  const [generating, setGenerating] = useState(false);
  const [novoCardPaiId, setNovoCardPaiId] = useState<string | null>(null);

  useOperationalTemplatesBootstrap();
  const templates = useOperationalTemplates((s) => s.templates);

  const demandasOrdenadas = useMemo(() => {
    const ordemMap = new Map(templates.map((t) => [t.id, t.ordem]));
    // Esconde etapas de Card Pai do tipo "status" do Kanban operacional
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

  const handleNovoCardPai = async () => {
    const id = await createDemanda({
      cliente_id: clienteId,
      titulo: "Novo processo (Card Pai)",
      categoria: "Operacional" as any,
      status: "Planejamento" as any,
      ...( { is_card_pai: true } as any ),
    });
    if (id) {
      setNovoCardPaiId(id);
      await reload(true);
    }
  };

  // Demanda recém-criada para abrir automaticamente (deep-link interno).
  const cardPaiAberto = useMemo(
    () => demandas.find((d) => d.id === novoCardPaiId) ?? null,
    [demandas, novoCardPaiId],
  );

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
    </div>
  );
}
