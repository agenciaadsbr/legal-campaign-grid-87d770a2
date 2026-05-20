import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Check, X, Trash2, Lock } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Tabela =
  | "demanda_categorias_custom"
  | "demanda_prioridades_custom"
  | "demanda_status_custom";

interface Item {
  id: string;
  label: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  protegido?: boolean;
}

function Lista({ tabela, titulo }: { tabela: Tabela; titulo: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [novoLabel, setNovoLabel] = useState("");
  const [novaCor, setNovaCor] = useState("#10b981");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCor, setEditCor] = useState("#10b981");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(tabela)
      .select("*")
      .order("ordem", { ascending: true })
      .order("label", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela]);

  const adicionar = async () => {
    const label = novoLabel.trim();
    if (!label) return;
    if (items.some((i) => i.label.toLowerCase() === label.toLowerCase())) {
      toast.error("Já existe um item com esse nome");
      return;
    }
    const ordem = (items.at(-1)?.ordem ?? 0) + 1;
    const { error } = await supabase
      .from(tabela)
      .insert({ label, cor: novaCor, ordem, ativo: true } as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Item adicionado");
    setNovoLabel("");
    load();
  };

  const iniciarEdicao = (it: Item) => {
    setEditandoId(it.id);
    setEditLabel(it.label);
    setEditCor(it.cor);
  };
  const cancelarEdicao = () => {
    setEditandoId(null);
    setEditLabel("");
  };
  const salvarEdicao = async (it: Item) => {
    const label = editLabel.trim();
    if (!label) {
      toast.error("Nome não pode ficar vazio");
      return;
    }
    const { error } = await supabase
      .from(tabela)
      .update({ label, cor: editCor })
      .eq("id", it.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Item atualizado");
    cancelarEdicao();
    load();
  };
  const toggleAtivo = async (it: Item) => {
    const { error } = await supabase
      .from(tabela)
      .update({ ativo: !it.ativo })
      .eq("id", it.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };
  const remover = async (it: Item) => {
    const { error } = await supabase.from(tabela).delete().eq("id", it.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Item removido");
    load();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-xs text-muted-foreground py-4 text-center">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">Nenhum item</div>
        ) : (
          <div className="space-y-1.5">
            {items.map((it) =>
              editandoId === it.id ? (
                <div
                  key={it.id}
                  className="flex items-center gap-2 p-2 rounded-md border bg-card"
                >
                  <input
                    type="color"
                    value={editCor}
                    onChange={(e) => setEditCor(e.target.value)}
                    className="h-8 w-10 rounded cursor-pointer border bg-transparent"
                  />
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") salvarEdicao(it);
                      if (e.key === "Escape") cancelarEdicao();
                    }}
                    className="h-8 text-sm flex-1"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-primary"
                    onClick={() => salvarEdicao(it)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={cancelarEdicao}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  key={it.id}
                  className="flex items-center gap-2 p-2 rounded-md border bg-card"
                >
                  <span
                    className="h-4 w-4 rounded-full border"
                    style={{ backgroundColor: it.cor }}
                  />
                  <span className="text-sm flex-1">{it.label}</span>
                  {it.protegido && (
                    <Badge variant="outline" className="gap-1 h-5 px-1.5 text-[10px]">
                      <Lock className="h-3 w-3" /> Protegido
                    </Badge>
                  )}
                  {!it.ativo && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground">
                      Inativo
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleAtivo(it)}
                    disabled={!!it.protegido}
                    title={it.protegido ? "Item protegido" : it.ativo ? "Desativar" : "Ativar"}
                  >
                    {it.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => iniciarEdicao(it)}
                    disabled={!!it.protegido}
                    title={it.protegido ? "Item protegido" : "Editar"}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        disabled={!!it.protegido}
                        title={it.protegido ? "Item protegido" : "Excluir"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir “{it.label}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => remover(it)}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ),
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <input
            type="color"
            value={novaCor}
            onChange={(e) => setNovaCor(e.target.value)}
            className="h-9 w-12 rounded cursor-pointer border bg-transparent"
          />
          <Input
            value={novoLabel}
            onChange={(e) => setNovoLabel(e.target.value)}
            placeholder="Novo item"
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            className="h-9 flex-1"
          />
          <Button onClick={adicionar} className="gap-1">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConfiguracoesDemandasManager() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Gerencie categorias, prioridades e status de demandas. Status essenciais
        (Planejamento, Criar, Aguardando aprovação do cliente, Entregue, Concluído, Atrasado) ficam
        protegidos contra edição/remoção.
      </p>
      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="prioridades">Prioridades</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>
        <TabsContent value="categorias" className="mt-3">
          <Lista tabela="demanda_categorias_custom" titulo="Categorias de demandas" />
        </TabsContent>
        <TabsContent value="prioridades" className="mt-3">
          <Lista tabela="demanda_prioridades_custom" titulo="Prioridades de demandas" />
        </TabsContent>
        <TabsContent value="status" className="mt-3">
          <Lista tabela="demanda_status_custom" titulo="Status de demandas" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
