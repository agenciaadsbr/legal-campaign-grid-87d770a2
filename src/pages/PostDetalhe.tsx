import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useCRM, StatusCard } from "@/store/crm";
import { Card, CardContent } from "@/components/ui/card";
import { TaskFormBase } from "@/components/tarefas/TaskFormBase";
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
import { VoltarVisaoGeralButton } from "@/components/projeto/VoltarVisaoGeralButton";

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { posts, cards, comentarios, responsaveis, updatePost, updateCard, addComentario, updateComentario, deleteComentario, deleteCard, statusPostOptions } = useCRM();
  const { canWrite, isAdmin } = useAuth();
  const post = posts.find((p) => p.id === postId);
  const card = post && cards.find((c) => c.id === post.card_id);

  const [loading, setLoading] = useState(false);
  const taskFormRef = useRef<{ handleSubmit: () => Promise<void> } | null>(null);

  const handleSubmit = async () => {
    if (taskFormRef.current) {
      setLoading(true);
      await taskFormRef.current.handleSubmit();
      setLoading(false);
    }
  };

  // Foco automático no título quando vindo da criação/iniciar via ?focus=titulo
  useEffect(() => {
    if (searchParams.get("focus") === "titulo" && tituloInputRef.current) {
      tituloInputRef.current.focus();
      tituloInputRef.current.select();
      // limpa o param para não refocar a cada render
      const next = new URLSearchParams(searchParams);
      next.delete("focus");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, post?.id]);

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

  const copiarLink = async () => {
    const PUBLISHED_ORIGIN = "https://legal-campaign-grid.lovable.app";
    const isLovablePreview = /id-preview--.*\.lovable\.app$/.test(window.location.hostname);
    const origin = isLovablePreview ? PUBLISHED_ORIGIN : window.location.origin;
    const url = `${origin}/clientes/${card.cliente_id}/posts/${post.id}`;
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

  const excluirTarefa = async () => {
    const cidLocal = card.cliente_id;
    await deleteCard(card.id);
    navigate(`/clientes/${cidLocal}?tab=posts`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-3 animate-fade-in">
      <VoltarVisaoGeralButton onClick={voltarParaVisaoGeral} />
      
      <Card>
        <CardContent className="p-6">
          <TaskFormBase 
            initialPostId={postId}
            onSuccess={() => toast.success("Post atualizado")}
            onCancel={voltarParaVisaoGeral}
            standalone={false}
          />
          
          <div className="mt-6 pt-6 border-t">
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="w-full md:w-auto"
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
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
