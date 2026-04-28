import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DOC_TIPO_LABEL,
  DocTipo,
  DocumentacaoItem,
  useDocumentacao,
} from "@/store/documentacao";
import { DocumentacaoItemDialog } from "./DocumentacaoItemDialog";
import {
  Plus,
  Copy,
  ExternalLink,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  clienteId: string;
  /** Controle externo do dialog (usado pelo botão "Adicionar Tarefa" categoria=Doc). */
  novoOpenExterno?: boolean;
  onNovoOpenChangeExterno?: (v: boolean) => void;
}

export function DocumentacaoTab({
  clienteId,
  novoOpenExterno,
  onNovoOpenChangeExterno,
}: Props) {
  const itens = useDocumentacao((s) => s.itens.filter((i) => i.cliente_id === clienteId));
  const remove = useDocumentacao((s) => s.remove);
  const [novoInternoOpen, setNovoInternoOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentacaoItem | null>(null);
  const [revelarSenha, setRevelarSenha] = useState<Record<string, boolean>>({});

  const novoOpen = novoOpenExterno ?? novoInternoOpen;
  const setNovoOpen = (v: boolean) => {
    if (onNovoOpenChangeExterno) onNovoOpenChangeExterno(v);
    else setNovoInternoOpen(v);
  };

  const grupos = useMemo(() => {
    const map = new Map<DocTipo, DocumentacaoItem[]>();
    itens.forEach((i) => {
      const k = i.tipo as DocTipo;
      const arr = map.get(k) ?? [];
      arr.push(i);
      map.set(k, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) =>
      DOC_TIPO_LABEL[a].localeCompare(DOC_TIPO_LABEL[b]),
    );
  }, [itens]);

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copiado");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {itens.length === 0
            ? "Nenhum item ainda. Adicione links, acessos e observações importantes."
            : `${itens.length} ${itens.length === 1 ? "item" : "itens"} cadastrados`}
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setNovoOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar item
        </Button>
      </div>

      {itens.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Centralize aqui Drive, sites, redes sociais, acessos do Meta, Google Ads,
            WhatsApp e qualquer credencial importante do cliente.
          </CardContent>
        </Card>
      ) : (
        grupos.map(([tipo, lista]) => (
          <section key={tipo} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {DOC_TIPO_LABEL[tipo]}
              </h3>
              <Badge variant="outline" className="text-[10px]">{lista.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lista.map((it) => (
                <Card key={it.id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{it.titulo}</div>
                        {it.url && (
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-primary hover:underline break-all flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{it.url}</span>
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {it.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => copy(it.url!)}
                            title="Copiar link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => { setEditing(it); setNovoOpen(true); }}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Excluir "${it.titulo}"?`)) remove(it.id);
                          }}
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {(it.login || it.senha) && (
                      <div className="text-[11px] text-muted-foreground space-y-0.5 border-t pt-1.5">
                        {it.login && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">Login:</span>
                            <span className="truncate">{it.login}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 ml-auto"
                              onClick={() => copy(it.login!)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {it.senha && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">Senha:</span>
                            <span className="truncate font-mono">
                              {revelarSenha[it.id] ? it.senha : "••••••••"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 ml-auto"
                              onClick={() =>
                                setRevelarSenha((s) => ({ ...s, [it.id]: !s[it.id] }))
                              }
                            >
                              {revelarSenha[it.id] ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => copy(it.senha!)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    {it.observacao && (
                      <div className="text-[11px] text-muted-foreground border-t pt-1.5 whitespace-pre-wrap">
                        {it.observacao}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))
      )}

      <DocumentacaoItemDialog
        open={novoOpen}
        onOpenChange={(v) => { setNovoOpen(v); if (!v) setEditing(null); }}
        clienteId={clienteId}
        item={editing}
      />
    </div>
  );
}
