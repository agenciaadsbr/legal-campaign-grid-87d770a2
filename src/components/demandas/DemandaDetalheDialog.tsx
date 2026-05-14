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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Demanda, useDemandas, getResponsaveisIds } from "@/store/demandas";
import { isAguardandoDependencia, getDemandasPais } from "@/lib/workflow";
import { WorkflowSection } from "./WorkflowSection";
import { EtapasRelacionadas } from "./EtapasRelacionadas";
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
  Link2,
  Copy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { categoriaParaAba } from "@/lib/minhasTarefas";
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
import { TarefaIAConsulta } from "./TarefaIAConsulta";
import { VoltarVisaoGeralButton } from "@/components/projeto/VoltarVisaoGeralButton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
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

const isVideoUrl = (url: string, nome?: string) => {
  if (url.startsWith("data:video")) return true;
  const n = (nome || url).toLowerCase();
  return /\.(mp4|webm|mov|mkv|m4v|avi|ogv)(\?|$)/.test(n);
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

/** Extrai o path dentro do bucket "anexos" a partir de uma URL pública do Storage. */
const extractAnexoStoragePath = (url: string): string | null => {
  const marker = "/storage/v1/object/public/anexos/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
  } catch {
    return url.slice(idx + marker.length).split("?")[0];
  }
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
    duplicarDemanda,
    comentarios,
    historico,
    anexos,
    demandas,
    dependencies,
  } = useDemandas();

  const isAguardando = demandaProp ? isAguardandoDependencia(demandaProp.id, dependencies) : false;

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
  const [duplicarOpen, setDuplicarOpen] = useState(false);
  const [dupCopiarAnexos, setDupCopiarAnexos] = useState(true);
  const [dupCopiarWorkflow, setDupCopiarWorkflow] = useState(true);
  const [duplicando, setDuplicando] = useState(false);
  const [descricaoLocal, setDescricaoLocal] = useState("");
  const descricaoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tituloLocal, setTituloLocal] = useState("");
  const tituloTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tituloInputRef = useRef<HTMLInputElement>(null);
  const [linkMeisterLocal, setLinkMeisterLocal] = useState("");
  const [linkDriveLocal, setLinkDriveLocal] = useState("");
  const linkMeisterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkDriveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const CATEGORIAS_COM_LINKS: DemandaCategoria[] = [
    "EditorVideo",
    "TrafegoPago",
    "LandingPage",
    "IAAtendimento",
    "Personalizado",
  ];

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

  const imagensAnexadas = useMemo(
    () => meusAnexos.filter((a) => isImageUrl(a.url, a.nome)),
    [meusAnexos]
  );

  const currentImageIndex = useMemo(() => {
    if (!previewAnexo) return -1;
    return imagensAnexadas.findIndex((img) => img.url === previewAnexo.url);
  }, [previewAnexo, imagensAnexadas]);

  const navigateImage = (direction: "prev" | "next") => {
    if (currentImageIndex === -1 || imagensAnexadas.length === 0) return;

    let newIndex = currentImageIndex;
    if (direction === "next") {
      newIndex = (currentImageIndex + 1) % imagensAnexadas.length;
    } else {
      newIndex = (currentImageIndex - 1 + imagensAnexadas.length) % imagensAnexadas.length;
    }

    const nextImg = imagensAnexadas[newIndex];
    if (nextImg) {
      setPreviewAnexo({ url: nextImg.url, nome: nextImg.nome });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewAnexo) return;
      if (e.key === "ArrowRight") {
        navigateImage("next");
      } else if (e.key === "ArrowLeft") {
        navigateImage("prev");
      } else if (e.key === "Escape") {
        setPreviewAnexo(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewAnexo, currentImageIndex, imagensAnexadas]);

  // Sincroniza descricaoLocal/tituloLocal quando muda de demanda (por id) ou
  // quando os valores chegam/atualizam externamente sem haver edição em curso.
  useEffect(() => {
    if (demanda) {
      setDescricaoLocal(demanda.descricao ?? "");
      const t = demanda.titulo === "Sem título" ? "" : demanda.titulo;
      setTituloLocal(t);
      setLinkMeisterLocal(demanda.link_meister ?? "");
      setLinkDriveLocal(demanda.link_drive ?? "");
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
      if (linkMeisterTimer.current) clearTimeout(linkMeisterTimer.current);
      if (linkDriveTimer.current) clearTimeout(linkDriveTimer.current);
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
  const aguardando = isAguardandoDependencia(demanda.id, dependencies);
  const paisAguardando = aguardando
    ? getDemandasPais(demanda.id, dependencies, demandas).filter((p) => {
        const dep = dependencies.find(
          (d) => d.task_id === demanda.id && d.depends_on_task_id === p.id,
        );
        return dep && !dep.liberado;
      })
    : [];
  const tituloPaiAguardando = paisAguardando[0]?.titulo;

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

  const MAX_ANEXO_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
  const formatBytes = (b: number) => {
    if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`;
    if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
    if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${b} B`;
  };

  const adicionarAnexo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    let okCount = 0;
    const toastId = toast.loading(
      files.length === 1 ? "Enviando anexo..." : `Enviando ${files.length} anexos...`
    );
    try {
      for (const f of files) {
        if (f.size > MAX_ANEXO_BYTES) {
          toast.error(`"${f.name}" é muito grande`, {
            description: `Tamanho ${formatBytes(f.size)} excede o limite de 5 GB por arquivo.`,
          });
          continue;
        }
        const safeName = sanitizeFileName(f.name);
        const path = `demandas/${demanda.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("anexos")
          .upload(path, f, {
            contentType: f.type || undefined,
            upsert: false,
            cacheControl: "3600",
          });
        if (upErr) {
          console.error("[anexos] upload erro", upErr);
          const msg = (upErr.message || "").toLowerCase();
          const isSize =
            msg.includes("exceeded the maximum allowed size") ||
            msg.includes("payload too large") ||
            msg.includes("maximum allowed size");
          toast.error(`Falha ao enviar "${f.name}"`, {
            description: isSize
              ? `Arquivo de ${formatBytes(f.size)} excede o limite do servidor. Se o problema continuar, faça upgrade do plano Supabase para liberar uploads maiores.`
              : upErr.message,
          });
          continue;
        }
        const { data: pub } = supabase.storage.from("anexos").getPublicUrl(path);
        await addAnexo({
          demanda_id: demanda.id,
          nome: f.name,
          url: pub.publicUrl,
          mime: f.type || null,
          size: f.size,
        });
        okCount += 1;
      }
      if (okCount > 0) {
        toast.success(`${okCount} anexo(s) adicionado(s)`, { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch (err) {
      console.error(err);
      toast.error("Falha ao adicionar anexo", { id: toastId });
    }
    e.target.value = "";
  };

  const copiarLink = async () => {
    // Preview do Lovable (id-preview--*.lovable.app) exige login na plataforma.
    // Quando o link é copiado a partir do preview, trocamos pelo domínio
    // publicado (público) para que qualquer pessoa abra sem login Lovable.
    const PUBLISHED_ORIGIN = "https://legal-campaign-grid.lovable.app";
    const isLovablePreview = /id-preview--.*\.lovable\.app$/.test(window.location.hostname);
    const origin = isLovablePreview ? PUBLISHED_ORIGIN : window.location.origin;
    const url = `${origin}/clientes/${demanda!.cliente_id}/projeto?tab=${categoriaParaAba(demanda!.categoria)}&demanda=${demanda!.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Link da tarefa copiado");
    } catch {
      toast.error("Falha ao copiar link");
    }
  };

  return (
    <Dialog open={!!demanda} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl w-[92vw] max-h-[90vh] overflow-hidden p-3 gap-2 flex flex-col">
        <fieldset disabled={!canWrite || isAguardando} className="contents">
          {/* Voltar para Visão Geral */}
          <div className="shrink-0">
            <VoltarVisaoGeralButton onClick={() => handleOpenChange(false)} />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2">
          {isAguardando && (
            <div className="shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 flex items-start gap-2 text-xs">
              <span className="mt-0.5">🔒</span>
              <div className="flex-1">
                <div className="font-semibold">Aguardando etapa anterior</div>
                <div className="text-muted-foreground">
                  Esta tarefa só pode ser iniciada/concluída após:{" "}
                  <span className="font-medium text-foreground">
                    {tituloPaiAguardando ?? "tarefa anterior"}
                  </span>
                  . Você ainda pode editar descrição, anexos, comentários e responsáveis.
                </div>
              </div>
            </div>
          )}
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
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <Select
                      value={demanda.cliente_id}
                      onValueChange={(v) => updateDemanda(demanda.id, { cliente_id: v } as any)}
                      disabled={!canWrite}
                    >
                      <SelectTrigger className="h-7 text-xs w-auto min-w-[160px] max-w-[260px] gap-1">
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.nome_cliente}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">·</span>
                    <Select
                      value={demanda.categoria}
                      onValueChange={(v) =>
                        updateDemanda(demanda.id, {
                          categoria: v as DemandaCategoria,
                          subtipo: v === demanda.categoria ? demanda.subtipo : null,
                        })
                      }
                      disabled={!canWrite}
                    >
                      <SelectTrigger className="h-7 text-xs w-auto min-w-[140px] gap-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {CATEGORIA_LABEL[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {demanda.subtipo && (
                      <span className="text-xs text-muted-foreground">· {demanda.subtipo}</span>
                    )}
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
                    disabled={aguardando}
                    onValueChange={(v) => {
                      if (aguardando) {
                        toast.error("Tarefa bloqueada", {
                          description: tituloPaiAguardando
                            ? `Aguardando conclusão de: ${tituloPaiAguardando}`
                            : "Esta tarefa depende de outra etapa.",
                        });
                        return;
                      }
                      updateDemanda(demanda.id, { status: v as any });
                    }}
                  >
                    <SelectTrigger
                      className="w-40"
                      title={aguardando ? `Aguardando: ${tituloPaiAguardando}` : undefined}
                    >
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
                  {canWrite && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setDuplicarOpen(true)}
                      title="Duplicar tarefa"
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  {(demanda as any).origem === "template_operacional" &&
                    !(demanda as any).marcado_ja_possui &&
                    demanda.status !== "Concluido" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1"
                        title="Marcar como já existente no cliente"
                        onClick={async () => {
                          const obs = "Marcado como já existente pelo cliente";
                          const novaDescricao = demanda.descricao
                            ? `${demanda.descricao}\n\n— ${obs}`
                            : `— ${obs}`;
                          await updateDemanda(demanda.id, {
                            status: "Concluido",
                            data_conclusao: new Date().toISOString(),
                            descricao: novaDescricao,
                            ...({ marcado_ja_possui: true } as any),
                          });
                          toast.success("Marcado como já existente");
                        }}
                      >
                        ✔ Cliente já possui
                      </Button>
                    )}
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
                                      className="h-6 w-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center"
                                      style={{ backgroundColor: r.cor }}
                                    >
                                      {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                                    </div>
                                    <span className="text-xs">{r.nome}</span>
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
                            <img
                              src={a.url}
                              alt={a.nome}
                              className="w-full h-full object-cover"
                            />
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
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="h-6 w-6 rounded-full bg-background/80 border border-border flex items-center justify-center">
                                <span className="block w-0 h-0 border-y-[5px] border-y-transparent border-l-[7px] border-l-foreground ml-[2px]" />
                              </span>
                            </span>
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
                    className="flex flex-col items-center justify-center h-16 w-16 border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    title="Adicionar anexo"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-[9px] mt-0.5">Anexar</span>
                  </button>
                </div>
              </div>

              {/* Links Meister / Drive (apenas categorias específicas) */}
              {CATEGORIAS_COM_LINKS.includes(demanda.categoria) && (
                <div className="border-t pt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {([
                    {
                      key: "link_meister" as const,
                      label: "Link do Meister",
                      value: linkMeisterLocal,
                      setValue: setLinkMeisterLocal,
                      timer: linkMeisterTimer,
                      original: demanda.link_meister ?? "",
                    },
                    {
                      key: "link_drive" as const,
                      label: "Link do Drive",
                      value: linkDriveLocal,
                      setValue: setLinkDriveLocal,
                      timer: linkDriveTimer,
                      original: demanda.link_drive ?? "",
                    },
                  ]).map((field) => (
                    <div key={field.key}>
                      <Label className="text-[11px]">{field.label}</Label>
                      <div className="flex items-center gap-1 mt-1">
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={field.value}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.setValue(v);
                            if (field.timer.current) clearTimeout(field.timer.current);
                            field.timer.current = setTimeout(() => {
                              updateDemanda(demanda.id, { [field.key]: v.trim() || null } as any);
                            }, 600);
                          }}
                          onBlur={() => {
                            if (field.timer.current) {
                              clearTimeout(field.timer.current);
                              field.timer.current = null;
                            }
                            if (field.original !== field.value) {
                              updateDemanda(demanda.id, {
                                [field.key]: field.value.trim() || null,
                              } as any);
                            }
                          }}
                          className="h-8 text-xs"
                        />
                        {field.value.trim().startsWith("http") && (
                          <a
                            href={field.value.trim()}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground p-1"
                            title={`Abrir ${field.label}`}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Atividade / Briefing */}
              <div className="border-t pt-2">
                <Label className="text-[11px]">Atividade / Briefing</Label>
                <Textarea
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
                  className="mt-1 h-32 max-h-32 min-h-0 resize-none overflow-y-auto text-xs"
                />
              </div>
            </CardContent>
          </Card>

        {/* CARD 2 — Atividade (comentários) */}
        <Card className="shrink-0 overflow-hidden">
          <CardHeader className="pb-1 pt-2 px-3 shrink-0">
            <CardTitle className="text-xs uppercase tracking-wide">Atividade</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col px-3 pb-3 gap-2">
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
              <div className="border rounded-lg overflow-hidden shrink-0">
                <RichTextEditor
                  value={novoComentario}
                  onChange={setNovoComentario}
                  placeholder="Escreva um comentário..."
                  onEnterSubmit={enviar}
                  minHeight="48px"
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
              <details className="text-xs shrink-0">
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

        <TarefaIAConsulta 
          demanda={demanda}
          comentarios_texto={meusComentarios.map(c => c.texto).join("\n")}
          onAddComment={(txt) => {
            if (user) addComentario(demanda.id, user.id, txt);
          }}
        />

        <EtapasRelacionadas demanda={demanda} />
        {canWrite && <WorkflowSection pai={demanda} />}
          </div>
        </fieldset>
      </DialogContent>

      {/* Lightbox de imagem do anexo */}
      <Dialog open={!!previewAnexo} onOpenChange={(o) => !o && setPreviewAnexo(null)}>
        <DialogContent className="max-w-5xl p-2 bg-background overflow-visible">
          {previewAnexo && (
            <div className="space-y-2 relative group/lightbox">
              <div className="flex items-center justify-between gap-3 px-2 pr-12 pt-1">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{previewAnexo.nome}</span>
                  {imagensAnexadas.length > 1 && currentImageIndex !== -1 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {currentImageIndex + 1} de {imagensAnexadas.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="shrink-0 text-xs text-primary hover:underline px-2"
                    onClick={async () => {
                      try {
                        const response = await fetch(previewAnexo.url);
                        if (!response.ok) throw new Error("download falhou");
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = blobUrl;
                        a.download = previewAnexo.nome;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(blobUrl);
                      } catch (err) {
                        console.error("[anexo] download erro", err);
                        toast.error("Falha ao baixar anexo");
                      }
                    }}
                  >
                    Baixar
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center bg-muted/30 rounded min-h-[40vh]">
                {/* Setas de Navegação - Desktop */}
                {imagensAnexadas.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateImage("prev");
                      }}
                      className="absolute left-1 md:left-2 z-10 h-8 w-8 md:h-10 md:w-10 rounded-full bg-background/80 border shadow-sm flex items-center justify-center hover:bg-background transition-all md:opacity-0 md:group-hover/lightbox:opacity-100"
                      title="Anterior (Seta Esquerda)"
                    >
                      <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateImage("next");
                      }}
                      className="absolute right-1 md:right-2 z-10 h-8 w-8 md:h-10 md:w-10 rounded-full bg-background/80 border shadow-sm flex items-center justify-center hover:bg-background transition-all md:opacity-0 md:group-hover/lightbox:opacity-100"
                      title="Próxima (Seta Direita)"
                    >
                      <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                  </>
                )}

                {isVideoUrl(previewAnexo.url, previewAnexo.nome) ? (
                  <video
                    src={previewAnexo.url}
                    controls
                    autoPlay
                    className="max-h-[80vh] max-w-full"
                  />
                ) : (
                  <img
                    src={previewAnexo.url}
                    alt={previewAnexo.nome}
                    className="max-h-[80vh] max-w-full object-contain"
                  />
                )}
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

      {/* Confirmação de duplicação de tarefa */}
      <AlertDialog open={duplicarOpen} onOpenChange={setDuplicarOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Será criada uma cópia desta tarefa com status reiniciado em "Planejamento".
              Comentários e histórico não são copiados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={dupCopiarAnexos}
                onCheckedChange={(v) => setDupCopiarAnexos(!!v)}
              />
              Copiar anexos
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={dupCopiarWorkflow}
                onCheckedChange={(v) => setDupCopiarWorkflow(!!v)}
              />
              Manter no mesmo workflow (replicar dependências pai)
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={duplicando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={duplicando}
              onClick={async (e) => {
                e.preventDefault();
                setDuplicando(true);
                try {
                  await duplicarDemanda(demanda.id, {
                    copiar_anexos: dupCopiarAnexos,
                    copiar_workflow: dupCopiarWorkflow,
                  });
                  setDuplicarOpen(false);
                } finally {
                  setDuplicando(false);
                }
              }}
            >
              {duplicando ? "Duplicando..." : "Duplicar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
