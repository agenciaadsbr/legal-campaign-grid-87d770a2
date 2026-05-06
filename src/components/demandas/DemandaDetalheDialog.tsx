import { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
import { Demanda, useDemandas, getResponsaveisIds } from "@/store/demandas";
import { useCRM } from "@/store/crm";
import { useAuth } from "@/hooks/useAuth";
import {
  STATUS_DEMANDA,
  STATUS_DEMANDA_LABEL,
  STATUS_DEMANDA_COR,
  CATEGORIA_LABEL,
  CATEGORIAS,
  CATEGORIA_SUBTIPOS,
  PRIORIDADES,
  PRIORIDADE_LABEL,
  type DemandaCategoria,
} from "@/lib/demandas-categorias";
import {
  Trash2,
  Zap,
  Plus,
  X,
  FileText,
  Send,
  Image as ImageIcon,
  Smile,
  AtSign,
  Paperclip,
} from "lucide-react";
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
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichTextView } from "@/components/RichTextView";
import { VoltarVisaoGeralButton } from "@/components/projeto/VoltarVisaoGeralButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  demanda: Demanda | null;
  onOpenChange: (v: boolean) => void;
  /**
   * Quando true, indica que a demanda foi recém-criada como rascunho silencioso.
   * - Foca o input de título automaticamente.
   * - Ao fechar, se o título permanecer vazio/"Sem título" e não houver
   *   conteúdo (descrição, anexos, comentários), o rascunho é descartado.
   */
  isRascunho?: boolean;
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

