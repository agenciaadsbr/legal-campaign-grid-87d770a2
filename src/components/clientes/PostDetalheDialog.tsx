import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import {
  Trash2,
  Zap,
  Plus,
  X,
  FileText,
  Send,
  Image as ImageIcon,
  Link2,
  Copy,
} from "lucide-react";
import { useCRM } from "@/store/crm";
import { useAuth } from "@/hooks/useAuth";
import { PRIORIDADES, PRIORIDADE_LABEL } from "@/lib/demandas-categorias";
import { TarefaIAConsulta } from "@/components/demandas/TarefaIAConsulta";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichTextView } from "@/components/RichTextView";
import { VoltarVisaoGeralButton } from "@/components/projeto/VoltarVisaoGeralButton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  postId: string;
  onVoltar: () => void;
}

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

const isVideoUrl = (url: string, nome?: string) => {
  if (url.startsWith("data:video")) return true;
  const n = (nome || url).toLowerCase();
  return /\.(mp4|webm|mov|mkv|m4v|avi|ogv)(\?|$)/.test(n);
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

export function PostDetalheDialog({ postId, onVoltar }: Props) {
  const navigate = useNavigate();
  const {
    posts,
    cards,
    clientes,
    responsaveis,
    statusPostOptions,
    updateCard,
    updatePost,
    deleteCard,
    addComentario,
    comentarios,
  } = useCRM();
  const { user, isAdmin, canWrite } = useAuth();

  const post = posts.find((p) => p.id === postId);
  const card = post && cards.find((c) => c.id === post.card_id);
  const cliente = card && clientes.find((c) => c.id === card.cliente_id);

  // ---------- estado controlado p/ inputs com debounce ----------
  const [tituloLocal, setTituloLocal] = useState("");
  const [briefingLocal, setBriefingLocal] = useState("");
  const [linkMeisterLocal, setLinkMeisterLocal] = useState("");
  const [linkDriveLocal, setLinkDriveLocal] = useState("");
  const [legendaLocal, setLegendaLocal] = useState("");
  const [linkMetaLocal, setLinkMetaLocal] = useState("");
  const [subtipoLocal, setSubtipoLocal] = useState("");
  const [novoComentario, setNovoComentario] = useState("");
  const [composerImg, setComposerImg] = useState<string | null>(null);
  const [previewAnexo, setPreviewAnexo] = useState<{ url: string; nome: string } | null>(null);
  const [anexoParaRemover, setAnexoParaRemover] = useState<string | null>(null);

  const tituloTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const briefingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkMeisterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkDriveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const legendaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkMetaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subtipoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anexoFileRef = useRef<HTMLInputElement>(null);
  const composerFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post && card) {
      setTituloLocal(card.titulo_card || "");
      setBriefingLocal(card.descricao || "");
      setLinkMeisterLocal(post.link_meister || "");
      setLinkDriveLocal(((post as any).link_drive as string) || "");
      setLegendaLocal(post.legenda || "");
      setLinkMetaLocal(post.link_post || "");
      setSubtipoLocal(card.formato || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, card?.id]);

  useEffect(() => {
    return () => {
      [tituloTimer, briefingTimer, linkMeisterTimer, linkDriveTimer, legendaTimer, linkMetaTimer, subtipoTimer].forEach(
        (t) => t.current && clearTimeout(t.current),
      );
    };
  }, []);

  if (!post || !card) {
    return <div className="p-6 text-muted-foreground">Post não encontrado.</div>;
  }

  const isUrgente = !!card.is_urgent;

  // Prioridade: Card não tem coluna; refletimos via is_urgent (Urgente / Media)
  const prioridadeAtual = isUrgente ? "Urgente" : "Media";

  const meusComentarios = useMemo(
    () =>
      comentarios
        .filter((c) => c.post_id === post.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [comentarios, post.id],
  );

  const meusAnexos = post.anexos || [];

  const debounce = (ref: React.MutableRefObject<any>, fn: () => void, ms = 600) => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(fn, ms);
  };

  const enviarComentario = async () => {
    if (!user) return;
    const txt = novoComentario.replace(/<p><\/p>/g, "").trim();
    if (!txt && !composerImg) return;
    await addComentario({
      post_id: post.id,
      cliente_id: card.cliente_id,
      usuario_id: user.id,
      comentario_texto: txt,
      imagem_url: composerImg ?? undefined,
    });
    setNovoComentario("");
    setComposerImg(null);
    toast.success("Comentário adicionado");
  };

  const onPickComposerImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setComposerImg(await fileToDataUrl(f));
    } catch {
      toast.error("Falha ao carregar imagem");
    }
    e.target.value = "";
  };

  const adicionarAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const toastId = toast.loading(files.length === 1 ? "Enviando anexo..." : `Enviando ${files.length} anexos...`);
    try {
      const novos = [...meusAnexos];
      for (const f of files) {
        const safeName = sanitizeFileName(f.name);
        const path = `posts/${post.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("anexos").upload(path, f, {
          contentType: f.type || undefined,
          upsert: false,
          cacheControl: "3600",
        });
        if (upErr) {
          toast.error(`Falha ao enviar "${f.name}"`, { description: upErr.message });
          continue;
        }
        const { data: pub } = supabase.storage.from("anexos").getPublicUrl(path);
        novos.push({ id: crypto.randomUUID(), nome: f.name, url: pub.publicUrl });
      }
      await updatePost(post.id, { anexos: novos });
      toast.success("Anexos atualizados", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Falha ao adicionar anexo", { id: toastId });
    }
    e.target.value = "";
  };

  const removerAnexo = async (anexoId: string) => {
    const novos = meusAnexos.filter((a) => a.id !== anexoId);
    await updatePost(post.id, { anexos: novos });
    setAnexoParaRemover(null);
    toast.success("Anexo removido");
  };

  const copiarLink = async () => {
    const PUBLISHED_ORIGIN = "https://legal-campaign-grid.lovable.app";
    const isLovablePreview = /id-preview--.*\.lovable\.app$/.test(window.location.hostname);
    const origin = isLovablePreview ? PUBLISHED_ORIGIN : window.location.origin;
    const url = `${origin}/clientes/${card.cliente_id}/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link da tarefa copiado");
    } catch {
      toast.error("Falha ao copiar link");
    }
  };

  const toggleResponsavel = async (rid: string) => {
    const ids = card.responsaveis || [];
    const next = ids.includes(rid) ? ids.filter((x) => x !== rid) : [...ids, rid];
    await updateCard(card.id, { responsaveis: next });
  };

  // Demanda-like stub para reutilizar TarefaIAConsulta sem alterar contrato
  const demandaStub: any = {
    id: post.id,
    cliente_id: card.cliente_id,
    titulo: card.titulo_card,
    categoria: "Personalizado",
    subtipo: card.formato || null,
    prioridade: prioridadeAtual,
    descricao: card.descricao || "",
    status: post.status,
  };

  return (
    <div className="max-w-2xl w-full mx-auto p-3 space-y-2">
      <fieldset disabled={!canWrite} className="contents">
        <div>
          <VoltarVisaoGeralButton onClick={onVoltar} />
        </div>

        {/* CARD 1 — Informações do Post */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-1.5 pt-2.5 px-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                  Título da tarefa
                </div>
                <Input
                  value={tituloLocal}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTituloLocal(v);
                    debounce(tituloTimer, () => updateCard(card.id, { titulo_card: v.trim() || "Sem título" }), 500);
                  }}
                  onBlur={() => {
                    if (tituloTimer.current) {
                      clearTimeout(tituloTimer.current);
                      tituloTimer.current = null;
                    }
                    const novo = tituloLocal.trim() || "Sem título";
                    if (novo !== card.titulo_card) updateCard(card.id, { titulo_card: novo });
                  }}
                  placeholder="Ex: Post institucional - lançamento"
                  className="text-sm font-bold border-0 px-0 focus-visible:ring-0 h-auto"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {cliente?.nome_cliente ?? "—"} · Posts
                  {card.formato && ` · ${card.formato}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isUrgente ? "default" : "outline"}
                  size="sm"
                  disabled={!canWrite}
                  onClick={() => {
                    const next = !isUrgente;
                    updateCard(card.id, { is_urgent: next });
                    toast.success(next ? "Post marcado como urgente" : "Urgência removida");
                  }}
                  className={cn(
                    "gap-1.5",
                    isUrgente && "bg-amber-500 hover:bg-amber-500/90 text-white border-amber-500",
                  )}
                  title={isUrgente ? "Remover urgência" : "Marcar como urgente"}
                >
                  <Zap className={cn("h-4 w-4", isUrgente && "fill-current")} />
                  Urgente
                </Button>
                <Select
                  value={post.status}
                  onValueChange={(v) => updatePost(post.id, { status: v as any })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusPostOptions.map((o) => (
                      <SelectItem key={o.label} value={o.label}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: o.cor }} />
                          {o.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={copiarLink}
                  title="Copiar link da tarefa"
                  className="shrink-0"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive shrink-0" title="Excluir post">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir post?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Comentários, anexos e histórico serão removidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            await deleteCard(card.id);
                            onVoltar();
                          }}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-2 px-3 pb-2.5">
            {/* Categoria · Subtipo · Prioridade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px]">Categoria</Label>
                <Select value="Posts" disabled>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Posts">Posts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Subtipo</Label>
                <Input
                  value={subtipoLocal}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSubtipoLocal(v);
                    debounce(subtipoTimer, () => updateCard(card.id, { formato: v || null }), 600);
                  }}
                  placeholder="Ex: Carrossel, Reels..."
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">Prioridade</Label>
                <Select
                  value={prioridadeAtual}
                  onValueChange={(v) => {
                    updateCard(card.id, { is_urgent: v === "Urgente" });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORIDADE_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Datas + Responsáveis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Data início</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={card.data_inicio_tarefa ? card.data_inicio_tarefa.slice(0, 10) : ""}
                  onChange={(e) => updateCard(card.id, { data_inicio_tarefa: e.target.value || null })}
                />
              </div>
              <div>
                <Label className="text-[11px]">Data limite</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={card.data_limite_tarefa ? card.data_limite_tarefa.slice(0, 10) : ""}
                  onChange={(e) => updateCard(card.id, { data_limite_tarefa: e.target.value || null })}
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-[11px]">Responsáveis</Label>
                <div className="mt-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="group flex items-center gap-2 rounded-md border border-transparent hover:border-border hover:bg-accent px-2 py-1 -mx-2 transition-colors min-h-[36px] w-full"
                        title="Clique para alterar os responsáveis"
                      >
                        {(() => {
                          const ids = card.responsaveis || [];
                          const lista = responsaveis.filter((x) => ids.includes(x.id));
                          return lista.length > 0 ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              {lista.map((r) => (
                                <div key={r.id} className="flex items-center gap-1.5">
                                  <div
                                    className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center"
                                    style={{ backgroundColor: r.cor }}
                                  >
                                    {r.nome
                                      .split(" ")
                                      .map((n) => n[0])
                                      .slice(0, 2)
                                      .join("")}
                                  </div>
                                  <span className="text-xs">{r.nome}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">+ atribuir responsáveis</span>
                          );
                        })()}
                        <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="text-[11px] text-muted-foreground px-2 pb-1.5">Responsáveis</div>
                      <div className="max-h-60 overflow-auto space-y-0.5">
                        <button
                          type="button"
                          onClick={() => updateCard(card.id, { responsaveis: [] })}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" /> Limpar todos
                        </button>
                        {responsaveis.map((r) => {
                          const active = (card.responsaveis || []).includes(r.id);
                          return (
                            <button
                              type="button"
                              key={r.id}
                              onClick={() => toggleResponsavel(r.id)}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
                                active && "bg-accent",
                              )}
                            >
                              <div
                                className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0"
                                style={{ backgroundColor: r.cor }}
                              >
                                {r.nome
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")}
                              </div>
                              <span className="truncate">{r.nome}</span>
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Anexos */}
            <div className="border-t pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[11px]">Anexos</Label>
                <input
                  ref={anexoFileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={adicionarAnexo}
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
              <div className="flex flex-wrap gap-1.5">
                {meusAnexos.map((a) => {
                  const img = isImageUrl(a.url, a.nome);
                  const vid = !img && isVideoUrl(a.url, a.nome);
                  return (
                    <div
                      key={a.id}
                      className="group relative h-16 w-16 border rounded-lg overflow-hidden bg-muted/30"
                    >
                      {img ? (
                        <button
                          type="button"
                          onClick={() => setPreviewAnexo({ url: a.url, nome: a.nome })}
                          className="block w-full h-full"
                          title={a.nome}
                        >
                          <img src={a.url} alt={a.nome} className="w-full h-full object-cover" />
                        </button>
                      ) : vid ? (
                        <button
                          type="button"
                          onClick={() => setPreviewAnexo({ url: a.url, nome: a.nome })}
                          className="block w-full h-full relative bg-black"
                          title={a.nome}
                        >
                          <video
                            src={a.url}
                            preload="metadata"
                            muted
                            playsInline
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        </button>
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
                      {canWrite && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnexoParaRemover(a.id);
                          }}
                          className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/90 border border-border text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                          title="Remover anexo"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => anexoFileRef.current?.click()}
                  className="flex flex-col items-center justify-center h-16 w-16 border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Adicionar anexo"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-[9px] mt-0.5">Anexar</span>
                </button>
              </div>
            </div>

            {/* Links Meister / Drive */}
            <div className="border-t pt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px]">Link do Meister</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={linkMeisterLocal}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLinkMeisterLocal(v);
                    debounce(linkMeisterTimer, () => updatePost(post.id, { link_meister: v.trim() || undefined }));
                  }}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px]">Link do Drive</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={linkDriveLocal}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLinkDriveLocal(v);
                    debounce(linkDriveTimer, () =>
                      updatePost(post.id, { link_drive: v.trim() || undefined } as any),
                    );
                  }}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Atividade / Briefing */}
            <div className="border-t pt-2">
              <Label className="text-[11px]">Atividade / Briefing</Label>
              <Textarea
                placeholder="Detalhes internos do post: contexto, CTA, referências, instruções operacionais..."
                value={briefingLocal}
                onChange={(e) => {
                  const v = e.target.value;
                  setBriefingLocal(v);
                  debounce(briefingTimer, () => updateCard(card.id, { descricao: v }));
                }}
                className="mt-1 h-32 max-h-32 min-h-0 resize-none overflow-y-auto text-xs"
              />
            </div>

            {/* Campos de Post */}
            <div className="border-t pt-2 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Campos de Post
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Data agendamento</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={post.data_agendamento ? post.data_agendamento.slice(0, 10) : ""}
                    onChange={(e) => updatePost(post.id, { data_agendamento: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Data postagem</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={post.data_postagem ? post.data_postagem.slice(0, 10) : ""}
                    onChange={(e) => updatePost(post.id, { data_postagem: e.target.value || undefined })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[11px]">Link Meta Business Suite</Label>
                  <Input
                    type="url"
                    placeholder="https://business.facebook.com/..."
                    value={linkMetaLocal}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLinkMetaLocal(v);
                      debounce(linkMetaTimer, () => updatePost(post.id, { link_post: v.trim() || undefined }));
                    }}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[11px]">Legenda</Label>
                  <Textarea
                    placeholder="Texto final da publicação (Instagram/Facebook)..."
                    value={legendaLocal}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLegendaLocal(v);
                      debounce(legendaTimer, () => updatePost(post.id, { legenda: v } as any));
                    }}
                    className="mt-1 h-32 max-h-32 min-h-0 resize-none overflow-y-auto text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2 — Atividade (comentários) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs uppercase tracking-wide">Atividade</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col px-3 pb-3 gap-2">
            <div className="space-y-2">
              {meusComentarios.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">Sem comentários ainda</div>
              )}
              {meusComentarios.map((c) => {
                const autor = responsaveis.find((r) => r.id === c.usuario_id);
                const cor = autor?.cor ?? "hsl(var(--muted))";
                const nome = autor?.nome ?? "Usuário";
                return (
                  <div key={c.id} className="flex gap-2">
                    <div
                      className="h-8 w-8 rounded-full text-white text-[11px] font-semibold flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cor }}
                    >
                      {nome
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="flex-1 rounded-lg border bg-muted/30 px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{nome}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(c.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {c.comentario_texto && <RichTextView content={c.comentario_texto} />}
                      {c.imagem_url && (
                        <a href={c.imagem_url} target="_blank" rel="noreferrer" className="block mt-2">
                          <img src={c.imagem_url} alt="anexo" className="max-h-48 rounded-md border" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {canWrite && (
              <div className="border rounded-lg overflow-hidden">
                <RichTextEditor
                  value={novoComentario}
                  onChange={setNovoComentario}
                  placeholder="Escreva um comentário..."
                  onEnterSubmit={enviarComentario}
                  minHeight="48px"
                />
                {composerImg && (
                  <div className="px-3 py-2 border-t bg-muted/30 flex items-center gap-2">
                    <img src={composerImg} alt="preview" className="h-12 w-12 rounded object-cover border" />
                    <Button size="icon" variant="ghost" onClick={() => setComposerImg(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between px-2 py-1.5 border-t bg-muted/20">
                  <div className="flex items-center gap-0.5">
                    <input
                      ref={composerFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickComposerImg}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Imagem"
                      onClick={() => composerFileRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button size="sm" onClick={enviarComentario} disabled={!novoComentario.trim() && !composerImg} className="gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Enviar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CARD 3 — IA Consulta (Está com dúvidas?) */}
        <TarefaIAConsulta
          demanda={demandaStub}
          comentarios_texto={meusComentarios.map((c) => c.comentario_texto).join("\n")}
          onAddComment={(txt) => {
            if (user) {
              addComentario({
                post_id: post.id,
                cliente_id: card.cliente_id,
                usuario_id: user.id,
                comentario_texto: txt,
              });
            }
          }}
        />

        {/* CARD 4 — Workflow / Continuidade (placeholder p/ Posts) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-1 pt-2 px-3">
            <CardTitle className="text-xs uppercase tracking-wide">Workflow / Continuidade</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-xs text-muted-foreground">
            Continuidade entre etapas está disponível para tarefas das demais áreas.
            Posts não possuem etapas vinculadas.
          </CardContent>
        </Card>
      </fieldset>

      {/* Lightbox de anexo */}
      {previewAnexo && (
        <div
          className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center p-4"
          onClick={() => setPreviewAnexo(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewAnexo(null)}
              className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background border flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
            {isVideoUrl(previewAnexo.url, previewAnexo.nome) ? (
              <video src={previewAnexo.url} controls autoPlay className="max-h-[85vh] w-full" />
            ) : (
              <img
                src={previewAnexo.url}
                alt={previewAnexo.nome}
                className="max-h-[85vh] w-full object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* Confirmação de remoção de anexo */}
      <AlertDialog open={!!anexoParaRemover} onOpenChange={(o) => !o && setAnexoParaRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido deste post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => anexoParaRemover && removerAnexo(anexoParaRemover)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
