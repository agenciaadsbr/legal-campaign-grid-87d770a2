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
  const [generating, setGenerating] = useState(false);

  useOperationalTemplatesBootstrap();
  const templates = useOperationalTemplates((s) => s.templates);

  const demandasOrdenadas = useMemo(() => {
    const ordemMap = new Map(templates.map((t) => [t.id, t.ordem]));
    return [...demandas].sort((a, b) => {
      const oa = a.template_id ? (ordemMap.get(a.template_id) ?? 9999) : 9999;
      const ob = b.template_id ? (ordemMap.get(b.template_id) ?? 9999) : 9999;
      if (oa !== ob) return oa - ob;
      // fallback: manter ordem original se mesma ordem
      return 0;
    });
  }, [demandas, templates]);

  const handleGerar = async () => {
    setGenerating(true);
    try {
      const n = await gerarEstruturaOperacional(clienteId);
      if (n > 0) {
        toast.success(`${n} ${n === 1 ? "card operacional criado" : "cards operacionais criados"}`);
        await reload();
      } else {
        toast.info("Estrutura operacional já está completa para este cliente.");
      }
    } finally {
      setGenerating(false);
    }
  };

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
        emptyHint='Nenhuma tarefa operacional ainda. Use "Gerar estrutura operacional" para criar o pacote padrão de onboarding.'
        demandaInicial={demandaInicial ?? null}
      />
    </div>
  );
}