export function DemandaDetalheDialog({ demanda: demandaProp, onOpenChange, isRascunho }: Props) {
  const { clientes, responsaveis } = useCRM();
  const { user, isAdmin, canWrite } = useAuth();
  const {
    updateDemanda,
    addComentario,
    addAnexo,
    removeAnexo,
    deleteDemanda,
    comentarios,
    historico,
    anexos,
    demandas,
  } = useDemandas();

  // Fonte de verdade reativa: lê a demanda viva do store pelo id, para que
  // mudanças em Categoria/Subtipo/Prioridade/Datas/Responsáveis apareçam
  // imediatamente nos controles sem precisar fechar e reabrir o card.
  const demanda = demandaProp
    ? demandas.find((d) => d.id === demandaProp.id) ?? demandaProp
    : null;

  const [novoComentario, setNovoComentario] = useState("");
  const [composerImg, setComposerImg] = useState<string | null>(null);
  const composerFileRef = useRef<HTMLInputElement>(null);
  const anexoFileRef = useRef<HTMLInputElement>(null);
  const [previewAnexo, setPreviewAnexo] = useState<{ url: string; nome: string } | null>(null);
  const [anexoParaRemover, setAnexoParaRemover] = useState<string | null>(null);
  const [descricaoLocal, setDescricaoLocal] = useState("");
  const descricaoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tituloLocal, setTituloLocal] = useState("");
  const tituloTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tituloInputRef = useRef<HTMLInputElement>(null);

  const cliente = demanda && clientes.find((c) => c.id === demanda.cliente_id);
  const meusComentarios = useMemo(
    () =>
      demanda
        ? comentarios
            .filter((c) => c.demanda_id === demanda.id)
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
        : [],
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

  // Sincroniza descricaoLocal/tituloLocal quando muda de demanda (por id) ou
  // quando os valores chegam/atualizam externamente sem haver edição em curso.
  useEffect(() => {
    if (demanda) {
      setDescricaoLocal(demanda.descricao ?? "");
      // Em rascunho, o título no banco vem como "Sem título" — mostrar vazio.
      const t = demanda.titulo === "Sem título" ? "" : demanda.titulo;
      setTituloLocal(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demanda?.id]);

  // Auto-foco no título quando abrir um rascunho.
  useEffect(() => {
    if (isRascunho && demanda) {
      const t = setTimeout(() => tituloInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isRascunho, demanda?.id]);

  // Limpa timers ao desmontar
  useEffect(() => {
    return () => {
      if (descricaoTimer.current) clearTimeout(descricaoTimer.current);
      if (tituloTimer.current) clearTimeout(tituloTimer.current);
    };
  }, []);

  // Wrapper de fechamento: descarta rascunho silenciosamente quando vazio.
  const handleOpenChange = (open: boolean) => {
    if (!open && demanda) {
      // flush de timers pendentes
      if (descricaoTimer.current) clearTimeout(descricaoTimer.current);
      if (tituloTimer.current) clearTimeout(tituloTimer.current);
      const tituloFinal = tituloLocal.trim();
      const descFinal = descricaoLocal.trim();
      const semConteudo =
        !tituloFinal &&
        !descFinal &&
        meusComentarios.length === 0 &&
        meusAnexos.length === 0 &&
        (demanda.responsaveis_ids?.length ?? 0) === 0 &&
        !demanda.data_limite &&
        !demanda.data_inicio;
      if (isRascunho && semConteudo) {
        deleteDemanda(demanda.id);
      }
    }
    onOpenChange(open);
  };

  if (!demanda) return null;

  const isUrgente = demanda.prioridade === "Urgente";

  const enviar = async () => {
    if (!user) return;
    const txt = novoComentario.replace(/<p><\/p>/g, "").trim();
    if (!txt && !composerImg) return;
    await addComentario(demanda.id, user.id, txt, composerImg);
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
    try {
      for (const f of files) {
        const url = await fileToDataUrl(f);
        await addAnexo({
          demanda_id: demanda.id,
          nome: f.name,
          url,
          mime: f.type || null,
          size: f.size,
        });
      }
      toast.success(`${files.length} anexo(s) adicionado(s)`);
    } catch {
      toast.error("Falha ao adicionar anexo");
    }
    e.target.value = "";
  };

  return (
    <Dialog open={!!demanda} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl w-[92vw] max-h-[90vh] overflow-hidden p-3 gap-2 flex flex-col">
        <fieldset disabled={!canWrite} className="contents">
          {/* Voltar para Visão Geral */}
          <div className="shrink-0">
            <VoltarVisaoGeralButton onClick={() => handleOpenChange(false)} />
          </div>
          {/* CARD 1 — Informações da Demanda */}
          <Card className="shrink-0 overflow-hidden">
            <CardHeader className="pb-1.5 pt-2.5 px-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
                    Título da tarefa
                  </div>
                  <Input
                    ref={tituloInputRef}
                    value={tituloLocal}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTituloLocal(v);
                      if (tituloTimer.current) clearTimeout(tituloTimer.current);
                      tituloTimer.current = setTimeout(() => {
                        updateDemanda(demanda.id, { titulo: v.trim() || "Sem título" });
                      }, 500);
                    }}
                    onBlur={() => {
                      if (tituloTimer.current) {
                        clearTimeout(tituloTimer.current);
                        tituloTimer.current = null;
                      }
                      const novo = tituloLocal.trim() || "Sem título";
                      if (novo !== demanda.titulo) {
                        updateDemanda(demanda.id, { titulo: novo });
                      }
                    }}
                    placeholder="Ex: Criar landing page para campanha de inverno"
                    className="text-sm font-bold border-0 px-0 focus-visible:ring-0 h-auto"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {cliente?.nome_cliente ?? "—"} ·{" "}
                    {CATEGORIA_LABEL[demanda.categoria]}
                    {demanda.subtipo && ` · ${demanda.subtipo}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isUrgente ? "default" : "outline"}
                    size="sm"
                    disabled={!canWrite}
                    onClick={() => {
                      const next = isUrgente ? "Media" : "Urgente";
                      updateDemanda(demanda.id, { prioridade: next as any });
                      toast.success(
                        next === "Urgente"
                          ? "Demanda marcada como urgente"
                          : "Urgência removida"
                      );
                    }}
                    className={cn(
                      "gap-1.5",
                      isUrgente &&
                        "bg-amber-500 hover:bg-amber-500/90 text-white border-amber-500"
                    )}
                    title={isUrgente ? "Remover urgência" : "Marcar como urgente"}
                  >
                    <Zap
                      className={cn("h-4 w-4", isUrgente && "fill-current")}
                    />
                    Urgente
                  </Button>
                  <Select
                    value={demanda.status}
                    onValueChange={(v) =>
                      updateDemanda(demanda.id, { status: v as any })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_DEMANDA.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ background: STATUS_DEMANDA_COR[s] }}
                            />
                            {STATUS_DEMANDA_LABEL[s]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive shrink-0"
                          title="Excluir demanda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir demanda?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Comentários, anexos
                            e histórico serão removidos.
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
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 px-3 pb-2.5">

              {/* Categoria · Subtipo · Prioridade */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px]">Categoria</Label>
                  <Select
                    value={demanda.categoria}
                    onValueChange={(v) =>
                      updateDemanda(demanda.id, {
                        categoria: v as DemandaCategoria,
                        // Limpa subtipo se a categoria mudou
                        subtipo: v === demanda.categoria ? demanda.subtipo : null,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CATEGORIA_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px]">Subtipo</Label>
                  {demanda.categoria === "Personalizado" ? (
                    <Input
                      value={demanda.subtipo ?? ""}
                      onChange={(e) =>
                        updateDemanda(demanda.id, { subtipo: e.target.value || null })
                      }
                      placeholder="Descreva"
                      className="h-8 text-xs"
                    />
                  ) : (
                    <Select
                      value={demanda.subtipo ?? "__none__"}
                      onValueChange={(v) =>
                        updateDemanda(demanda.id, {
                          subtipo: v === "__none__" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Não definido —</SelectItem>
                        {(CATEGORIA_SUBTIPOS[demanda.categoria] ?? []).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label className="text-[11px]">Prioridade</Label>
                  <Select
                    value={demanda.prioridade}
                    onValueChange={(v) =>
                      updateDemanda(demanda.id, { prioridade: v as any })
                    }
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

              {/* Datas + Responsável */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Data início</Label>
                  <Input
                    type="datetime-local"
                    className="h-8 text-xs"
                    value={
                      demanda.data_inicio ? demanda.data_inicio.slice(0, 16) : ""
                    }
                    onChange={(e) =>
                      updateDemanda(demanda.id, {
                        data_inicio: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Data limite</Label>
                  <Input
                    type="datetime-local"
                    className="h-8 text-xs"
                    value={
                      demanda.data_limite ? demanda.data_limite.slice(0, 16) : ""
                    }
                    onChange={(e) =>
                      updateDemanda(demanda.id, {
                        data_limite: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      })
                    }
                  />
                </div>

                {/* Responsáveis (multi) */}
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
                            const ids = getResponsaveisIds(demanda);
                            const lista = responsaveis.filter((x) => ids.includes(x.id));
                            return lista.length > 0 ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                {lista.map((r) => (
                                  <div key={r.id} className="flex items-center gap-1.5">
                                    <div
                                      className="h-7 w-7 rounded-full text-white text-[11px] font-semibold flex items-center justify-center"
                                      style={{ backgroundColor: r.cor }}
                                    >
                                      {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                                    </div>
                                    <span className="text-sm">{r.nome}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                + atribuir responsáveis
                              </span>
                            );
                          })()}
                          <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="start">
                        <div className="text-[11px] text-muted-foreground px-2 pb-1.5">
                          Responsáveis
                        </div>
                        <div className="max-h-60 overflow-auto space-y-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateDemanda(demanda.id, { responsaveis_ids: [] })
                            }
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm text-muted-foreground"
                          >
                            <X className="h-3.5 w-3.5" /> Limpar todos
                          </button>
                          {responsaveis.map((r) => {
                            const ids = getResponsaveisIds(demanda);
                            const active = ids.includes(r.id);
                            return (
                              <button
                                type="button"
                                key={r.id}
                                onClick={() => {
                                  const next = active
                                    ? ids.filter((x) => x !== r.id)
                                    : [...ids, r.id];
                                  updateDemanda(demanda.id, { responsaveis_ids: next });
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-left text-sm",
                                  active && "bg-accent"
                                )}
                              >
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
                            <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                              Nenhum responsável cadastrado
                            </div>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Anexos */}
              <div className="border-t pt-2.5">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Anexos</Label>
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
                <div className="flex flex-wrap gap-2">
                  {meusAnexos.map((a) => {
                    const img = isImageUrl(a.url, a.nome);
                    return (
                      <div
                        key={a.id}
                        className="group relative h-[72px] w-[72px] border rounded-lg overflow-hidden bg-muted/30"
                      >
                        {img ? (
                          <button
                            type="button"
                            onClick={() => setPreviewAnexo({ url: a.url, nome: a.nome })}
                            className="block w-full h-full"
                            title={a.nome}
                          >
                            <img
                              src={a.url}
                              alt={a.nome}
                              className="w-full h-full object-cover"
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
                            <span className="text-[9px] mt-0.5 truncate w-full leading-tight">
                              {a.nome}
                            </span>
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
                    className="flex flex-col items-center justify-center h-[72px] w-[72px] border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Adicionar anexo"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[9px] mt-0.5">Anexar</span>
                  </button>
                </div>
              </div>

              {/* Atividade / Briefing */}
              <div className="border-t pt-2.5">
                <Label className="text-xs">Atividade / Briefing</Label>
                <Textarea
                  rows={3}
                  placeholder="Detalhes internos da demanda: contexto, requisitos, referências..."
                  value={descricaoLocal}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDescricaoLocal(v);
                    if (descricaoTimer.current) clearTimeout(descricaoTimer.current);
                    descricaoTimer.current = setTimeout(() => {
                      updateDemanda(demanda.id, { descricao: v });
                    }, 600);
                  }}
                  onBlur={() => {
                    if (descricaoTimer.current) {
                      clearTimeout(descricaoTimer.current);
                      descricaoTimer.current = null;
                    }
                    if ((demanda.descricao ?? "") !== descricaoLocal) {
                      updateDemanda(demanda.id, { descricao: descricaoLocal });
                    }
                  }}
                  className="mt-1 min-h-[70px] text-sm"
                />
              </div>
            </CardContent>
          </Card>

        {/* CARD 2 — Atividade (comentários) */}
        <Card className="flex flex-col min-h-0 overflow-hidden">
          <CardHeader className="pb-1.5 pt-2.5 px-3">
            <CardTitle className="text-sm">Atividade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-3 pb-3">
            <div className="space-y-2">
              {meusComentarios.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Sem comentários ainda
                </div>
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
                      {c.texto && <RichTextView content={c.texto} />}
                      {c.imagem_url && (
                        <a
                          href={c.imagem_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block mt-2"
                        >
                          <img
                            src={c.imagem_url}
                            alt="anexo"
                            className="max-h-48 rounded-md border"
                          />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Composer */}
            {canWrite && (
              <div className="border rounded-lg overflow-hidden">
                <RichTextEditor
                  value={novoComentario}
                  onChange={setNovoComentario}
                  placeholder="Escreva um comentário..."
                  onEnterSubmit={enviar}
                  minHeight="60px"
                />
                {composerImg && (
                  <div className="px-3 py-2 border-t bg-muted/30 flex items-center gap-2">
                    <img
                      src={composerImg}
                      alt="preview"
                      className="h-12 w-12 rounded object-cover border"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setComposerImg(null)}
                    >
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
                      title="Anexar"
                      onClick={() => composerFileRef.current?.click()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Imagem"
                      onClick={() => composerFileRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Emoji"
                      disabled
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Mencionar"
                      disabled
                    >
                      <AtSign className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">
                      Enter envia · Shift+Enter quebra
                    </span>
                    <Button
                      size="sm"
                      onClick={enviar}
                      disabled={
                        !novoComentario.replace(/<p><\/p>/g, "").trim() &&
                        !composerImg
                      }
                      className="gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Histórico (colapsável discreto) */}
            {meuHistorico.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-1">
                  Ver histórico ({meuHistorico.length})
                </summary>
                <ul className="space-y-1.5 mt-2">
                  {meuHistorico.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between border rounded p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-muted">
                          {h.acao}
                        </span>
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
              </details>
            )}
          </CardContent>
        </Card>
        </fieldset>
      </DialogContent>

      {/* Lightbox de imagem do anexo */}
      <Dialog open={!!previewAnexo} onOpenChange={(o) => !o && setPreviewAnexo(null)}>
        <DialogContent className="max-w-5xl p-2 bg-background">
          {previewAnexo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="text-sm font-medium truncate">{previewAnexo.nome}</span>
                <div className="flex items-center gap-1">
                  <a
                    href={previewAnexo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline px-2"
                  >
                    Abrir em nova aba
                  </a>
                  <a
                    href={previewAnexo.url}
                    download={previewAnexo.nome}
                    className="text-xs text-primary hover:underline px-2"
                  >
                    Baixar
                  </a>
                </div>
              </div>
              <div className="flex items-center justify-center bg-muted/30 rounded">
                <img
                  src={previewAnexo.url}
                  alt={previewAnexo.nome}
                  className="max-h-[80vh] max-w-full object-contain"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de remoção de anexo */}
      <AlertDialog
        open={!!anexoParaRemover}
        onOpenChange={(o) => !o && setAnexoParaRemover(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover anexo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido deste card.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (anexoParaRemover) {
                  await removeAnexo(anexoParaRemover);
                  setAnexoParaRemover(null);
                }
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
