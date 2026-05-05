import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ChevronDown,
  KeyRound,
  Link as LinkIcon,
  Video,
  Send,
  Files,
  ShieldCheck,
  ListPlus,
  ClipboardCopy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DOC_GLOBAL_CATEGORIAS,
  DocGlobalBloco,
  DocGlobalEscopo,
  DocumentoGlobal,
  useDocumentosGlobais,
  useDocumentosGlobaisBootstrap,
} from "@/store/documentosGlobais";
import {
  DOC_BLOCO_LABEL,
  DOC_BLOCOS,
  DOC_TIPO_LABEL,
  DocBloco,
  TIPOS_POR_BLOCO,
} from "@/store/documentacao";
import { DocumentoGlobalDialog } from "./DocumentoGlobalDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  parseLoteTexto,
  TITULO_MENSAGEM_PADRAO,
} from "@/lib/documentacaoLote";

const BLOCO_ICON: Record<DocBloco, any> = {
  acessos: KeyRound,
  links: LinkIcon,
  reunioes: Video,
  materiais: Send,
  documentos: Files,
};

// Tipo padrão usado ao criar itens em lote para cada bloco
const TIPO_PADRAO_LOTE: Record<DocBloco, string> = {
  acessos: "outro",
  links: "outro",
  reunioes: "reuniao",
  materiais: "material",
  documentos: "outro",
};

// ----- Helpers de mensagem (compatíveis com DocumentacaoTab) -----
function construirMensagemAcessosGlobal(lista: DocumentoGlobal[]): string {
  if (!lista.length) return "";
  const partes: string[] = ["Segue abaixo as informações de acesso:", ""];
  lista.forEach((it) => {
    partes.push(`🔗 ${it.titulo}`);
    if (it.url) partes.push(it.url);
    if (it.login) partes.push(`Login: ${it.login}`);
    if (it.senha) partes.push(`Senha: ${it.senha}`);
    if (it.descricao) partes.push(it.descricao);
    partes.push("");
  });
  return partes.join("\n").trimEnd();
}

function construirMensagemMateriaisGlobal(lista: DocumentoGlobal[]): string {
  if (!lista.length) return "";
  const partes: string[] = ["Segue abaixo os materiais enviados:", ""];
  lista.forEach((it) => {
    partes.push(`🔗 ${it.titulo}`);
    if (it.url) partes.push(it.url);
    if (it.descricao) partes.push(it.descricao);
    partes.push("");
  });
  return partes.join("\n").trimEnd();
}

function montarTextoItem(item: DocumentoGlobal): string {
  const linhas: string[] = [];
  linhas.push(item.titulo);
  const meta: string[] = [];
  if (item.categoria) meta.push(`Categoria: ${item.categoria}`);
  const tipoLabel = DOC_TIPO_LABEL[item.tipo] ?? item.tipo;
  if (tipoLabel) meta.push(`Tipo: ${tipoLabel}`);
  if (meta.length) linhas.push(meta.join(" | "));
  if (item.descricao) linhas.push(item.descricao);
  if (item.url) linhas.push(`URL: ${item.url}`);
  if (item.login) linhas.push(`Login: ${item.login}`);
  if (item.senha) linhas.push(`Senha: ${item.senha}`);
  return linhas.join("\n");
}

const emptySelecionados = (): Record<DocBloco, Set<string>> => ({
  acessos: new Set(),
  links: new Set(),
  reunioes: new Set(),
  materiais: new Set(),
  documentos: new Set(),
});

