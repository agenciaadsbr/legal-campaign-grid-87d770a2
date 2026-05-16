import { useState } from "react";
import { useReunioes, useReunioesBootstrap, type Reuniao } from "@/store/reunioes";
import { useCRM } from "@/store/crm";
import { useDelegations, useDelegationsBootstrap } from "@/store/delegations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Calendar, ExternalLink, Pencil, Trash2, Users, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { ReuniaoDialog } from "./ReuniaoDialog";
import { cn } from "@/lib/utils";

export function ReunioesTab({ clienteId }: { clienteId: string }) {
  useReunioesBootstrap();
  const reunioes = useReunioes((s) => s.reunioes).filter((r) => r.cliente_id === clienteId);
  const remove = useReunioes((s) => s.remove);
  const responsaveis = useCRM((s) => s.responsaveis);
  useDelegationsBootstrap();
  const delegations = useDelegations((s) => s.delegations);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Reuniao | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Reuniões</h3>
          <p className="text-xs text-muted-foreground">Centralize transcrições, resumos e contexto de cada reunião com o cliente.</p>
        </div>
        <Button size="sm" onClick={() => { setEdit(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova reunião
        </Button>
      </div>

      {reunioes.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma reunião registrada. Clique em <span className="font-medium">Nova reunião</span> para começar.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {reunioes.map((r) => {
            const resp = responsaveis.find((x) => x.id === r.responsavel_id);
            return (
              <Card key={r.id} className="hover:bg-accent/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold">{r.titulo}</h4>
                        {r.tipo && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r.tipo}</span>
                        )}
                        {delegations.find(d => d.reuniao_id === r.id) && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-primary/30 text-primary">
                            <Users className="h-2.5 w-2.5 mr-1" />
                            {delegations.find(d => d.reuniao_id === r.id)?.status}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.data).toLocaleString("pt-BR")}</span>
                        {resp && <span>· {resp.nome}</span>}
                        {r.link_tldv && (
                          <a href={r.link_tldv} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                            <ExternalLink className="h-3 w-3" /> TLDV
                          </a>
                        )}
                      </div>
                      {(r.resumo_cliente || r.resumo_tarefas) && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {r.resumo_cliente && (
                            <div className="rounded border border-border bg-card p-2">
                              <div className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Resumo cliente</div>
                              <div className="line-clamp-3 whitespace-pre-wrap">{r.resumo_cliente}</div>
                            </div>
                          )}
                          {r.resumo_tarefas && (
                            <div className="rounded border border-border bg-card p-2">
                              <div className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Resumo tarefas</div>
                              <div className="line-clamp-3 whitespace-pre-wrap">{r.resumo_tarefas}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEdit(r); setOpen(true); }} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Excluir esta reunião?")) remove(r.id); }} title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ReuniaoDialog open={open} onOpenChange={setOpen} clienteId={clienteId} reuniao={edit} />
    </div>
  );
}
