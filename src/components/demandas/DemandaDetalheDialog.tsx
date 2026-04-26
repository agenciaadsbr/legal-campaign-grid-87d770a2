import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Demanda, useDemandas } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import { useAuth } from "@/hooks/useAuth";
import {
  STATUS_DEMANDA,
  STATUS_DEMANDA_LABEL,
  PRIORIDADES,
  PRIORIDADE_LABEL,
  STATUS_DEMANDA_COR,
  CATEGORIA_LABEL,
} from "@/lib/demandas-categorias";
import { Trash2 } from "lucide-react";
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

interface Props {
  demanda: Demanda | null;
  onOpenChange: (v: boolean) => void;
}

export function DemandaDetalheDialog({ demanda, onOpenChange }: Props) {
  const { clientes, responsaveis } = useCRM();
  const { user, isAdmin } = useAuth();
  const {
    updateDemanda,
    addComentario,
    deleteDemanda,
    comentarios,
    historico,
    anexos,
  } = useDemandas();

  const [novoComentario, setNovoComentario] = useState("");

  const cliente = demanda && clientes.find((c) => c.id === demanda.cliente_id);
  const meusComentarios = useMemo(
    () => (demanda ? comentarios.filter((c) => c.demanda_id === demanda.id) : []),
    [demanda, comentarios]
  );
  const meuHistorico = useMemo(
    () => (demanda ? historico.filter((h) => h.demanda_id === demanda.id) : []),
    [demanda, historico]
  );
  const meusAnexos = useMemo(
    () => (demanda ? anexos.filter((a) => a.demanda_id === demanda.id) : []),
    [demanda, anexos]
  );

  if (!demanda) return null;

  const enviarComentario = async () => {
    if (!user || !novoComentario.trim()) return;
    await addComentario(demanda.id, user.id, novoComentario.trim());
    setNovoComentario("");
  };

  return (
    <Dialog open={!!demanda} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <Input
                value={demanda.titulo}
                onChange={(e) => updateDemanda(demanda.id, { titulo: e.target.value })}
                className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
              />
              <div className="text-xs text-muted-foreground mt-1">
                {cliente?.nome_cliente} · {CATEGORIA_LABEL[demanda.categoria]}
                {demanda.subtipo && ` · ${demanda.subtipo}`}
              </div>
            </div>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir demanda?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Comentários, anexos e histórico serão removidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await deleteDemanda(demanda.id);
                        onOpenChange(false);
                      }}
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3 text-xs border rounded-md p-3 bg-muted/30">
          <div>
            <Label className="text-[10px] text-muted-foreground">Status</Label>
            <Select
              value={demanda.status}
              onValueChange={(v) => updateDemanda(demanda.id, { status: v as any })}
            >
              <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_DEMANDA.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_DEMANDA_COR[s] }} />
                      {STATUS_DEMANDA_LABEL[s]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Prioridade</Label>
            <Select
              value={demanda.prioridade}
              onValueChange={(v) => updateDemanda(demanda.id, { prioridade: v as any })}
            >
              <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORIDADES.map((p) => (
                  <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Responsável</Label>
            <Select
              value={demanda.responsavel_id ?? ""}
              onValueChange={(v) => updateDemanda(demanda.id, { responsavel_id: v || null })}
            >
              <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {responsaveis.map((r) => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Data limite</Label>
            <Input
              type="datetime-local"
              className="h-8 mt-1"
              value={demanda.data_limite ? demanda.data_limite.slice(0, 16) : ""}
              onChange={(e) =>
                updateDemanda(demanda.id, {
                  data_limite: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </div>
        </div>

        <Tabs defaultValue="atividade" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="atividade">Atividade</TabsTrigger>
            <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="atividade" className="space-y-3">
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={6}
                value={demanda.descricao ?? ""}
                onChange={(e) => updateDemanda(demanda.id, { descricao: e.target.value })}
                placeholder="Detalhes da demanda..."
              />
            </div>
          </TabsContent>

          <TabsContent value="arquivos">
            {meusAnexos.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Sem anexos</div>
            ) : (
              <ul className="space-y-1.5">
                {meusAnexos.map((a) => (
                  <li key={a.id}>
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                      {a.nome}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="comentarios" className="space-y-3">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {meusComentarios.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">Nenhum comentário ainda</div>
              )}
              {meusComentarios.map((c) => (
                <div key={c.id} className="border rounded-md p-2 text-sm">
                  <div className="text-[10px] text-muted-foreground mb-1">
                    {new Date(c.created_at).toLocaleString("pt-BR")}
                  </div>
                  {c.texto}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                rows={2}
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                placeholder="Escreva um comentário..."
              />
              <Button onClick={enviarComentario} disabled={!novoComentario.trim()}>Enviar</Button>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            {meuHistorico.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">Sem histórico</div>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {meuHistorico.map((h) => (
                  <li key={h.id} className="flex items-center justify-between border rounded p-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{h.acao}</Badge>
                      {h.de_status && h.para_status && (
                        <span className="text-muted-foreground">
                          {h.de_status} → {h.para_status}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
