import { useState, useMemo } from "react";
import { Rocket, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useDemandas, type Demanda } from "@/store/demandas";
import { gerarEstruturaOperacional, useOperationalTemplates, useOperationalTemplatesBootstrap } from "@/store/operationalTemplates";
import { AreaTab } from "@/components/projeto/AreaTab";
import { CardPaiFormDialog, CardsPaiLista } from "@/components/projeto/cardPai/CardPaiUI";
import { useCardPaiBootstrap } from "@/store/cardPai";
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
  const [novoCardPaiOpen, setNovoCardPaiOpen] = useState(false);

  useOperationalTemplatesBootstrap();
  useCardPaiBootstrap(clienteId);
  const templates = useOperationalTemplates((s) => s.templates);

  const demandasOrdenadas = useMemo(() => {
    const ordemMap = new Map(templates.map((t) => [t.id, t.ordem]));
    return [...demandas].sort((a, b) => {
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
        allowBulkDelete={isAdmin}
        extraTop={<CardsPaiLista clienteId={clienteId} />}
        novaTarefaExtra={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" aria-label="Mais opções de criação">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setNovoCardPaiOpen(true)}>
                Novo Card Pai
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <CardPaiFormDialog
        clienteId={clienteId}
        open={novoCardPaiOpen}
        onOpenChange={setNovoCardPaiOpen}
      />
    </div>
  );
}
