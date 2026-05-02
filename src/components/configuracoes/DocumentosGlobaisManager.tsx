import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import {
  DOC_GLOBAL_CATEGORIAS,
  DocGlobalEscopo,
  DocumentoGlobal,
  useDocumentosGlobais,
  useDocumentosGlobaisBootstrap,
} from "@/store/documentosGlobais";
import { DOC_BLOCO_LABEL, DOC_TIPO_LABEL } from "@/store/documentacao";
import { DocumentoGlobalDialog } from "./DocumentoGlobalDialog";

export function DocumentosGlobaisManager() {
  useDocumentosGlobaisBootstrap();
  const itens = useDocumentosGlobais((s) => s.itens);
  const remove = useDocumentosGlobais((s) => s.remove);
  const duplicate = useDocumentosGlobais((s) => s.duplicate);
  const toggleAtivo = useDocumentosGlobais((s) => s.toggleAtivo);
  const reorder = useDocumentosGlobais((s) => s.reorder);

  const [escopo, setEscopo] = useState<DocGlobalEscopo>("cliente");
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");

  const [dialog, setDialog] = useState<{ open: boolean; item: DocumentoGlobal | null }>({
    open: false,
    item: null,
  });

  const filtrados = useMemo(() => {
    let l = itens.filter((i) => i.escopo === escopo);
    if (filtroCategoria !== "todas") l = l.filter((i) => i.categoria === filtroCategoria);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      l = l.filter(
        (i) =>
          i.titulo.toLowerCase().includes(q) ||
          (i.descricao ?? "").toLowerCase().includes(q) ||
          (i.url ?? "").toLowerCase().includes(q),
      );
    }
    return l.sort((a, b) => a.ordem - b.ordem);
  }, [itens, escopo, busca, filtroCategoria]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentos da empresa</CardTitle>
          <p className="text-xs text-muted-foreground">
            Cadastre documentos padrão uma única vez. Os marcados como "Aplicar automaticamente"
            serão criados na aba Documentação de cada novo cliente.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={escopo} onValueChange={(v) => setEscopo(v as DocGlobalEscopo)}>
            <TabsList>
              <TabsTrigger value="cliente">Documentos padrão para clientes</TabsTrigger>
              <TabsTrigger value="interno">Documentos internos da empresa</TabsTrigger>
            </TabsList>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por título, descrição..."
                  className="pl-7 h-9"
                />
              </div>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {DOC_GLOBAL_CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="ml-auto"
                onClick={() => setDialog({ open: true, item: null })}
              >
                <Plus className="h-4 w-4 mr-1" /> Novo documento
              </Button>
            </div>

            <TabsContent value="cliente" className="mt-4">
              <ListaDocumentos
                itens={filtrados}
                onEditar={(item) => setDialog({ open: true, item })}
                onDuplicar={duplicate}
                onExcluir={remove}
                onToggleAtivo={toggleAtivo}
                onMover={reorder}
                escopo="cliente"
              />
            </TabsContent>
            <TabsContent value="interno" className="mt-4">
              <ListaDocumentos
                itens={filtrados}
                onEditar={(item) => setDialog({ open: true, item })}
                onDuplicar={duplicate}
                onExcluir={remove}
                onToggleAtivo={toggleAtivo}
                onMover={reorder}
                escopo="interno"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <DocumentoGlobalDialog
        open={dialog.open}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))}
        escopoInicial={escopo}
        item={dialog.item}
      />
    </div>
  );
}

function ListaDocumentos({
  itens,
  onEditar,
  onDuplicar,
  onExcluir,
  onToggleAtivo,
  onMover,
  escopo,
}: {
  itens: DocumentoGlobal[];
  onEditar: (item: DocumentoGlobal) => void;
  onDuplicar: (id: string) => void;
  onExcluir: (id: string) => void;
  onToggleAtivo: (id: string) => void;
  onMover: (id: string, dir: "up" | "down") => void;
  escopo: DocGlobalEscopo;
}) {
  if (itens.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhum documento {escopo === "cliente" ? "padrão para clientes" : "interno"} cadastrado.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {itens.map((it, idx) => (
        <Card key={it.id} className="border-border">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-0.5 pt-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={idx === 0}
                  onClick={() => onMover(it.id, "up")}
                  title="Mover para cima"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  disabled={idx === itens.length - 1}
                  onClick={() => onMover(it.id, "down")}
                  title="Mover para baixo"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold truncate">{it.titulo}</div>
                  <Badge variant="outline" className="text-[10px]">{it.categoria}</Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {DOC_BLOCO_LABEL[it.bloco] ?? it.bloco}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {DOC_TIPO_LABEL[it.tipo] ?? it.tipo}
                  </Badge>
                  {escopo === "cliente" && it.aplicar_automatico && (
                    <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30">
                      Aplica automático
                    </Badge>
                  )}
                  {!it.ativo && (
                    <Badge variant="destructive" className="text-[10px]">Inativo</Badge>
                  )}
                  {escopo === "interno" && it.permissao_acesso === "admin" && (
                    <Badge variant="outline" className="text-[10px]">Somente admin</Badge>
                  )}
                </div>
                {it.descricao && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {it.descricao}
                  </div>
                )}
                {it.url && (
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-primary hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate max-w-[420px]">{it.url}</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onToggleAtivo(it.id)}
                  title={it.ativo ? "Desativar" : "Ativar"}
                >
                  {it.ativo ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDuplicar(it.id)}
                  title="Duplicar"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEditar(it)}
                  title="Editar"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Excluir "${it.titulo}"?`)) onExcluir(it.id);
                  }}
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
