import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCRM } from "@/store/crm";
import { useDemandasStore } from "@/store/demandas";
import { toast } from "sonner";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  type DemandaCategoria,
} from "@/lib/demandas-categorias";
import { categoriaParaAba } from "@/lib/minhasTarefas";
import { DemandaDetalheDialog } from "@/components/demandas/DemandaDetalheDialog";

type AreaSel = DemandaCategoria | "Posts";

// Ordem solicitada de exibição das áreas no seletor.
const AREAS_ORDEM: AreaSel[] = [
  "Posts",
  "EditorVideo",
  "TrafegoPago",
  "LandingPage",
  "IAAtendimento",
  "Operacional",
  "Personalizado",
];

const AREA_LABEL: Record<AreaSel, string> = {
  Posts: "Posts",
  ...CATEGORIA_LABEL,
} as Record<AreaSel, string>;

export default function CriarTarefa() {
  const navigate = useNavigate();
  const { clientes, createCardRascunho } = useCRM();
  const createRascunho = useDemandasStore((s) => s.createRascunho);
  const updateDemanda = useDemandasStore((s) => s.updateDemanda);
  const deleteDemanda = useDemandasStore((s) => s.deleteDemanda);
  const demandas = useDemandasStore((s) => s.demandas);

  const [clienteId, setClienteId] = useState<string>("");
  const [area, setArea] = useState<AreaSel | "">("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const initRef = useRef(false);
  const switchingRef = useRef(false);

  // Inicializa cliente padrão (primeiro disponível) e cria rascunho silencioso
  // imediatamente para que o formulário completo apareça já no carregamento.
  useEffect(() => {
    if (initRef.current) return;
    if (!clientes.length) return;
    initRef.current = true;
    const primeiro = clientes[0].id;
    (async () => {
      const novo = await createRascunho({
        cliente_id: primeiro,
        categoria: "Personalizado",
      });
      if (novo) setDraftId(novo.id);
    })();
  }, [clientes, createRascunho]);

  const liveDraft = draftId
    ? demandas.find((d) => d.id === draftId) ?? null
    : null;

  const handleClienteChange = async (novoId: string) => {
    setClienteId(novoId);
    if (draftId) {
      await updateDemanda(draftId, { cliente_id: novoId });
    }
  };

  const handleAreaChange = async (nova: AreaSel) => {
    if (nova === area) return;
    setArea(nova);

    if (nova === "Posts") {
      // Comuta para o formulário de Post: descarta o rascunho de demanda
      // e abre o formulário de Posts já existente no Projeto Completo.
      if (!clienteId) {
        toast.error("Selecione um cliente para criar a tarefa.");
        return;
      }
      switchingRef.current = true;
      const idParaRemover = draftId;
      setDraftId(null);
      if (idParaRemover) {
        await deleteDemanda(idParaRemover);
      }
      const res = await createCardRascunho({ cliente_id: clienteId });
      if (res) {
        navigate(
          `/clientes/${clienteId}/projeto?tab=posts&post=${res.postId}`,
        );
      }
      return;
    }

    if (!draftId) {
      // Veio de "Posts" sem ter rascunho de demanda — cria um novo.
      if (!clienteId) return;
      const novo = await createRascunho({
        cliente_id: clienteId,
        categoria: nova as DemandaCategoria,
      });
      if (novo) setDraftId(novo.id);
      return;
    }

    await updateDemanda(draftId, { categoria: nova as DemandaCategoria });
  };

  const handleDialogClose = (open: boolean) => {
    if (open) return;
    if (switchingRef.current) {
      switchingRef.current = false;
      return;
    }
    const id = draftId;
    setDraftId(null);
    setTimeout(() => {
      if (!id) {
        navigate(-1);
        return;
      }
      const ainda = useDemandasStore
        .getState()
        .demandas.find((d) => d.id === id);
      if (ainda) {
        navigate(
          `/clientes/${ainda.cliente_id}/projeto?tab=${categoriaParaAba(
            ainda.categoria,
          )}&demanda=${ainda.id}`,
        );
      } else {
        navigate(-1);
      }
    }, 0);
  };

  // Slot renderizado no topo do formulário original (Cliente + Área).
  const headerExtras = (
    <div className="rounded-md border bg-muted/30 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Cliente *</Label>
        <Select value={clienteId} onValueChange={handleClienteChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome_cliente}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Área / Categoria *</Label>
        <Select
          value={area}
          onValueChange={(v) => handleAreaChange(v as AreaSel)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecione a área/categoria" />
          </SelectTrigger>
          <SelectContent>
            {AREAS_ORDEM.filter(
              (a) => a === "Posts" || (CATEGORIAS as readonly string[]).includes(a),
            ).map((a) => (
              <SelectItem key={a} value={a}>
                {AREA_LABEL[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {liveDraft ? (
        <DemandaDetalheDialog
          demanda={liveDraft}
          isRascunho
          onOpenChange={handleDialogClose}
          headerExtras={headerExtras}
        />
      ) : (
        <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
          Preparando formulário...
        </div>
      )}
    </div>
  );
}
