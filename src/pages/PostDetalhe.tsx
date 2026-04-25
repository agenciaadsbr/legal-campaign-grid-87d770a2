import { useParams } from "react-router-dom";
import { useCRM, StatusCard } from "@/store/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useRef, useState } from "react";
import { AvatarStack } from "@/components/AvatarStack";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import {
  Paperclip,
  Send,
  Image as ImageIcon,
  X,
  ExternalLink,
  Plus,
  Smile,
  AtSign,
  Pencil,
  Trash2,
  Check,
  FileText,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichTextView } from "@/components/RichTextView";

// Status agora vêm de statusPostOptions (Configurações → Status de Posts)

const fileToDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(f);
  });

const isImageUrl = (url: string, nome?: string) => {
  if (url.startsWith("data:image")) return true;
  const n = (nome || url).toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg|bmp)(\?|$)/.test(n);
};

export default function PostDetalhe() {
  const { postId } = useParams();
  const { posts, cards, comentarios, responsaveis, updatePost, updateCard, addComentario, updateComentario, deleteComentario, statusPostOptions } = useCRM();
  const { canWrite } = useAuth();
  const post = posts.find((p) => p.id === postId);
  const card = post && cards.find((c) => c.id === post.card_id);

  const [texto, setTexto] = useState("");
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [legendaSavedAt, setLegendaSavedAt] = useState<number | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const composerFileRef = useRef<HTMLInputElement>(null);
  const anexoFileRef = useRef<HTMLInputElement>(null);

  // efeito visual "Salvo" para a legenda (debounce)
  useEffect(() => {
    if (legendaSavedAt === null) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 1500);
    return () => clearTimeout(t);
  }, [legendaSavedAt]);

  if (!post || !card) return <div className="p-6 text-muted-foreground">Post não encontrado.</div>;

  const meusComentarios = comentarios
    .filter((c) => c.post_id === post.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const enviar = () => {
    if (!texto.trim() && !imagemUrl) return;
    addComentario({
      post_id: post.id,
      usuario_id: responsaveis[0]?.id ?? "user",
      comentario_texto: texto.trim(),
      imagem_url: imagemUrl ?? undefined,
    });
    setTexto("");
    setImagemUrl(null);
    toast.success("Comentário adicionado");
  };

  const onPickImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const dataUrl = await fileToDataUrl(f);
      setImagemUrl(dataUrl);
    } catch {
      toast.error("Falha ao carregar imagem");
    }
    e.target.value = "";
  };

  const addAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    try {
      const novos = await Promise.all(
        files.map(async (f) => ({
          id: crypto.randomUUID(),
          nome: f.name,
          url: await fileToDataUrl(f),
        })),
      );
      updatePost(post.id, { anexos: [...post.anexos, ...novos] });
      toast.success(`${novos.length} anexo(s) adicionado(s)`);
    } catch {
      toast.error("Falha ao adicionar anexo");
    }
    e.target.value = "";
  };

  const removerAnexo = (id: string) => {
    updatePost(post.id, { anexos: post.anexos.filter((a) => a.id !== id) });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-3 animate-fade-in">
      {/* Post do Mês — seção unificada */}
      <fieldset disabled={!canWrite} className="contents">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Título da tarefa</div>
              <Input
                value={card.titulo_card}
                onChange={(e) => updateCard(card.id, { titulo_card: e.target.value })}
                placeholder="Ex: Criar arte carrossel sobre aposentadoria rural"
                className="text-xl font-bold border-0 px-0 focus-visible:ring-0 h-auto"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Post Mês {card.mes_referencia} · Semana {card.numero_semana}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={card.is_urgent ? "default" : "outline"}
                size="sm"
                disabled={!canWrite}
                onClick={() => {
                  const next = !card.is_urgent;
                  updateCard(card.id, { is_urgent: next });
                  toast.success(next ? "Card marcado como urgente" : "Urgência removida");
                }}
                className={cn(
                  "gap-1.5",
                  card.is_urgent && "bg-amber-500 hover:bg-amber-500/90 text-white border-amber-500"
                )}
                title={card.is_urgent ? "Remover urgência" : "Marcar como urgente"}
              >
                <Zap className={cn("h-4 w-4", card.is_urgent && "fill-current")} />
                Urgente
              </Button>
              <Select value={post.status} onValueChange={(v) => updatePost(post.id, { status: v as StatusCard })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusPostOptions.map((s) => <SelectItem key={s.label} value={s.label}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Dados do post */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data agendamento</Label>
              <Input
                type="date"
                value={post.data_agendamento ?? ""}
                onChange={(e) => updatePost(post.id, { data_agendamento: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Data postagem</Label>
              <Input
                type="date"
                value={post.data_postagem ?? ""}
                onChange={(e) => updatePost(post.id, { data_postagem: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Link do Meta Business Suit</Label>
              <div className="flex gap-1.5">
                <Input
                  placeholder="https://..."
                  value={post.link_post ?? ""}
                  onChange={(e) => updatePost(post.id, { link_post: e.target.value })}
                />
                {post.link_post && (
                  <Button size="icon" variant="outline" asChild className="shrink-0">
                    <a href={post.link_post} target="_blank" rel="noreferrer" title="Abrir Meta">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Link do Meister</Label>
              <div className="flex gap-1.5">
                <Input
                  placeholder="https://meister..."
                  value={post.link_meister ?? ""}
                  onChange={(e) => updatePost(post.id, { link_meister: e.target.value })}
                />
                {post.link_meister && (
                  <Button size="icon" variant="outline" asChild className="shrink-0">
                    <a href={post.link_meister} target="_blank" rel="noreferrer" title="Abrir Meister">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Responsáveis</Label>
              <div className="mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="group flex items-center gap-2 rounded-md border border-transparent hover:border-border hover:bg-accent px-2 py-1.5 -mx-2 transition-colors min-h-[40px]"
                      title="Clique para adicionar/remover responsáveis"
                    >
                      {card.responsaveis.length > 0 ? (
                        <AvatarStack responsaveis={responsaveis.filter((r) => card.responsaveis.includes(r.id))} />
                      ) : (
                        <span className="text-sm text-muted-foreground">+ atribuir responsáveis</span>
                      )}
                      <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="text-[11px] text-muted-foreground px-2 pb-1.5">Responsáveis</div>
                    <div className="max-h-60 overflow-auto space-y-0.5">
                      {responsaveis.map((r) => {
                        const checked = card.responsaveis.includes(r.id);
                        return (
                          <button
                            type="button"
                            key={r.id}
                            onClick={() => {
                              const next = checked
                                ? card.responsaveis.filter((v) => v !== r.id)
                                : [...card.responsaveis, r.id];
                              updateCard(card.id, { responsaveis: next });
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
                              checked && "bg-accent"
                            )}
                          >
                            <Checkbox checked={checked} />
                            <div
                              className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0"
                              style={{ backgroundColor: r.cor }}
                            >
                              {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                            </div>
                            <span className="truncate">{r.nome}</span>
                          </button>
                        );
                      })}
                      {responsaveis.length === 0 && (
                        <div className="text-xs text-muted-foreground px-2 py-3 text-center">Nenhum responsável cadastrado</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Anexos */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Anexos</Label>
              <input
                ref={anexoFileRef}
                type="file"
                multiple
                className="hidden"
                onChange={addAnexo}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-primary hover:text-primary"
                onClick={() => anexoFileRef.current?.click()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar anexo
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {post.anexos.map((a) => {
                const img = isImageUrl(a.url, a.nome);
                return (
                  <div
                    key={a.id}
                    className="group relative h-[72px] w-[72px] border rounded-lg overflow-hidden bg-muted/30"
                  >
                    {img ? (
                      <a href={a.url} target="_blank" rel="noreferrer" className="block w-full h-full">
                        <img src={a.url} alt={a.nome} className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        download={a.nome}
                        className="flex flex-col items-center justify-center w-full h-full p-1 text-center hover:bg-accent"
                        title={a.nome}
                      >
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[9px] mt-0.5 truncate w-full leading-tight">{a.nome}</span>
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); removerAnexo(a.id); }}
                      className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() => anexoFileRef.current?.click()}
                className="flex flex-col items-center justify-center h-[72px] w-[72px] border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Adicionar anexo"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[9px] mt-0.5">Anexar</span>
              </button>
            </div>
          </div>

          {/* Atividade / Briefing interno */}
          <div className="border-t pt-4">
            <Label className="text-xs">Atividade / Briefing</Label>
            <Textarea
              rows={4}
              placeholder="Detalhes internos: cores do cliente, CTA no último slide, tom formal, referências..."
              value={card.descricao ?? ""}
              onChange={(e) => updateCard(card.id, { descricao: e.target.value } as any)}
              className="mt-1.5"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Visível apenas dentro deste card. O título principal acima é o que aparece no Kanban.
            </p>
          </div>

          {/* Legenda */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Legenda</Label>
              {showSaved && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 animate-fade-in">
                  <CheckCircle2 className="h-3 w-3" /> Salvo
                </span>
              )}
            </div>
            <Textarea
              rows={5}
              placeholder="Escreva a legenda do post..."
              value={post.legenda}
              onChange={(e) => {
                updatePost(post.id, { legenda: e.target.value });
                setLegendaSavedAt(Date.now());
              }}
            />
            <div className="flex justify-end mt-1">
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {post.legenda.length} caracteres
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      </fieldset>

      {/* Atividade */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Atividade</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 max-h-80 overflow-auto scrollbar-thin pr-1">
            {meusComentarios.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">Sem comentários ainda</div>
            )}
            {meusComentarios.map((c) => (
              <ComentarioBubble
                key={c.id}
                comentario={c}
                autorCor={responsaveis.find((r) => r.id === c.usuario_id)?.cor}
                autorNome={responsaveis.find((r) => r.id === c.usuario_id)?.nome ?? "Usuário"}
                onUpdate={(texto) => updateComentario(c.id, { comentario_texto: texto })}
                onDelete={() => deleteComentario(c.id)}
              />
            ))}
          </div>

          {/* Composer estilo chat */}
          <div className="rounded-xl border bg-muted/30 px-3 py-2 space-y-2">
            {imagemUrl && (
              <div className="relative inline-block">
                <img src={imagemUrl} className="max-h-32 rounded border" alt="preview" />
                <button
                  onClick={() => setImagemUrl(null)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <RichTextEditor
              value={texto}
              onChange={setTexto}
              placeholder="Escreva um comentário..."
              onEnterSubmit={enviar}
              minHeight="min-h-[44px]"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-muted-foreground">
                <input
                  ref={composerFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickImg}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => composerFileRef.current?.click()}
                  title="Anexar imagem"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Imagem" onClick={() => composerFileRef.current?.click()}>
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Emoji" disabled>
                  <Smile className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" title="Mencionar" disabled>
                  <AtSign className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Enter envia · Shift+Enter quebra</span>
                <Button size="sm" onClick={enviar} disabled={!texto.trim() && !imagemUrl}>
                  <Send className="h-4 w-4 mr-1" /> Enviar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComentarioBubble({
  comentario,
  autorNome,
  autorCor,
  onUpdate,
  onDelete,
}: {
  comentario: { id: string; comentario_texto: string; imagem_url?: string; created_at: string };
  autorNome: string;
  autorCor?: string;
  onUpdate: (texto: string) => void;
  onDelete: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(comentario.comentario_texto);

  const salvar = () => {
    if (!valor.trim()) {
      toast.error("Comentário não pode ficar vazio");
      return;
    }
    onUpdate(valor.trim());
    setEditando(false);
    toast.success("Comentário atualizado");
  };

  return (
    <div className="group flex gap-2">
      <div
        className="h-7 w-7 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0"
        style={{ backgroundColor: autorCor ?? "hsl(var(--muted-foreground))" }}
      >
        {autorNome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
      </div>
      <div className="flex-1 bg-muted/40 rounded-md px-3 py-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted-foreground truncate">
            {autorNome} · {new Date(comentario.created_at).toLocaleString("pt-BR")}
          </div>
          {!editando && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditando(true)} title="Editar">
                <Pencil className="h-3 w-3" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" title="Excluir">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onDelete();
                        toast.success("Comentário excluído");
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        {editando ? (
          <div className="mt-1.5 space-y-2">
            <RichTextEditor
              value={valor}
              onChange={setValor}
              placeholder="Editar comentário..."
              minHeight="min-h-[60px]"
            />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => { setValor(comentario.comentario_texto); setEditando(false); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={salvar}>
                <Check className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
            </div>
          </div>
        ) : (
          <>
            {comentario.comentario_texto && (
              <RichTextView content={comentario.comentario_texto} className="mt-0.5" />
            )}
            {comentario.imagem_url && (
              <a href={comentario.imagem_url} target="_blank" rel="noreferrer">
                <img src={comentario.imagem_url} className="mt-2 max-h-48 rounded border" alt="anexo" />
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