export function DocumentosGlobaisManager() {
  useDocumentosGlobaisBootstrap();
  const { isAdmin } = useAuth();
  const itens = useDocumentosGlobais((s) => s.itens);
  const remove = useDocumentosGlobais((s) => s.remove);
  const duplicate = useDocumentosGlobais((s) => s.duplicate);
  const toggleAtivo = useDocumentosGlobais((s) => s.toggleAtivo);
  const reorder = useDocumentosGlobais((s) => s.reorder);
  const create = useDocumentosGlobais((s) => s.create);

  const [escopo, setEscopo] = useState<DocGlobalEscopo>("cliente");

  // Garante fallback se um não-admin entrar com escopo "interno"
  useEffect(() => {
    if (!isAdmin && escopo === "interno") setEscopo("cliente");
  }, [isAdmin, escopo]);

  const [busca, setBusca] = useState("");
  const [filtroBloco, setFiltroBloco] = useState<DocBloco | "todos">("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [openBlocos, setOpenBlocos] = useState<Record<DocBloco, boolean>>({
    acessos: true,
    links: true,
    reunioes: true,
    materiais: true,
    documentos: true,
  });

  const [seletorBlocoOpen, setSeletorBlocoOpen] = useState(false);
  const [dialog, setDialog] = useState<{
    open: boolean;
    item: DocumentoGlobal | null;
    blocoInicial?: DocGlobalBloco;
  }>({ open: false, item: null });

  // Adicionar em lote
  const [loteState, setLoteState] = useState<{ open: boolean; bloco: DocBloco | null }>({
    open: false,
    bloco: null,
  });
  const [loteTexto, setLoteTexto] = useState("");
  const [loteSalvando, setLoteSalvando] = useState(false);

  // Seleção múltipla por bloco
  const [selecionados, setSelecionados] = useState<Record<DocBloco, Set<string>>>(
    emptySelecionados,
  );

  // Reset de seleção ao trocar escopo/filtros
  useEffect(() => {
    setSelecionados(emptySelecionados());
  }, [escopo, busca, filtroBloco, filtroCategoria]);

  const filtrados = useMemo(() => {
    let l = itens.filter((i) => i.escopo === escopo);
    if (filtroBloco !== "todos") l = l.filter((i) => (i.bloco as DocBloco) === filtroBloco);
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
  }, [itens, escopo, busca, filtroBloco, filtroCategoria]);

  const porBloco = useMemo(() => {
    const map = new Map<DocBloco, DocumentoGlobal[]>();
    DOC_BLOCOS.forEach((b) => map.set(b, []));
    filtrados.forEach((i) => {
      const b = (i.bloco as DocBloco) ?? "documentos";
      map.set(b, [...(map.get(b) ?? []), i]);
    });
    return map;
  }, [filtrados]);

  // ----- Handlers de seleção múltipla -----
  const toggleItem = (bloco: DocBloco, id: string) => {
    setSelecionados((s) => {
      const next = new Set(s[bloco]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, [bloco]: next };
    });
  };

  const toggleTodos = (bloco: DocBloco, ids: string[]) => {
    setSelecionados((s) => {
      const atual = s[bloco];
      const todosMarcados = ids.length > 0 && ids.every((id) => atual.has(id));
      const next = new Set<string>(atual);
      if (todosMarcados) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return { ...s, [bloco]: next };
    });
  };

  const limparSelecao = (bloco: DocBloco) => {
    setSelecionados((s) => ({ ...s, [bloco]: new Set() }));
  };

  const excluirSelecionados = async (bloco: DocBloco) => {
    const ids = Array.from(selecionados[bloco]);
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} item(ns) selecionado(s)?`)) return;
    for (const id of ids) {
      await remove(id);
    }
    limparSelecao(bloco);
    toast.success(`${ids.length} item(ns) excluído(s)`);
  };

  // ----- Adicionar em lote -----
  const abrirLote = (bloco: DocBloco) => {
    setLoteTexto("");
    setLoteState({ open: true, bloco });
  };

  const salvarLote = async () => {
    if (!loteState.bloco) return;
    if (loteSalvando) return; // guarda contra cliques duplicados
    // 1) Quebra em linhas, normaliza e remove duplicatas dentro do próprio lote
    const linhasUnicas = Array.from(
      new Set(
        loteTexto
          .split(/\r?\n/)
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );
    if (linhasUnicas.length === 0) {
      toast.error("Informe ao menos um título");
      return;
    }
    const bloco = loteState.bloco;
    const tipo = TIPO_PADRAO_LOTE[bloco];

    // 2) Remove títulos que já existem no mesmo escopo+bloco (case-insensitive)
    const jaExistentes = new Set(
      itens
        .filter((i) => i.escopo === escopo && (i.bloco as DocBloco) === bloco)
        .map((i) => i.titulo.trim().toLowerCase()),
    );
    const aCriar = linhasUnicas.filter(
      (t) => !jaExistentes.has(t.toLowerCase()),
    );
    const ignorados = linhasUnicas.length - aCriar.length;

    if (aCriar.length === 0) {
      toast.info("Todos os títulos informados já existem neste bloco");
      setLoteState({ open: false, bloco: null });
      setLoteTexto("");
      return;
    }

    setLoteSalvando(true);
    // 3) Cria sequencialmente (await) para evitar corrida com o realtime
    let criados = 0;
    for (const titulo of aCriar) {
      const id = await create({
        escopo,
        bloco: bloco as DocGlobalBloco,
        tipo,
        titulo,
        categoria: "Outros",
        aplicar_automatico: escopo === "cliente",
        permissao_acesso: escopo === "interno" ? "admin" : "todos",
        ativo: true,
      });
      if (id) criados += 1;
    }
    setLoteSalvando(false);
    setLoteState({ open: false, bloco: null });
    setLoteTexto("");
    if (criados > 0) {
      toast.success(
        `${criados} item(ns) adicionado(s)` +
          (ignorados > 0 ? ` · ${ignorados} ignorado(s) (já existiam)` : ""),
      );
    }
  };

  // ----- Copiar mensagem do bloco -----
  const copiarMensagemBloco = (bloco: DocBloco, lista: DocumentoGlobal[]) => {
    if (lista.length === 0) return;
    const itemMsg = lista.find((i) => i.tipo === "mensagem");
    const msg = itemMsg?.descricao
      ? itemMsg.descricao
      : bloco === "acessos"
        ? construirMensagemAcessosGlobal(lista)
        : construirMensagemMateriaisGlobal(lista);
    navigator.clipboard.writeText(msg);
    toast.success("Mensagem copiada");
  };

  // ----- Copiar tudo do item -----
  const copiarTudoItem = (item: DocumentoGlobal) => {
    navigator.clipboard.writeText(montarTextoItem(item));
    toast.success("Item copiado");
  };

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
              {isAdmin && (
                <TabsTrigger value="interno" className="gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Documentos internos da empresa
                </TabsTrigger>
              )}
            </TabsList>

            {/* Toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por título, descrição, link..."
                  className="pl-7 h-9"
                />
              </div>
              <Select value={filtroBloco} onValueChange={(v) => setFiltroBloco(v as any)}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os blocos</SelectItem>
                  {DOC_BLOCOS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {DOC_BLOCO_LABEL[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                onClick={() => setSeletorBlocoOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>

            {/* Aviso do escopo */}
            <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {escopo === "cliente" ? (
                <>
                  <strong className="text-foreground">Documentos padrão para clientes:</strong>{" "}
                  itens marcados como "Aplicar automaticamente" entram na aba Documentação
                  de novos clientes. Use o botão "Aplicar padrão" dentro de cada cliente para
                  trazer estes documentos para clientes existentes.
                </>
              ) : (
                <>
                  <ShieldCheck className="inline h-3.5 w-3.5 mr-1 text-primary" />
                  <strong className="text-foreground">Documentos internos da empresa:</strong>{" "}
                  visíveis apenas para administradores. Não são propagados para clientes.
                </>
              )}
            </div>

            <TabsContent value={escopo} className="mt-4 space-y-3">
              {filtrados.length === 0 &&
                (busca.trim() !== "" ||
                  filtroBloco !== "todos" ||
                  filtroCategoria !== "todas") && (
                  <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                    Nenhum documento {escopo === "cliente" ? "padrão para clientes" : "interno"}{" "}
                    encontrado com os filtros atuais.
                  </div>
                )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-start">
                {DOC_BLOCOS.map((bloco) => {
                  const lista = porBloco.get(bloco) ?? [];
                  const Icone = BLOCO_ICON[bloco];
                  const ids = lista.map((i) => i.id);
                  const sel = selecionados[bloco];
                  const qtdSel = ids.filter((id) => sel.has(id)).length;
                  const todosMarcados = qtdSel > 0 && qtdSel === ids.length;
                  return (
                    <Collapsible
                      key={bloco}
                      open={openBlocos[bloco]}
                      onOpenChange={(v) =>
                        setOpenBlocos((s) => ({ ...s, [bloco]: v }))
                      }
                    >
                      <Card>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 p-3 text-left hover:bg-accent/30"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                !openBlocos[bloco] && "-rotate-90",
                              )}
                            />
                            <Icone className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold flex-1">
                              {DOC_BLOCO_LABEL[bloco]}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {lista.length}
                            </Badge>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent className="p-3 pt-0 space-y-2">
                            <div className="flex flex-wrap gap-1 pb-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() =>
                                  setDialog({
                                    open: true,
                                    item: null,
                                    blocoInicial: bloco as DocGlobalBloco,
                                  })
                                }
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => abrirLote(bloco)}
                              >
                                <ListPlus className="h-3.5 w-3.5 mr-1" /> Adicionar em lote
                              </Button>
                              {(bloco === "acessos" || bloco === "materiais") && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  disabled={lista.length === 0}
                                  onClick={() => copiarMensagemBloco(bloco, lista)}
                                >
                                  <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Copiar mensagem
                                </Button>
                              )}
                            </div>

                            {lista.length > 0 && (
                              <div className="flex items-center gap-2 px-1 pb-1 border-b border-border/60">
                                <Checkbox
                                  checked={
                                    todosMarcados
                                      ? true
                                      : qtdSel > 0
                                        ? "indeterminate"
                                        : false
                                  }
                                  onCheckedChange={() => toggleTodos(bloco, ids)}
                                  aria-label="Selecionar todos"
                                />
                                <span className="text-[11px] text-muted-foreground">
                                  {qtdSel > 0
                                    ? `${qtdSel} selecionado(s)`
                                    : "Selecionar todos"}
                                </span>
                                {qtdSel > 0 && (
                                  <div className="ml-auto flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => limparSelecao(bloco)}
                                    >
                                      Limpar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => excluirSelecionados(bloco)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir ({qtdSel})
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}

                            {lista.length === 0 ? (
                              <div className="text-xs text-muted-foreground italic px-2 py-3">
                                Nenhum item neste bloco.
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  "grid grid-cols-1 gap-2 max-h-[420px] overflow-y-auto pr-1",
                                  "[&::-webkit-scrollbar]:w-1.5",
                                  "[&::-webkit-scrollbar-track]:bg-transparent",
                                  "[&::-webkit-scrollbar-thumb]:bg-border",
                                  "[&::-webkit-scrollbar-thumb]:rounded-full",
                                  "hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
                                )}
                              >
                                {lista.map((it, idx) => (
                                  <ItemGlobalCard
                                    key={it.id}
                                    item={it}
                                    isFirst={idx === 0}
                                    isLast={idx === lista.length - 1}
                                    escopo={escopo}
                                    selecionado={sel.has(it.id)}
                                    onToggleSelecionado={() => toggleItem(bloco, it.id)}
                                    onEditar={() => setDialog({ open: true, item: it })}
                                    onDuplicar={() => duplicate(it.id)}
                                    onCopiarTudo={() => copiarTudoItem(it)}
                                    onExcluir={() => {
                                      if (confirm(`Excluir "${it.titulo}"?`)) remove(it.id);
                                    }}
                                    onToggleAtivo={() => toggleAtivo(it.id)}
                                    onMover={(dir) => reorder(it.id, dir)}
                                  />
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Seletor de bloco para "+ Adicionar" no header */}
      <Dialog open={seletorBlocoOpen} onOpenChange={setSeletorBlocoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar a qual bloco?</DialogTitle>
            <DialogDescription>
              Escolha o bloco onde o documento deve ser cadastrado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {DOC_BLOCOS.map((b) => {
              const Icone = BLOCO_ICON[b];
              return (
                <Button
                  key={b}
                  variant="outline"
                  className="h-auto py-3 justify-start"
                  onClick={() => {
                    setSeletorBlocoOpen(false);
                    setDialog({
                      open: true,
                      item: null,
                      blocoInicial: b as DocGlobalBloco,
                    });
                  }}
                >
                  <Icone className="h-4 w-4 mr-2 text-primary" />
                  <span className="text-xs">{DOC_BLOCO_LABEL[b]}</span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo: Adicionar em lote */}
      <Dialog
        open={loteState.open}
        onOpenChange={(v) => setLoteState((s) => ({ ...s, open: v }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Adicionar em lote — {loteState.bloco ? DOC_BLOCO_LABEL[loteState.bloco] : ""}
            </DialogTitle>
            <DialogDescription>
              Cole uma lista — um título por linha. Cada linha vira um documento neste bloco.
              Você pode editar os detalhes depois clicando em cada item.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={loteTexto}
            onChange={(e) => setLoteTexto(e.target.value)}
            placeholder={"Ex.:\nGmail\nGoogle Ads\nMeta Business"}
            rows={10}
            className="text-sm"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setLoteState({ open: false, bloco: null })}
              disabled={loteSalvando}
            >
              Cancelar
            </Button>
            <Button onClick={salvarLote} disabled={loteSalvando}>
              {loteSalvando ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentoGlobalDialog
        open={dialog.open}
        onOpenChange={(v) => setDialog((s) => ({ ...s, open: v }))}
        escopoInicial={escopo}
        blocoInicial={dialog.blocoInicial}
        item={dialog.item}
        isAdmin={isAdmin}
      />
    </div>
  );
}

// ============================================================
// ITEM GLOBAL CARD
// ============================================================
function ItemGlobalCard({
  item,
  isFirst,
  isLast,
  escopo,
  selecionado,
  onToggleSelecionado,
  onEditar,
  onDuplicar,
  onCopiarTudo,
  onExcluir,
  onToggleAtivo,
  onMover,
}: {
  item: DocumentoGlobal;
  isFirst: boolean;
  isLast: boolean;
  escopo: DocGlobalEscopo;
  selecionado: boolean;
  onToggleSelecionado: () => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onCopiarTudo: () => void;
  onExcluir: () => void;
  onToggleAtivo: () => void;
  onMover: (dir: "up" | "down") => void;
}) {
  return (
    <Card
      className={cn(
        "border-border",
        !item.ativo && "opacity-60",
        selecionado && "ring-1 ring-primary/40 border-primary/40",
      )}
    >
      <CardContent className="p-2.5">
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <Checkbox
              checked={selecionado}
              onCheckedChange={onToggleSelecionado}
              aria-label="Selecionar item"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={isFirst}
              onClick={() => onMover("up")}
              title="Mover para cima"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={isLast}
              onClick={() => onMover("down")}
              title="Mover para baixo"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{item.titulo}</div>
            <div className="flex flex-wrap items-center gap-1 mt-1">
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                {item.categoria}
              </Badge>
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                {DOC_TIPO_LABEL[item.tipo] ?? item.tipo}
              </Badge>
              {escopo === "cliente" && item.aplicar_automatico && (
                <Badge className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30 hover:bg-primary/10">
                  Auto
                </Badge>
              )}
              {escopo === "interno" && item.permissao_acesso === "admin" && (
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  Só admin
                </Badge>
              )}
              {!item.ativo && (
                <Badge variant="destructive" className="text-[9px] px-1 py-0">
                  Inativo
                </Badge>
              )}
            </div>
            {item.descricao && (
              <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                {item.descricao}
              </div>
            )}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-primary hover:underline mt-1 inline-flex items-center gap-1 max-w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{item.url}</span>
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-0.5 mt-1.5 pt-1.5 border-t border-border/60">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px]"
            onClick={onCopiarTudo}
            title="Copiar tudo"
          >
            <ClipboardCopy className="h-3 w-3 mr-1" /> Copiar tudo
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleAtivo}
            title={item.ativo ? "Desativar" : "Ativar"}
          >
            {item.ativo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDuplicar}
            title="Duplicar"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onEditar}
            title="Editar"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={onExcluir}
            title="Excluir"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
