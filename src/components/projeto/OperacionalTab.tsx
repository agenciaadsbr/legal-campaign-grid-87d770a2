import { useState, useMemo } from "react";
import { Rocket, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDemandas, type Demanda } from "@/store/demandas";
import { prepararEstruturaOperacional, confirmarGeracaoEstrutura, useOperationalTemplates, useOperationalTemplatesBootstrap } from "@/store/operationalTemplates";
import { AreaTab } from "@/components/projeto/AreaTab";
import { OperationalPreviewModal } from "@/components/projeto/OperationalPreviewModal";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  clienteId: string;
  demandas: Demanda[];
  demandaInicial?: Demanda | null;
}

export function OperacionalTab({ clienteId, demandas, demandaInicial }: Props) {
  const { isAdmin } = useAuth();
  const reload = useDemandas((s) => s.load);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);

  useOperationalTemplatesBootstrap();
  const { templates, loading: templatesLoading } = useOperationalTemplates();

  const demandasOrdenadas = useMemo(() => {
    const ordemMap = new Map(templates.map((t) => [t.id, t.ordem]));
    return [...demandas].sort((a, b) => {
      const oa = a.template_id ? (ordemMap.get(a.template_id) ?? 9999) : 9999;
      const ob = b.template_id ? (ordemMap.get(b.template_id) ?? 9999) : 9999;
      if (oa !== ob) return oa - ob;
      return 0;
    });
  }, [demandas, templates]);

  const handleGerarClick = async () => {
    const jaTem = demandas.length > 0;
    if (jaTem) {
      setAlertOpen(true);
    } else {
      await startGeneration();
    }
  };

  const startGeneration = async () => {
    setGenerating(true);
    try {
      const data = await prepararEstruturaOperacional(clienteId);
      if (data.length === 0) {
        toast.info("A estrutura operacional já foi gerada ou não há novos itens para este cliente.");
        return;
      }
      setPreviewData(data);
      setPreviewOpen(true);
    } catch (error: any) {
      console.error("Erro ao preparar estrutura:", error);
      toast.error("Erro ao preparar estrutura operacional");
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = async (payload: any[]) => {
    const n = await confirmarGeracaoEstrutura(clienteId, payload);
    if (n > 0) {
      await reload();
    }
  };

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={handleGerarClick} disabled={generating || templatesLoading}>
            <Sparkles className="h-4 w-4 mr-1" />
            {generating ? "Gerando…" : templatesLoading ? "Carregando…" : "Gerar estrutura operacional"}
          </Button>
        </div>
      )}
      <AreaTab
        titulo="Operacional"
        icone={Rocket}
        clienteId={clienteId}
        demandas={demandasOrdenadas}
        categoria={"Operacional" as any}
        emptyHint='Nenhuma tarefa operacional ainda. Use "Gerar estrutura operacional" para criar o pacote padrão de onboarding.'
        demandaInicial={demandaInicial ?? null}
      />

      <OperationalPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        clienteId={clienteId}
        previewData={previewData}
        onConfirm={handleConfirm}
      />

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Estrutura já existente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Este cliente já possui uma estrutura operacional gerada. Deseja gerar novamente os itens ausentes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={startGeneration}>Gerar somente itens ausentes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
