import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  ExternalLink,
  Search,
  ListPlus,
  FileDown,
  FileText,
  Image as ImageIcon,
  Save,
  X,
  KeyRound,
  Link as LinkIcon,
  Video,
  Send,
  Files,
  StickyNote,
  ClipboardCopy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DOC_BLOCO_LABEL,
  DOC_BLOCOS,
  DocBloco,
  DocumentacaoItem,
  TIPOS_POR_BLOCO,
  useDocumentacao,
} from "@/store/documentacao";
import {
  downloadPdfFromText,
  downloadPngFromNode,
  downloadTxt,
  safeFilename,
} from "./exportUtils";
import { useCRM } from "@/store/crm";

const BLOCO_ICON: Record<DocBloco, any> = {
  acessos: KeyRound,
  links: LinkIcon,
  reunioes: Video,
  materiais: Send,
  documentos: Files,
  observacoes: StickyNote,
};

interface Props {
  clienteId: string;
  /** Estado externo do "+ adicionar" disparado pelo header */
  novoOpenExterno?: boolean;
  onNovoOpenChangeExterno?: (v: boolean) => void;
}

export function DocumentacaoTab({
  clienteId,
  novoOpenExterno,
  onNovoOpenChangeExterno,
}: Props) {
  const todosItens = useDocumentacao((s) => s.itens);
  const { clientes } = useCRM();
  const cliente = clientes.find((c) => c.id === clienteId);

  const itens = useMemo(
    () => todosItens.filter((i) => i.cliente_id === clienteId),
    [todosItens, clienteId],
  );

  const [busca, setBusca] = useState("");
  const [filtroBloco, setFiltroBloco] = useState<DocBloco | "todos">("todos");
  const [openBlocos, setOpenBlocos] = useState<Record<DocBloco, boolean>>({
    acessos: true,
    links: true,
    reunioes: true,
    materiais: true,
    documentos: true,
    observacoes: true,
  });
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    bloco: DocBloco;
    item?: DocumentacaoItem | null;
  }>({ open: false, bloco: "acessos", item: null });
  const [loteState, setLoteState] = useState<{ open: boolean; bloco: DocBloco }>({
    open: false,
    bloco: "acessos",
  });

  // Quando dispara externamente, abre o seletor de bloco
  const [seletorBlocoOpen, setSeletorBlocoOpen] = useState(false);
  useEffect(() => {
    if (novoOpenExterno) {
      setSeletorBlocoOpen(true);
      onNovoOpenChangeExterno?.(false);
    }
  }, [novoOpenExterno, onNovoOpenChangeExterno]);

  const filtrados = useMemo(() => {
    let l = itens;
    if (filtroBloco !== "todos") l = l.filter((i) => (i.bloco as DocBloco) === filtroBloco);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      l = l.filter(
        (i) =>
          i.titulo.toLowerCase().includes(q) ||
          (i.url ?? "").toLowerCase().includes(q) ||
          (i.login ?? "").toLowerCase().includes(q) ||
          (i.observacao ?? "").toLowerCase().includes(q),
      );
    }
    return l;
  }, [itens, busca, filtroBloco]);

  const porBloco = useMemo(() => {
    const map = new Map<DocBloco, DocumentacaoItem[]>();
    DOC_BLOCOS.forEach((b) => map.set(b, []));
    filtrados.forEach((i) => {
      const b = (i.bloco as DocBloco) ?? "documentos";
      map.set(b, [...(map.get(b) ?? []), i]);
    });
    return map;
  }, [filtrados]);

  function exportarTxt() {
    const txt = construirExportacaoTexto(cliente?.nome_cliente ?? "Cliente", itens);
    downloadTxt(`documentacao_${safeFilename(cliente?.nome_cliente ?? "cliente")}`, txt);
  }
  function exportarPdf() {
    const txt = construirExportacaoTexto(cliente?.nome_cliente ?? "Cliente", itens);
    downloadPdfFromText(
      `documentacao_${safeFilename(cliente?.nome_cliente ?? "cliente")}.pdf`,
      `Documentação e Acessos — ${cliente?.nome_cliente ?? "Cliente"}`,
      txt,
    );
  }
  async function exportarPng() {
    const node = document.getElementById("documentacao-export-root");
    if (!node) return;
    try {
      await downloadPngFromNode(
        `documentacao_${safeFilename(cliente?.nome_cliente ?? "cliente")}.png`,
        node,
      );
    } catch (e: any) {
      toast.error("Erro ao gerar imagem", { description: e?.message });
    }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, login, link..."
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
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={exportarTxt}>
            <FileText className="h-4 w-4 mr-1" /> TXT
          </Button>
          <Button
            size="sm"
            onClick={() => setSeletorBlocoOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Conteúdo (também usado para exportar PNG) */}
      <div
        id="documentacao-export-root"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start"
      >
        <div className="hidden print:block text-lg font-semibold col-span-full">
          Documentação e Acessos — {cliente?.nome_cliente}
        </div>
        {DOC_BLOCOS.map((bloco) => {
          const lista = porBloco.get(bloco) ?? [];
          const Icone = BLOCO_ICON[bloco];
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
                        onClick={() => setDialogState({ open: true, bloco, item: null })}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
                      </Button>
                      {bloco !== "observacoes" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setLoteState({ open: true, bloco })}
                        >
                          <ListPlus className="h-3.5 w-3.5 mr-1" /> Adicionar em lote
                        </Button>
                      )}
                      {(bloco === "acessos" || bloco === "materiais") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          disabled={lista.length === 0}
                          onClick={() => {
                            const itemMsg = lista.find((i) => i.tipo === "mensagem");
                            const msg = itemMsg?.observacao
                              ? itemMsg.observacao
                              : bloco === "acessos"
                                ? construirMensagemAcessos(lista)
                                : construirMensagemMateriais(lista);
                            navigator.clipboard.writeText(msg);
                            toast.success("Mensagem copiada");
                          }}
                        >
                          <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Copiar mensagem
                        </Button>
                      )}
                    </div>
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
                        {lista.map((it) =>
                          (bloco === "acessos" || bloco === "materiais") && it.tipo === "mensagem" ? (
                            <MensagemAcessosCard
                              key={it.id}
                              item={it}
                              onEdit={() =>
                                setDialogState({ open: true, bloco, item: it })
                              }
                            />
                          ) : (
                            <ItemCard
                              key={it.id}
                              item={it}
                              onEdit={() =>
                                setDialogState({ open: true, bloco, item: it })
                              }
                            />
                          ),
                        )}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Seletor de bloco quando "Adicionar" no header */}
      <Dialog open={seletorBlocoOpen} onOpenChange={setSeletorBlocoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar a qual bloco?</DialogTitle>
            <DialogDescription>
              Escolha o bloco onde o item deve ser cadastrado.
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
                    setDialogState({ open: true, bloco: b, item: null });
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

      <DocumentacaoItemDialog
        open={dialogState.open}
        onOpenChange={(v) =>
          setDialogState((s) => ({ ...s, open: v, item: v ? s.item : null }))
        }
        clienteId={clienteId}
        bloco={dialogState.bloco}
        item={dialogState.item}
      />
      <DocumentacaoLoteDialog
        open={loteState.open}
        onOpenChange={(v) => setLoteState((s) => ({ ...s, open: v }))}
        clienteId={clienteId}
        bloco={loteState.bloco}
      />
    </div>
  );
}

