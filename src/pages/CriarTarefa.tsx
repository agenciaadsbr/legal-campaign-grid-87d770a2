import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM } from "@/store/crm";
import { useDemandasStore, type Demanda } from "@/store/demandas";
import { toast } from "sonner";
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
  const [draftDemanda, setDraftDemanda] = useState<Demanda | null>(null);

  // Mantém referência reativa ao rascunho a partir do store (para detectar se foi descartado)
  const liveDraft = draftDemanda
    ? demandas.find((d) => d.id === draftDemanda.id) ?? null
    : null;

  const cliente = clientes.find((c) => c.id === clienteId);

  const handleContinuar = async () => {
    if (!clienteId) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!categoria) {
      toast.error("Selecione uma área");
      return;
    }
    setCreating(true);
    try {
      if (categoria === "Posts") {
        const res = await createCardRascunho({ cliente_id: clienteId });
        if (res) {
          // O formulário de Post existe dentro do Projeto Completo (mesma UX).
          navigate(`/clientes/${clienteId}/projeto?tab=posts&post=${res.postId}`);
        }
      } else {
        const novo = await createRascunho({
          cliente_id: clienteId,
          categoria: categoria as DemandaCategoria,
        });
        if (novo) {
          setDraftDemanda(novo);
        }
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (open) return;
    const id = draftDemanda?.id;
    setDraftDemanda(null);
    // Após fechar, se o rascunho ainda existe no store (foi preenchido), navega para o Projeto Completo.
    setTimeout(() => {
      if (!id) return;
      const ainda = useDemandasStore.getState().demandas.find((d) => d.id === id);
      if (ainda) {
        navigate(
          `/clientes/${ainda.cliente_id}/projeto?tab=${categoriaParaAba(ainda.categoria)}&demanda=${ainda.id}`,
        );
      }
      // Caso contrário, o DemandaDetalheDialog descartou o rascunho silenciosamente.
      // Permanecemos na tela de seleção, pronta para nova criação.
    }, 0);
  };

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
            Selecione o cliente e a área da tarefa. Em seguida você abrirá o mesmo
            formulário usado dentro do Projeto Completo do cliente.
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Cliente *</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
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
            <Select value={categoria} onValueChange={(v) => setCategoria(v as AreaSel)}>
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

          {cliente && categoria && (
            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Será criada uma tarefa para{" "}
              <span className="font-medium text-foreground">{cliente.nome_cliente}</span>{" "}
              na área{" "}
              <span className="font-medium text-foreground">
                {categoria === "Posts" ? "Posts" : CATEGORIA_LABEL[categoria as DemandaCategoria]}
              </span>
              .
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleContinuar}
              disabled={!clienteId || !categoria || creating}
              className="flex-1"
            >
              {creating ? "Abrindo..." : "Continuar"}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)} disabled={creating}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mesmo formulário usado nos cards do Projeto Completo */}
      {liveDraft && (
        <DemandaDetalheDialog
          demanda={liveDraft}
          isRascunho
          onOpenChange={handleDialogClose}
        />
      )}
    </div>
  );
}
