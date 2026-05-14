import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM } from "@/store/crm";
import { useDemandasStore, type Demanda } from "@/store/demandas";
import { ChevronLeft, Sparkles } from "lucide-react";
import {
  CATEGORIAS,
  CATEGORIA_LABEL,
  type DemandaCategoria,
} from "@/lib/demandas-categorias";
import { categoriaParaAba } from "@/lib/minhasTarefas";
import { DemandaDetalheDialog } from "@/components/demandas/DemandaDetalheDialog";

type AreaSel = DemandaCategoria | "Posts" | "";

export default function CriarTarefa() {
  const navigate = useNavigate();
  const { clientes, createCardRascunho } = useCRM();
  const createRascunho = useDemandasStore((s) => s.createRascunho);
  const demandas = useDemandasStore((s) => s.demandas);

  const [clienteId, setClienteId] = useState("");
  const [categoria, setCategoria] = useState<AreaSel>("");
  const [creating, setCreating] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const liveDraft: Demanda | null = draftId
    ? demandas.find((d) => d.id === draftId) ?? null
    : null;

  // Cria rascunho automaticamente assim que cliente + área forem definidos.
  useEffect(() => {
    if (!clienteId || !categoria || draftId || creating) return;

    let cancel = false;
    (async () => {
      setCreating(true);
      try {
        if (categoria === "Posts") {
          const res = await createCardRascunho({ cliente_id: clienteId });
          if (res && !cancel) {
            navigate(`/clientes/${clienteId}/projeto?tab=posts&post=${res.postId}`);
          }
        } else {
          const novo = await createRascunho({
            cliente_id: clienteId,
            categoria: categoria as DemandaCategoria,
          });
          if (novo && !cancel) {
            setDraftId(novo.id);
          }
        }
      } finally {
        if (!cancel) setCreating(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [clienteId, categoria, draftId, creating, createCardRascunho, createRascunho, navigate]);

  const handleDialogClose = (open: boolean) => {
    if (open) return;
    const id = draftId;
    setDraftId(null);
    setTimeout(() => {
      if (!id) return;
      const ainda = useDemandasStore.getState().demandas.find((d) => d.id === id);
      if (ainda) {
        navigate(
          `/clientes/${ainda.cliente_id}/projeto?tab=${categoriaParaAba(ainda.categoria)}&demanda=${ainda.id}`,
        );
      } else {
        // Rascunho descartado — reseta para nova criação
        setCategoria("");
      }
    }, 0);
  };

  // Enquanto o rascunho não existe, mostra a mini-seleção inicial.
  if (!liveDraft) {
    return (
      <div className="p-6 max-w-xl mx-auto min-h-screen bg-background animate-fade-in">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Criar nova tarefa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Selecione o cliente e a área. O formulário completo abrirá em seguida —
              é o mesmo usado dentro do Projeto Completo do cliente.
            </p>

            <div className="space-y-2">
              <Label className="text-xs">Cliente *</Label>
              <Select value={clienteId} onValueChange={setClienteId} disabled={creating}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label className="text-xs">Área / Categoria *</Label>
              <Select
                value={categoria}
                onValueChange={(v) => setCategoria(v as AreaSel)}
                disabled={creating || !clienteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Posts">Posts</SelectItem>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORIA_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {creating && (
              <div className="text-xs text-muted-foreground">Abrindo formulário...</div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rascunho criado: mostra o mesmo formulário do Projeto Completo.
  return (
    <div className="min-h-screen bg-background">
      <DemandaDetalheDialog
        demanda={liveDraft}
        isRascunho
        onOpenChange={handleDialogClose}
      />
    </div>
  );
}