// ============================================================
// ITEM CARD
// ============================================================
function ItemCard({
  item,
  onEdit,
}: {
  item: DocumentacaoItem;
  onEdit: () => void;
}) {
  const remove = useDocumentacao((s) => s.remove);
  const [showSenha, setShowSenha] = useState(false);

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copiado`);
  };

  const tipoLabel =
    TIPOS_POR_BLOCO[item.bloco as DocBloco]?.find((t) => t.value === item.tipo)?.label ??
    item.tipo;

  return (
    <Card className="border-border">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm font-medium truncate">{item.titulo}</div>
              <Badge variant="outline" className="text-[10px]">{tipoLabel}</Badge>
              {item.formato && (
                <Badge variant="secondary" className="text-[10px]">{item.formato}</Badge>
              )}
            </div>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline break-all flex items-center gap-1 mt-1"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.url}</span>
              </a>
            )}
            {item.data_evento && (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Data: {new Date(item.data_evento).toLocaleDateString("pt-BR")}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {item.url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => copy(item.url!, "Link")}
                title="Copiar link"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Excluir "${item.titulo}"?`)) remove(item.id);
              }}
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {(item.login || item.senha) && (
          <div className="text-[11px] text-muted-foreground space-y-0.5 border-t border-border pt-1.5">
            {item.login && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Login:</span>
                <span className="truncate">{item.login}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-auto"
                  onClick={() => copy(item.login!, "Login")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            {item.senha && (
              <div className="flex items-center gap-1.5">
                <span className="font-medium">Senha:</span>
                <span className="truncate font-mono">
                  {showSenha ? item.senha : "••••••••"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-auto"
                  onClick={() => setShowSenha((s) => !s)}
                >
                  {showSenha ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => copy(item.senha!, "Senha")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {item.observacao && (
          <div className="text-[11px] text-muted-foreground border-t border-border pt-1.5 whitespace-pre-wrap">
            {item.observacao}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// DIALOG INDIVIDUAL
// ============================================================
function DocumentacaoItemDialog({
  open,
  onOpenChange,
  clienteId,
  bloco,
  item,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
  bloco: DocBloco;
  item?: DocumentacaoItem | null;
}) {
  const create = useDocumentacao((s) => s.create);
  const update = useDocumentacao((s) => s.update);

  const tiposDisponiveis = TIPOS_POR_BLOCO[bloco] ?? [];
  const [tipo, setTipo] = useState<string>(tiposDisponiveis[0]?.value ?? "outro");
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [observacao, setObservacao] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [formato, setFormato] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const itemBloco = (item?.bloco as DocBloco) ?? bloco;
      const tiposBloco = TIPOS_POR_BLOCO[itemBloco] ?? [];
      setTipo(item?.tipo ?? tiposBloco[0]?.value ?? "outro");
      setTitulo(item?.titulo ?? "");
      setUrl(item?.url ?? "");
      setLogin(item?.login ?? "");
      setSenha(item?.senha ?? "");
      setObservacao(item?.observacao ?? "");
      setDataEvento(item?.data_evento ?? "");
      setFormato(item?.formato ?? "");
    }
  }, [open, item, bloco]);

  const submit = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    const payload = {
      bloco,
      tipo,
      titulo: titulo.trim(),
      url: url || null,
      login: login || null,
      senha: senha || null,
      observacao: observacao || null,
      data_evento: dataEvento || null,
      enviado_por: null,
      formato: formato || null,
    };
    if (item) {
      await update(item.id, payload as any);
    } else {
      await create({ cliente_id: clienteId, ...payload } as any);
    }
    setSaving(false);
    onOpenChange(false);
  };

  const showLoginSenha = bloco === "acessos";
  const showFormato = bloco === "materiais";
  const showData = bloco === "reunioes" || bloco === "materiais";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {item ? "Editar item" : `Adicionar em ${DOC_BLOCO_LABEL[bloco]}`}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposDisponiveis.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>URL / Link</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          {showLoginSenha && (
            <>
              <div>
                <Label>Login / E-mail</Label>
                <Input value={login} onChange={(e) => setLogin(e.target.value)} />
              </div>
              <div>
                <Label>Senha</Label>
                <Input value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
            </>
          )}
          {showFormato && (
            <div>
              <Label>Formato</Label>
              <Input
                value={formato}
                onChange={(e) => setFormato(e.target.value)}
                placeholder="PDF / Vídeo / Documento"
              />
            </div>
          )}
          {showData && (
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={dataEvento}
                onChange={(e) => setDataEvento(e.target.value)}
              />
            </div>
          )}
          <div className="col-span-2">
            <Label>Observação</Label>
            <Textarea
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !titulo.trim()}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Salvando..." : item ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// DIALOG LOTE
// ============================================================
function DocumentacaoLoteDialog({
  open,
  onOpenChange,
  clienteId,
  bloco,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clienteId: string;
  bloco: DocBloco;
}) {
  const createBatch = useDocumentacao((s) => s.createBatch);
  const create = useDocumentacao((s) => s.create);
  const tiposDisponiveis = TIPOS_POR_BLOCO[bloco] ?? [];
  const isMensagemUnica = bloco === "acessos" || bloco === "materiais";
  const [tipo, setTipo] = useState<string>(tiposDisponiveis[0]?.value ?? "outro");
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (open) {
      setTipo(isMensagemUnica ? "mensagem" : tiposDisponiveis[0]?.value ?? "outro");
      setTexto("");
    }
  }, [open, bloco]);

  const itensDetectados = useMemo(
    () => (isMensagemUnica ? [] : parseLoteTexto(texto)),
    [texto, isMensagemUnica],
  );

  const submit = async () => {
    if (isMensagemUnica) {
      const conteudo = texto.trim();
      if (!conteudo) {
        toast.error("Cole o conteúdo da mensagem antes de salvar.");
        return;
      }
      await create({
        cliente_id: clienteId,
        bloco,
        tipo: "mensagem",
        titulo: bloco === "materiais" ? "Materiais enviados ao cliente" : "Mensagem de acessos",
        url: null,
        login: null,
        senha: null,
        observacao: conteudo,
        data_evento: null,
        enviado_por: null,
        formato: null,
      } as any);
      onOpenChange(false);
      return;
    }

    if (itensDetectados.length === 0) {
      toast.error("Nenhum item detectado", {
        description: "Cole o texto com URLs e/ou Login/Senha, ou use o formato com |.",
      });
      return;
    }
    const items = itensDetectados.map((p) => ({
      cliente_id: clienteId,
      bloco,
      tipo,
      titulo: p.titulo,
      url: p.url,
      login: p.login,
      senha: p.senha,
      observacao: p.observacao,
      data_evento: null,
      enviado_por: null,
      formato: null,
    }));
    await createBatch(items as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar em lote — {DOC_BLOCO_LABEL[bloco]}</DialogTitle>
          <DialogDescription>
            {isMensagemUnica ? (
              <>
                Cole abaixo a mensagem completa (estilo WhatsApp) com todos os links,
                logins e senhas. O conteúdo será salvo como um único item formatado,
                preservando exatamente como você colou.
              </>
            ) : (
              <>
                Cole o texto livre (estilo WhatsApp/e-mail) — o sistema detecta
                automaticamente cada item, URL, Login e Senha. Itens são separados por
                linha em branco.
                <br />
                Alternativa: uma linha por item com{" "}
                <code>título | url | login | senha | observação</code>.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!isMensagemUnica && (
            <div>
              <Label>Tipo (aplicado a todos)</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposDisponiveis
                    .filter((t) => t.value !== "mensagem")
                    .map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>{isMensagemUnica ? "Mensagem completa" : "Itens"}</Label>
              {!isMensagemUnica && (
                <Badge variant="outline" className="text-[10px]">
                  {itensDetectados.length} item(ns) detectado(s)
                </Badge>
              )}
            </div>
            <Textarea
              rows={14}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={
                isMensagemUnica
                  ? "Cole aqui a mensagem completa, ex:\n\nBoa tarde Drs.\n\nSegue abaixo as informações de acesso:\n\n🔗 Link de acesso ao painel:\nhttps://dashboard.adsbr.com.br/\nLogin: licencaadsbr104@gmail.com\nSenha: 102030"
                  : "Cole aqui, ex:\n\n🔗 Link de acesso ao painel:\nhttps://dashboard.adsbr.com.br/\nLogin: licencaadsbr104@gmail.com\nSenha: 102030\n\n🔗 Link do vídeo demonstrativo:\nhttps://www.loom.com/share/..."
              }
              className="font-mono text-xs whitespace-pre-wrap"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={isMensagemUnica ? !texto.trim() : itensDetectados.length === 0}
          >
            {isMensagemUnica
              ? "Salvar mensagem"
              : `Adicionar todos (${itensDetectados.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// PARSER DE LOTE (formato livre + formato com |)
// ============================================================
type LoteItem = {
  titulo: string;
  url: string | null;
  login: string | null;
  senha: string | null;
  observacao: string | null;
};

function parseLoteTexto(texto: string): LoteItem[] {
  const txt = (texto ?? "").trim();
  if (!txt) return [];

  const linhasNaoVazias = txt.split("\n").filter((l) => l.trim());

  // Formato simples (uma linha por item com |)
  const usaPipe = linhasNaoVazias.some((l) => l.includes("|"));
  if (usaPipe) {
    return linhasNaoVazias
      .map((l) => l.trim())
      .filter(Boolean)
      .map((linha) => {
        const partes = linha.split("|").map((p) => p.trim());
        return {
          titulo: partes[0] || linha,
          url: partes[1] || null,
          login: partes[2] || null,
          senha: partes[3] || null,
          observacao: partes[4] || null,
        };
      });
  }

  // Formato livre: blocos separados por linha em branco
  const blocos = txt
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const URL_RE = /https?:\/\/[^\s)>\]]+/i;
  const LOGIN_RE = /^\s*(?:login|e-?mail|usu[áa]rio|user)\s*[:\-]\s*(.+)$/im;
  const SENHA_RE = /^\s*(?:senha|password|pass|pwd)\s*[:\-]\s*(.+)$/im;
  const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

  const limparTitulo = (s: string) =>
    s
      .replace(EMOJI_RE, "")
      .replace(/^[\s\-•*▶►]+/, "")
      .replace(/[:：]\s*$/, "")
      .trim();

  const itens: LoteItem[] = [];

  for (const bloco of blocos) {
    const linhas = bloco.split("\n").map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) continue;

    let url: string | null = null;
    let login: string | null = null;
    let senha: string | null = null;
    const obsLinhas: string[] = [];
    let tituloCandidato = "";

    for (const linha of linhas) {
      const matchUrl = linha.match(URL_RE);
      const matchLogin = linha.match(LOGIN_RE);
      const matchSenha = linha.match(SENHA_RE);

      if (matchLogin) {
        login = matchLogin[1].trim();
        continue;
      }
      if (matchSenha) {
        senha = matchSenha[1].trim();
        continue;
      }
      if (matchUrl) {
        if (!url) {
          url = matchUrl[0].replace(/[.,);\]]+$/, "");
        }
        // Se a linha é SÓ a URL, não usa como título
        const semUrl = linha.replace(matchUrl[0], "").trim();
        if (semUrl) {
          if (!tituloCandidato) tituloCandidato = limparTitulo(semUrl);
          else obsLinhas.push(semUrl);
        }
        continue;
      }
      if (!tituloCandidato) {
        tituloCandidato = limparTitulo(linha);
      } else {
        obsLinhas.push(linha);
      }
    }

    // Bloco sem URL e sem credenciais → provavelmente saudação, descarta
    if (!url && !login && !senha) continue;

    let titulo = tituloCandidato;
    if (!titulo) {
      if (url) {
        try {
          titulo = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          titulo = url;
        }
      } else {
        titulo = "Acesso";
      }
    }

    itens.push({
      titulo,
      url,
      login,
      senha,
      observacao: obsLinhas.length ? obsLinhas.join("\n") : null,
    });
  }

  return itens;
}

// ============================================================
// MENSAGEM FORMATADA DE ACESSOS (para copiar)
// ============================================================
function construirMensagemAcessos(lista: DocumentacaoItem[]): string {
  if (!lista.length) return "";
  const partes: string[] = ["Segue abaixo as informações de acesso:", ""];
  lista.forEach((it) => {
    partes.push(`🔗 ${it.titulo}`);
    if (it.url) partes.push(it.url);
    if (it.login) partes.push(`Login: ${it.login}`);
    if (it.senha) partes.push(`Senha: ${it.senha}`);
    if (it.observacao) partes.push(it.observacao);
    partes.push("");
  });
  return partes.join("\n").trimEnd();
}

function construirMensagemMateriais(lista: DocumentacaoItem[]): string {
  if (!lista.length) return "";
  const partes: string[] = ["Segue abaixo os materiais enviados:", ""];
  lista.forEach((it) => {
    partes.push(`🔗 ${it.titulo}`);
    if (it.url) partes.push(it.url);
    if (it.formato) partes.push(`Formato: ${it.formato}`);
    if (it.data_evento)
      partes.push(`Data: ${new Date(it.data_evento).toLocaleDateString("pt-BR")}`);
    if (it.observacao) partes.push(it.observacao);
    partes.push("");
  });
  return partes.join("\n").trimEnd();
}

// ============================================================
// EXPORT
// ============================================================
function construirExportacaoTexto(nomeCliente: string, itens: DocumentacaoItem[]): string {
  const linhas: string[] = [];
  linhas.push(`Documentação e Acessos — ${nomeCliente}`);
  linhas.push(`Gerado em ${new Date().toLocaleString("pt-BR")}`);
  linhas.push("");

  let n = 1;
  DOC_BLOCOS.forEach((bloco) => {
    const lista = itens.filter((i) => (i.bloco as DocBloco) === bloco);
    if (lista.length === 0) return;
    linhas.push(`${n}. ${DOC_BLOCO_LABEL[bloco]}`);
    linhas.push("-".repeat(48));
    lista.forEach((it) => {
      linhas.push(`• ${it.titulo}`);
      const tipoLabel =
        TIPOS_POR_BLOCO[bloco]?.find((t) => t.value === it.tipo)?.label ?? it.tipo;
      linhas.push(`  Tipo: ${tipoLabel}`);
      if (it.url) linhas.push(`  Link: ${it.url}`);
      if (it.login) linhas.push(`  Login: ${it.login}`);
      if (it.senha) linhas.push(`  Senha: ${it.senha}`);
      if (it.formato) linhas.push(`  Formato: ${it.formato}`);
      if (it.data_evento)
        linhas.push(`  Data: ${new Date(it.data_evento).toLocaleDateString("pt-BR")}`);
      if (it.observacao) linhas.push(`  Observação: ${it.observacao}`);
      linhas.push("");
    });
    n += 1;
  });

  return linhas.join("\n");
}

// ============================================================
// MENSAGEM DE ACESSOS — render estilo WhatsApp
// ============================================================
function MensagemAcessosCard({
  item,
  onEdit,
}: {
  item: DocumentacaoItem;
  onEdit: () => void;
}) {
  const remove = useDocumentacao((s) => s.remove);
  const conteudo = item.observacao ?? "";

  const copiarTudo = () => {
    navigator.clipboard.writeText(conteudo);
    toast.success("Mensagem copiada");
  };

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <KeyRound className="h-4 w-4 text-primary shrink-0" />
            <div className="text-sm font-medium truncate">{item.titulo}</div>
            <Badge variant="outline" className="text-[10px]">Mensagem</Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={copiarTudo}
            >
              <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Copiar tudo
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive"
              onClick={() => {
                if (confirm("Remover esta mensagem de acessos?")) remove(item.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div
          className={cn(
            "rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap break-words",
            "max-h-[320px] overflow-y-auto",
            "[&::-webkit-scrollbar]:w-1.5",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:bg-border",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
          )}
        >
          {renderMensagemFormatada(conteudo)}
        </div>
      </CardContent>
    </Card>
  );
}

function renderMensagemFormatada(texto: string) {
  const URL_RE = /(https?:\/\/[^\s)>\]]+)/gi;
  const linhas = texto.split("\n");

  return linhas.map((linha, idx) => {
    const isLink = /^🔗/.test(linha.trim());
    const loginMatch = linha.match(/^(\s*)(Login|E-?mail|Usu[áa]rio|User)\s*:\s*(.*)$/i);
    const senhaMatch = linha.match(/^(\s*)(Senha|Password|Pass|Pwd)\s*:\s*(.*)$/i);

    const renderInline = (s: string) => {
      const partes = s.split(URL_RE);
      return partes.map((p, i) => {
        if (URL_RE.test(p)) {
          // reset do regex global
          URL_RE.lastIndex = 0;
          const limpo = p.replace(/[.,);\]]+$/, "");
          return (
            <a
              key={i}
              href={limpo}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline break-all"
            >
              {limpo}
            </a>
          );
        }
        return <span key={i}>{p}</span>;
      });
    };

    let conteudo: ReactNode;
    if (loginMatch) {
      conteudo = (
        <>
          <span className="font-semibold">Login: </span>
          {renderInline(loginMatch[3])}
        </>
      );
    } else if (senhaMatch) {
      conteudo = (
        <>
          <span className="font-semibold">Senha: </span>
          {renderInline(senhaMatch[3])}
        </>
      );
    } else if (isLink) {
      conteudo = <span className="font-semibold">{renderInline(linha)}</span>;
    } else {
      conteudo = renderInline(linha);
    }

    return (
      <div key={idx} className={linha.trim() === "" ? "h-2" : undefined}>
        {conteudo}
      </div>
    );
  });
}

