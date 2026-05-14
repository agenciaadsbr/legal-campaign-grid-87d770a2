import { useRef, useState } from "react";
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
import { DemandaDetalheDialog } from "@/components/demandas/DemandaDetalheDialog";

type AreaSel = DemandaCategoria | "Posts";

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
  const switchingRef = useRef(false);
  const creatingRef = useRef(false);

  const liveDraft = draftId
    ? demandas.find((d) => d.id === draftId) ?? null
    : null;

  // Cria o rascunho APENAS quando Cliente e Área (≠ Posts) estão preenchidos.
  const ensureDraft = async (cli: string, ar: AreaSel) => {
    if (draftId || creatingRef.current) return;
    if (!cli || !ar || ar === "Posts") return;
    creatingRef.current = true;
    try {
      const novo = await createRascunho({
        cliente_id: cli,
        categoria: ar as DemandaCategoria,
      });
      if (novo) setDraftId(novo.id);
    } finally {
      creatingRef.current = false;
    }
  };

  const handleClienteChange = async (novoId: string) => {
    setClienteId(novoId);
    if (draftId) {
      await updateDemanda(draftId, { cliente_id: novoId });
    } else if (area && area !== "Posts") {
      await ensureDraft(novoId, area as AreaSel);
    }
  };

  const handleAreaChange = async (nova: AreaSel) => {
    if (nova === area) return;

    if (nova === "Posts") {
      if (!clienteId) {
        toast.error("Selecione um cliente para criar a tarefa.");
        return;
      }
      setArea(nova);
      switchingRef.current = true;
      const idParaRemover = draftId;
      setDraftId(null);
      if (idParaRemover) {
        await deleteDemanda(idParaRemover);
      }
      const res = await createCardRascunho({ cliente_id: clienteId });
      if (res) {
        navigate(`/clientes/${clienteId}/projeto?tab=posts&post=${res.postId}`);
      }
      return;
    }

    setArea(nova);

    if (draftId) {
      await updateDemanda(draftId, { categoria: nova as DemandaCategoria });
    } else if (clienteId) {
      await ensureDraft(clienteId, nova);
    }
  };

  const handleDialogClose = async (open: boolean) => {
    if (open) return;
    if (switchingRef.current) {
      switchingRef.current = false;
      return;
    }
    const id = draftId;
    setDraftId(null);
    // Descarta SEMPRE o rascunho ao fechar sem salvar explicitamente.
    if (id) {
      await deleteDemanda(id);
    }
    // NUNCA redireciona para o cliente — apenas volta para a tela anterior.
    navigate(-1);
  };

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
        <div className="max-w-2xl mx-auto p-6 space-y-4">
          <h1 className="text-lg font-semibold">Criar tarefa</h1>
          {headerExtras}
          <p className="text-sm text-muted-foreground">
            Selecione um cliente e uma área/categoria para começar.
          </p>
        </div>
      )}
    </div>
  );
}
