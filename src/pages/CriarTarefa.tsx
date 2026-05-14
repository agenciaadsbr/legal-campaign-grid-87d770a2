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
  const createLocalRascunho = useDemandasStore((s) => s.createLocalRascunho);
  const commitLocalRascunho = useDemandasStore((s) => s.commitLocalRascunho);
  const updateDemanda = useDemandasStore((s) => s.updateDemanda);
  const deleteDemanda = useDemandasStore((s) => s.deleteDemanda);
  const demandas = useDemandasStore((s) => s.demandas);

  const [clienteId, setClienteId] = useState<string>("");
  const [area, setArea] = useState<AreaSel | "">("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const initRef = useRef(false);

  // Cria o rascunho LOCAL (apenas em memória) ao montar.
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const novo = createLocalRascunho({});
    setDraftId(novo.id);
    // Cleanup: descarta o rascunho local se o componente desmontar sem salvar.
    return () => {
      // usa o id capturado no closure
      deleteDemanda(novo.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveDraft = draftId
    ? demandas.find((d) => d.id === draftId) ?? null
    : null;

  const handleClienteChange = (novoId: string) => {
    setClienteId(novoId);
    if (draftId) {
      updateDemanda(draftId, { cliente_id: novoId });
    }
  };

  const handleAreaChange = async (nova: AreaSel) => {
    if (nova === area) return;

    if (nova === "Posts") {
      if (!clienteId) {
        toast.error("Selecione um cliente para criar a tarefa.");
        return;
      }
      // Descarta rascunho local e segue fluxo legado de Posts.
      const idParaRemover = draftId;
      setDraftId(null);
      setArea(nova);
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
    }
  };

  const handleCancel = async () => {
    const id = draftId;
    setDraftId(null);
    if (id) await deleteDemanda(id);
    navigate(-1);
  };

  const handleSave = async () => {
    if (!draftId || !liveDraft) return;
    if (!clienteId) {
      toast.error("Selecione um cliente para criar a tarefa.");
      return;
    }
    if (!area) {
      toast.error("Selecione uma área/categoria para criar a tarefa.");
      return;
    }
    if (!liveDraft.titulo.trim()) {
      toast.error("Informe um título para a tarefa.");
      return;
    }
    const nova = await commitLocalRascunho(draftId);
    if (!nova) return;
    setDraftId(null);
    toast.success("Tarefa criada");
    navigate(
      `/clientes/${nova.cliente_id}/projeto?tab=${categoriaParaAba(nova.categoria)}&demanda=${nova.id}`,
    );
  };

  const handleDialogClose = (open: boolean) => {
    if (open) return;
    handleCancel();
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

  if (!liveDraft) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DemandaDetalheDialog
        demanda={liveDraft}
        isRascunho
        onOpenChange={handleDialogClose}
        headerExtras={headerExtras}
        showSaveButton
        onSave={handleSave}
        onCancel={handleCancel}
        disableAutoDiscard
      />
    </div>
  );
}
