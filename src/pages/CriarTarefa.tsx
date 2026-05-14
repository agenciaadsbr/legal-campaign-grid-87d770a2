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
  const createRascunho = useDemandasStore((s) => s.createRascunho);
  const updateDemanda = useDemandasStore((s) => s.updateDemanda);
  const deleteDemanda = useDemandasStore((s) => s.deleteDemanda);
  const demandas = useDemandasStore((s) => s.demandas);

  const [clienteId, setClienteId] = useState<string>("");
  const [area, setArea] = useState<AreaSel | "">("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const switchingRef = useRef(false);
  const creatingRef = useRef(false);

  // Cria rascunho de demanda apenas quando cliente + área (não-Posts) já foram escolhidos.
  useEffect(() => {
    if (!clienteId || !area || area === "Posts") return;
    if (draftId) return;
    if (creatingRef.current) return;
    creatingRef.current = true;
    (async () => {
      const novo = await createRascunho({
        cliente_id: clienteId,
        categoria: area as DemandaCategoria,
      });
      if (novo) setDraftId(novo.id);
      creatingRef.current = false;
    })();
  }, [clienteId, area, draftId, createRascunho]);

  const liveDraft = draftId
    ? demandas.find((d) => d.id === draftId) ?? null
    : null;

  const handleClienteChange = async (novoId: string) => {
    setClienteId(novoId);
    if (draftId) {
      await updateDemanda(draftId, { cliente_id: novoId });
    }
    // Se já havia escolhido "Posts" antes do cliente, agora dispara o fluxo.
    if (area === "Posts" && novoId) {
      switchingRef.current = true;
      const res = await createCardRascunho({ cliente_id: novoId });
      if (res) {
        navigate(`/clientes/${novoId}/projeto?tab=posts&post=${res.postId}`);
      }
    }
  };

  const handleAreaChange = async (nova: AreaSel) => {
    if (nova === area) return;
    setArea(nova);

    if (nova === "Posts") {
      // Descarta rascunho de demanda, se houver.
      const idParaRemover = draftId;
      setDraftId(null);
      if (idParaRemover) {
        switchingRef.current = true;
        await deleteDemanda(idParaRemover);
      }
      if (!clienteId) {
        // Aguarda o usuário escolher um cliente para abrir o fluxo de Posts.
        return;
      }
      switchingRef.current = true;
      const res = await createCardRascunho({ cliente_id: clienteId });
      if (res) {
        navigate(`/clientes/${clienteId}/projeto?tab=posts&post=${res.postId}`);
      }
      return;
    }

    if (draftId) {
      await updateDemanda(draftId, { categoria: nova as DemandaCategoria });
    }
    // Se ainda não houver draft, o useEffect cria assim que cliente + área existirem.
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
          value={area || undefined}
          onValueChange={(v) => handleAreaChange(v as AreaSel)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Selecione a área" />
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

  const pronto = clienteId && area && area !== "Posts" && liveDraft;

  return (
    <div className="min-h-screen bg-background">
      {pronto ? (
        <DemandaDetalheDialog
          demanda={liveDraft!}
          isRascunho
          onOpenChange={handleDialogClose}
          headerExtras={headerExtras}
        />
      ) : (
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          <h1 className="text-lg font-semibold">Criar Tarefa</h1>
          {headerExtras}
          <p className="text-sm text-muted-foreground">
            {area === "Posts" && !clienteId
              ? "Selecione um cliente para abrir o formulário de Post."
              : "Selecione cliente e área para começar."}
          </p>
        </div>
      )}
    </div>
  );
}
